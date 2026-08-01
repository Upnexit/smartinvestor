import { createFileRoute } from "@tanstack/react-router";

/**
 * Auto Task Cron
 * --------------
 * প্রতিদিন রাত ২টা (Asia/Dhaka) = 20:00 UTC আগের দিন — pg_cron এই endpoint call করে।
 * Active user আছে এমন প্রতিটি package-এর জন্য ওই দিনের Facebook like/follow task
 * automatic তৈরি হয়ে active হয়ে যায়।
 */
export const Route = createFileRoute("/api/public/hooks/auto-tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        const apikey = request.headers.get("apikey");
        if (!expected || apikey !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let targetDate: string | undefined;
        try {
          const body = (await request.json()) as { date?: string };
          if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) targetDate = body.date;
        } catch { /* empty body ok */ }

        try {
          const { runAutoTaskGeneration } = await import("@/lib/auto-tasks.server");
          const result = await runAutoTaskGeneration({ targetDate });
          return Response.json({ success: true, ...result });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("auto-tasks cron failed:", message);
          return Response.json({ success: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
