// Configuration du Web Push (cf. spec §10.7.4).
// Renseigne ces deux valeurs APRÈS avoir déployé le Worker Cloudflare (voir worker/README.md).
// Elles sont PUBLIQUES (sans risque dans le dépôt) : la clé VAPID *publique* et l'URL du Worker.
// Tant qu'elles sont vides, l'app retombe sur le rappel LOCAL (best-effort, app ouverte).

export const PUSH_API = ""; // ex. "https://inkling-push.ton-compte.workers.dev"
export const VAPID_PUBLIC_KEY = ""; // clé VAPID publique (base64url)

export function pushConfigured(): boolean {
  return PUSH_API.length > 0 && VAPID_PUBLIC_KEY.length > 0;
}
