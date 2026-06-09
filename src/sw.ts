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

// Clic sur le rappel → ouvre/active l'app sur la prochaine carte (cf. spec §10.7.3).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path: string =
    (event.notification.data && (event.notification.data as { path?: string }).path) || "/";

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
