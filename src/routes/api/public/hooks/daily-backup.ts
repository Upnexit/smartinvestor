import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/daily-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.BACKUP_CRON_SECRET;
        const authHeader = request.headers.get("x-backup-secret");
        if (!cronSecret || authHeader !== cronSecret) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { runFullBackup } = await import("@/lib/backup.server");
          const result = await runFullBackup();
          return new Response(
            JSON.stringify({
              success: true,
              ...result,
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Daily backup failed:", message);
          return new Response(
            JSON.stringify({ success: false, error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
