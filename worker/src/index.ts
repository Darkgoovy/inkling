import { buildPushPayload } from "@block65/webcrypto-web-push";

// Worker Cloudflare : abonnements Web Push + envoi des rappels (Cron). Cf. spec §10.7.4.
//
// Stockage : UNE seule clé KV ("subs") contenant une map { clientId: SubRecord }.
// → le cron fait 1 `get` par minute (aucune opération `list`), et n'écrit que
//   lorsqu'un envoi a réellement lieu. On reste très largement sous le gratuit
//   (Workers : 100k req/j ; KV : 100k lectures, 1k écritures, 1k list /j).

export interface Env {
  SUBS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string; // secret
  VAPID_SUBJECT: string; // secret (mailto:)
  ALLOW_ORIGIN: string;
}

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

interface SubRecord {
  subscription: PushSubscriptionJSON;
  time: string; // "HH:MM" (heure locale de l'utilisateur)
  days: number[]; // getDay() : 0=dim … 6=sam
  tzOffsetMin: number; // Date.getTimezoneOffset() de l'utilisateur
  skipIfDone: boolean;
  goalMetDate: string | null; // "YYYY-MM-DD"
  next: { title: string; body: string; path: string };
  lastSentDate?: string | null;
}

type SubMap = Record<string, SubRecord>;

const STORE_KEY = "subs";
const SEND_WINDOW_MIN = 5; // tolérance autour de l'heure (cron chaque minute + anti-jitter)

function cors(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, env: Env, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

async function readMap(env: Env): Promise<SubMap> {
  return ((await env.SUBS.get(STORE_KEY, "json")) as SubMap | null) ?? {};
}

async function writeMap(env: Env, map: SubMap): Promise<void> {
  await env.SUBS.put(STORE_KEY, JSON.stringify(map));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/subscribe") {
      const body = (await request.json().catch(() => null)) as
        | (Partial<SubRecord> & { clientId?: string })
        | null;
      if (!body?.clientId || !body.subscription?.endpoint) {
        return json({ error: "payload invalide" }, env, 400);
      }
      const map = await readMap(env);
      map[body.clientId] = {
        subscription: body.subscription as PushSubscriptionJSON,
        time: body.time ?? "08:00",
        days: Array.isArray(body.days) ? body.days : [0, 1, 2, 3, 4, 5, 6],
        tzOffsetMin: typeof body.tzOffsetMin === "number" ? body.tzOffsetMin : 0,
        skipIfDone: body.skipIfDone ?? true,
        goalMetDate: body.goalMetDate ?? null,
        next: body.next ?? {
          title: "Votre carte du jour vous attend 📖",
          body: "Reprenez votre lecture du jour.",
          path: "/",
        },
        lastSentDate: map[body.clientId]?.lastSentDate ?? null,
      };
      await writeMap(env, map);
      return json({ ok: true }, env);
    }

    if (request.method === "POST" && url.pathname === "/unsubscribe") {
      const body = (await request.json().catch(() => null)) as { clientId?: string } | null;
      if (body?.clientId) {
        const map = await readMap(env);
        if (map[body.clientId]) {
          delete map[body.clientId];
          await writeMap(env, map);
        }
      }
      return json({ ok: true }, env);
    }

    return json({ error: "not found" }, env, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const map = await readMap(env);
    const now = Date.now();
    let changed = false;

    for (const [clientId, rec] of Object.entries(map)) {
      const { day, minutes, dateStr } = userLocalNow(now, rec.tzOffsetMin);
      if (!rec.days.includes(day)) continue;

      const [h, m] = rec.time.split(":").map(Number);
      const target = (h || 0) * 60 + (m || 0);
      if (minutes < target || minutes >= target + SEND_WINDOW_MIN) continue;

      if (rec.lastSentDate === dateStr) continue; // déjà envoyé aujourd'hui
      if (rec.skipIfDone && rec.goalMetDate === dateStr) continue; // objectif déjà atteint

      const result = await sendPush(rec, env);
      if (result === "gone") {
        delete map[clientId];
        changed = true;
      } else if (result === "ok") {
        rec.lastSentDate = dateStr;
        changed = true;
      }
    }

    if (changed) await writeMap(env, map);
  },
};

/** Heure locale de l'utilisateur (jour de semaine, minutes depuis minuit, date). */
function userLocalNow(nowUtcMs: number, tzOffsetMin: number) {
  const local = new Date(nowUtcMs - tzOffsetMin * 60_000);
  const day = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const dateStr = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  return { day, minutes, dateStr };
}

async function sendPush(rec: SubRecord, env: Env): Promise<"ok" | "gone" | "error"> {
  try {
    const payload = await buildPushPayload(
      { data: rec.next, options: { ttl: 3600 } },
      rec.subscription,
      { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
    );
    const res = await fetch(rec.subscription.endpoint, payload);
    if (res.status === 404 || res.status === 410) return "gone";
    return res.ok ? "ok" : "error";
  } catch (err) {
    console.error("sendPush error", err);
    return "error";
  }
}
