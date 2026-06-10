/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Précache de l'app + du contenu (offline), injecté au build par vite-plugin-pwa.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Polices Google : cache-first une fois récupérées.
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// Mise à jour immédiate (registerType: autoUpdate).
self.skipWaiting();
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Réception d'un Web Push → affiche la notification (cf. spec §10.7.4).
self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; path?: string } = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Votre carte du jour vous attend 📖";
  const options: NotificationOptions = {
    body: payload.body || "Reprenez votre lecture du jour.",
    tag: "inkling-daily",
    icon: "icon.svg",
    badge: "icon.svg",
    data: { path: payload.path || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur le rappel → ouvre/active l'app sur la prochaine carte (cf. spec §10.7.3).
// On vise toujours /resume : l'app y résout EN LOCAL le dernier livre consulté
// (évite tout chemin périmé venu du serveur).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = "/resume";

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsArr) {
        await client.focus();
        client.postMessage({ type: "inkling-navigate", path });
        return;
      }
      // Aucune fenêtre ouverte : on ouvre l'app directement sur la bonne route (hash router).
      await self.clients.openWindow(`${self.registration.scope}#${path}`);
    })(),
  );
});
