import { buildPushPayload } from "@block65/webcrypto-web-push";

// Worker Cloudflare : stockage des abonnements (KV) + envoi des rappels Web Push (Cron).
// Cf. spec §10.7.4. Déploiement : voir worker/README.md.

export interface Env {
  SUBS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string; // secret
  VAPID_SUBJECT: string; // ex. "mailto:toi@exemple.com"
  ALLOW_ORIGIN: string; // ex. "https://darkgoovy.github.io"
}

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

interface SubRecord {
  clientId: string;
  subscription: PushSubscriptionJSON;
  time: string; // "HH:MM" (heure locale de l'utilisateur)
  days: number[]; // getDay() : 0=dim … 6=sam
  tzOffsetMin: number; // Date.getTimezoneOffset() de l'utilisateur
  skipIfDone: boolean;
  goalMetDate: string | null; // "YYYY-MM-DD" (jour où l'objectif a été atteint)
  next: { title: string; body: string; path: string };
  lastSentDate?: string | null;
}

const KEY_PREFIX = "sub:";
const SEND_WINDOW_MIN = 10; // tolérance autour de l'heure (cron toutes les 5 min)

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/subscribe") {
      const body = (await request.json().catch(() => null)) as Partial<SubRecord> | null;
      if (!body?.clientId || !body.subscription?.endpoint) {
        return json({ error: "payload invalide" }, env, 400);
      }
      const record: SubRecord = {
        clientId: body.clientId,
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
        lastSentDate: null,
      };
      await env.SUBS.put(KEY_PREFIX + body.clientId, JSON.stringify(record));
      return json({ ok: true }, env);
    }

    if (request.method === "POST" && url.pathname === "/unsubscribe") {
      const body = (await request.json().catch(() => null)) as { clientId?: string } | null;
      if (body?.clientId) await env.SUBS.delete(KEY_PREFIX + body.clientId);
      return json({ ok: true }, env);
    }

    return json({ error: "not found" }, env, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const now = Date.now();
    let cursor: string | undefined;

    do {
      const list = await env.SUBS.list({ prefix: KEY_PREFIX, cursor });
      cursor = list.list_complete ? undefined : list.cursor;

      for (const { name } of list.keys) {
        const raw = await env.SUBS.get(name);
        if (!raw) continue;
        const rec = JSON.parse(raw) as SubRecord;

        const { day, minutes, dateStr } = userLocalNow(now, rec.tzOffsetMin);
        if (!rec.days.includes(day)) continue;

        const [h, m] = rec.time.split(":").map(Number);
        const target = (h || 0) * 60 + (m || 0);
        if (minutes < target || minutes >= target + SEND_WINDOW_MIN) continue;

        if (rec.lastSentDate === dateStr) continue; // déjà envoyé aujourd'hui
        if (rec.skipIfDone && rec.goalMetDate === dateStr) continue; // objectif déjà atteint

        const sent = await sendPush(rec, env);
        if (sent === "gone") {
          await env.SUBS.delete(name);
        } else if (sent === "ok") {
          rec.lastSentDate = dateStr;
          await env.SUBS.put(name, JSON.stringify(rec));
        }
      }
    } while (cursor);
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
