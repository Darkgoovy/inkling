import type { GameState } from "../types";
import { loadBook, loadBooksIndex } from "./books";
import { firstUnreadIndex } from "./selectors";
import { todayKey } from "./gamification";
import { PUSH_API, VAPID_PUBLIC_KEY, pushConfigured } from "../pushConfig";

// Module dédié au rappel quotidien (cf. spec §10.7).
// Stratégie : Web Push via le Worker Cloudflare si configuré + permission accordée ;
// sinon repli LOCAL « best-effort » (minuteur valable tant que l'app est ouverte).

const TAG = "inkling-daily";
const base = import.meta.env.BASE_URL;
const CLIENT_ID_KEY = "inkling.pushClientId";

let fallbackTimer: number | undefined;

export type PermissionState = NotificationPermission | "unsupported";

export function notificationPermission(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function clientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

// --- Calcul de l'échéance & contenu (partagés serveur/local) ---

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

export function nextOccurrence(
  time: string,
  days: number[],
  from: Date,
  skipToday: boolean,
): Date | null {
  if (!days || days.length === 0) return null;
  const { h, m } = parseTime(time);
  for (let offset = 0; offset <= 7; offset++) {
    const cand = new Date(from);
    cand.setDate(from.getDate() + offset);
    cand.setHours(h, m, 0, 0);
    if (offset === 0 && (skipToday || cand.getTime() <= from.getTime())) continue;
    if (days.includes(cand.getDay())) return cand;
  }
  return null;
}

function goalDoneToday(state: GameState, now: Date): boolean {
  return state.stats.todayDate === todayKey(now) && state.stats.todayCount >= state.settings.dailyGoal;
}

interface Content {
  title: string;
  body: string;
  path: string;
}

/** Contenu de la notification : prochaine carte + encouragement de série. */
async function buildContent(state: GameState): Promise<Content> {
  const streak = state.streak.count;
  const streakLine =
    streak > 0 ? ` 🔥 ${streak} jour${streak > 1 ? "s" : ""} d'affilée — garde le rythme !` : "";

  if (!state.lastBookId) {
    return {
      title: "Votre carte du jour vous attend 📖",
      body: "Choisissez un livre et lisez votre première carte." + streakLine,
      path: "/",
    };
  }
  try {
    const index = await loadBooksIndex();
    const entry = index.books.find((b) => b.id === state.lastBookId);
    if (!entry) throw new Error("livre introuvable");
    const book = await loadBook(entry.file);
    const next = book.cards[firstUnreadIndex(state, book)];
    const body = next
      ? `Suivant : « ${next.title} » — ${book.title}.${streakLine}`
      : `Reprenez « ${book.title} ».${streakLine}`;
    return { title: "Votre carte du jour vous attend 📖", body, path: `/read/${state.lastBookId}` };
  } catch {
    return {
      title: "Votre carte du jour vous attend 📖",
      body: "Reprenez votre lecture du jour." + streakLine,
      path: `/read/${state.lastBookId}`,
    };
  }
}

// --- Point d'entrée : (re)synchronise le rappel selon l'état courant ---

/**
 * Synchronise le rappel quotidien (cf. spec §10.7.4). Si désactivé : se désabonne.
 * Sinon, si le Web Push est configuré + autorisé : enregistre l'abonnement et les
 * réglages auprès du Worker. À défaut : repli sur un rappel local best-effort.
 */
export async function syncReminder(state: GameState): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  clearFallback();

  const r = state.settings.reminder;

  if (!r.enabled) {
    await cancelLocal();
    await unsubscribePush();
    return;
  }
  if (notificationPermission() !== "granted") return;

  if (pushConfigured()) {
    const ok = await subscribePush(state);
    if (ok) {
      await cancelLocal(); // le serveur prend le relais : pas de doublon local
      return;
    }
  }
  // Repli local (best-effort).
  await scheduleLocal(state);
}

// --- Web Push (serveur) ---

async function subscribePush(state: GameState): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
      }));

    const r = state.settings.reminder;
    const now = new Date();
    const content = await buildContent(state);
    const goalMetDate = goalDoneToday(state, now) ? todayKey(now) : null;

    const res = await fetch(`${PUSH_API}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clientId(),
        subscription: sub.toJSON(),
        time: r.time,
        days: r.days,
        tzOffsetMin: now.getTimezoneOffset(),
        skipIfDone: r.skipIfDone,
        goalMetDate,
        next: content,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn("[Inkling] Abonnement push impossible, repli local.", err);
    return false;
  }
}

async function unsubscribePush(): Promise<void> {
  try {
    if (pushConfigured()) {
      await fetch(`${PUSH_API}/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId() }),
      }).catch(() => {});
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* ignore */
  }
}

// --- Repli local ---

function clearFallback(): void {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = undefined;
  }
}

async function cancelLocal(): Promise<void> {
  clearFallback();
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications({ tag: TAG, includeTriggered: true } as never);
    notifs.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}

async function scheduleLocal(state: GameState): Promise<void> {
  await cancelLocal();
  const r = state.settings.reminder;
  const now = new Date();
  const skipToday = r.skipIfDone && goalDoneToday(state, now);
  const when = nextOccurrence(r.time, r.days, now, skipToday);
  if (!when) return;

  const { title, body, path } = await buildContent(state);
  const options = { body, tag: TAG, icon: `${base}icon.svg`, badge: `${base}icon.svg`, data: { path } };
  const reg = await navigator.serviceWorker.ready;
  const delay = when.getTime() - now.getTime();
  if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
    fallbackTimer = window.setTimeout(() => {
      reg.showNotification(title, options).catch(() => {});
    }, delay);
  }
}
