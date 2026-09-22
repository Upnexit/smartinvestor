import { createFileRoute } from "@tanstack/react-router";

/** Module load time — নতুন deploy হলে এই সময় পাল্টে যায়। */
const BOOT_TIME = new Date().toISOString();

/** Deployment health probe — Vercel / Lovable deploy যাচাইয়ের জন্য। */
export const Route = createFileRoute("/api/public/hooks/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            service: "smart-click-bd",
            build_time: BOOT_TIME,
            runtime: typeof navigator !== "undefined" ? "worker" : "node",
            now: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        ),
    },
  },
});

