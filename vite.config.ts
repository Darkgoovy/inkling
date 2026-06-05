import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// App web statique installable + hors ligne (cf. spec §11 : pistes pour plus tard).
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "maskable-icon.svg"],
      manifest: {
        name: "Inkling — Cartes de lecture",
        short_name: "Inkling",
        description:
          "Révisez vos livres par petites cartes de 10 minutes, avec progression et gamification.",
        lang: "fr",
        theme_color: "#FF7A59",
        background_color: "#FBEFE3",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Précache l'app ET le contenu des livres → tout fonctionne hors ligne.
        globPatterns: ["**/*.{js,css,html,svg,json,woff,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // Polices Google : cache-first une fois récupérées.
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Permet de tester le SW en dev.
        enabled: false,
      },
    }),
  ],
});
