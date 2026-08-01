import { createFileRoute } from "@tanstack/react-router";

/** Deployment health probe — Vercel / Lovable deploy যাচাইয়ের জন্য। */
export const Route = createFileRoute("/api/public/hooks/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            service: "smart-investor",
            build_time: __BUILD_TIME__,
            runtime: typeof navigator !== "undefined" ? "worker" : "node",
            now: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } },
        ),
    },
  },
});

declare const __BUILD_TIME__: string;
