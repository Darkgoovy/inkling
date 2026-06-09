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
      // Service worker personnalisé (src/sw.ts) : précache + clic sur notification (§10.7).
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
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
      injectManifest: {
        // Précache l'app ET le contenu des livres → tout fonctionne hors ligne.
        globPatterns: ["**/*.{js,css,html,svg,json,woff,woff2}"],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ],
});
