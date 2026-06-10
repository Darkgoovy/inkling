// Configuration du Web Push (cf. spec §10.7.4).
// Renseigne ces deux valeurs APRÈS avoir déployé le Worker Cloudflare (voir worker/README.md).
// Elles sont PUBLIQUES (sans risque dans le dépôt) : la clé VAPID *publique* et l'URL du Worker.
// Tant qu'elles sont vides, l'app retombe sur le rappel LOCAL (best-effort, app ouverte).

export const PUSH_API = "https://inkling-push.bananasfrench.workers.dev";
export const VAPID_PUBLIC_KEY =
  "BIe6JO7eNeSetk_zoIU6LQGqfd45hwtyHFW3OJlxhQoPtndA2Si1ayPsd38lYXJ3ZXClka8dCcH0yKbBewsMoLs";

export function pushConfigured(): boolean {
  return PUSH_API.length > 0 && VAPID_PUBLIC_KEY.length > 0;
}
