import type { GameState } from "../types";
import { loadBook, loadBooksIndex } from "./books";
import { firstUnreadIndex } from "./selectors";
import { todayKey } from "./gamification";

// Module dédié au rappel quotidien local (cf. spec §10.7).
// Isolé pour pouvoir brancher un backend Web Push plus tard sans refonte.

const TAG = "inkling-daily";
const base = import.meta.env.BASE_URL;

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

/** Le déclenchement programmé (app fermée) n'existe que via Notification Triggers. */
function triggersSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "TimestampTrigger" in window;
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/**
 * Prochaine échéance (Date) correspondant à l'heure + un jour sélectionné.
 * `skipToday` saute la journée en cours (ex. objectif déjà atteint).
 */
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

/** Construit le contenu de la notification : prochaine carte + encouragement de série. */
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
    const idx = firstUnreadIndex(state, book);
    const next = book.cards[idx];
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

async function clearScheduled(): Promise<void> {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = undefined;
  }
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const notifs = await reg.getNotifications({ tag: TAG, includeTriggered: true } as never);
    notifs.forEach((n) => n.close());
  } catch {
    /* ignore */
  }
}

/**
 * (Re)programme le rappel quotidien d'après l'état courant. Annule d'abord toute
 * occurrence en attente. Ne fait rien si désactivé ou permission non accordée.
 */
export async function scheduleReminder(state: GameState): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  await clearScheduled();

  const r = state.settings.reminder;
  if (!r.enabled || notificationPermission() !== "granted") return;

  const now = new Date();
  const skipToday = r.skipIfDone && goalDoneToday(state, now);
  const when = nextOccurrence(r.time, r.days, now, skipToday);
  if (!when) return;

  const { title, body, path } = await buildContent(state);
  const options = {
    body,
    tag: TAG,
    icon: `${base}icon.svg`,
    badge: `${base}icon.svg`,
    data: { path },
  };

  const reg = await navigator.serviceWorker.ready;

  if (triggersSupported()) {
    // Déclenchement programmé, même app fermée (navigateurs Chromium).
    const TimestampTrigger = (window as unknown as { TimestampTrigger: new (t: number) => unknown })
      .TimestampTrigger;
    await reg.showNotification(title, {
      ...options,
      showTrigger: new TimestampTrigger(when.getTime()),
    } as NotificationOptions);
  } else {
    // Repli « best-effort » : minuteur en mémoire, valable tant que l'app est ouverte.
    const delay = when.getTime() - now.getTime();
    if (delay > 0 && delay <= 24 * 60 * 60 * 1000) {
      fallbackTimer = window.setTimeout(() => {
        reg.showNotification(title, options).catch(() => {});
      }, delay);
    }
  }
}
