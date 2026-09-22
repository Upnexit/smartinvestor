// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        manifest: {
          name: "Smart Click BD — লাইক কমেন্ট করে ইনকাম",
          short_name: "Smart Click BD",
          description: "ঘরে বসে লাইক ও কমেন্ট করে আয় করার বিশ্বস্ত বাংলাদেশী প্ল্যাটফর্ম।",
          theme_color: "#f59e0b",
          background_color: "#fffbeb",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          lang: "bn",
          icons: [
            { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Apply new SW immediately instead of waiting for every tab to close.
          skipWaiting: true,
          clientsClaim: true,
          // Delete Workbox precaches from previous deploys on activation.
          cleanupOutdatedCaches: true,
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/api\//, /^\/~oauth/],
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "assets",
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\//,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
