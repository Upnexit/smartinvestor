import { createFileRoute } from "@tanstack/react-router";

type TgUser = { id: number; username?: string; first_name?: string };
type TgMessage = { chat: { id: number }; from?: TgUser; text?: string };
type TgUpdate = { update_id: number; message?: TgMessage; edited_message?: TgMessage };

async function tgSend(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => {});
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Optional shared secret: Telegram sends X-Telegram-Bot-Api-Secret-Token
        const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
        if (expected) {
          const got = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
          if (got !== expected) return new Response("Unauthorized", { status: 401 });
        }

        let update: TgUpdate;
        try {
          update = (await request.json()) as TgUpdate;
        } catch {
          return new Response("Bad Request", { status: 400 });
        }

        const msg = update.message ?? update.edited_message;
        if (!msg?.chat?.id) return Response.json({ ok: true, ignored: true });

        const chatId = msg.chat.id;
        const text = (msg.text ?? "").trim();

        // /start <code>  → link this chat to the user with matching telegram_connect_code
        if (text.startsWith("/start")) {
          const parts = text.split(/\s+/);
          const code = parts[1]?.trim();
          if (!code) {
            await tgSend(
              chatId,
              "👋 স্বাগতম <b>Smart Investor</b> Bot-এ!\n\nসংযোগ করতে আপনার Profile পেজ থেকে <b>“Telegram Connect করুন”</b> বাটনে চাপুন।",
            );
            return Response.json({ ok: true });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, full_name")
            .eq("telegram_connect_code", code)
            .maybeSingle();

          if (!profile) {
            await tgSend(chatId, "⚠️ এই connect code টি বৈধ নয় বা মেয়াদ শেষ। অনুগ্রহ করে Profile পেজ থেকে আবার চেষ্টা করুন।");
            return Response.json({ ok: true });
          }

          const uname = msg.from?.username ?? null;
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              telegram_chat_id: chatId,
              telegram_username: uname,
              telegram_connected_at: new Date().toISOString(),
              telegram_connect_code: null, // consume the code
            })
            .eq("id", (profile as { id: string }).id);

          if (error) {
            await tgSend(chatId, "❌ সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            return Response.json({ ok: true });
          }

          const name = (profile as { full_name?: string | null }).full_name || "বন্ধু";
          await tgSend(
            chatId,
            `✅ <b>সফলভাবে সংযুক্ত হয়েছে!</b>\n\nস্বাগতম, ${name} 🎉\n\nএখন থেকে withdraw, task, package, ও support সংক্রান্ত সকল notification এখানে পাবেন।`,
          );
          return Response.json({ ok: true });
        }

        if (text === "/help" || text === "/menu") {
          await tgSend(
            chatId,
            "ℹ️ <b>Smart Investor Bot</b>\n\n/start &lt;code&gt; — অ্যাকাউন্ট যুক্ত করুন\n/status — সংযোগ অবস্থা\n/help — সাহায্য",
          );
          return Response.json({ ok: true });
        }

        if (text === "/status") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("profiles")
            .select("full_name, user_code")
            .eq("telegram_chat_id", chatId)
            .maybeSingle();
          if (data) {
            const p = data as { full_name?: string | null; user_code?: string | null };
            await tgSend(chatId, `✅ সংযুক্ত: <b>${p.full_name ?? ""}</b> (${p.user_code ?? ""})`);
          } else {
            await tgSend(chatId, "❌ এই chat কোনো account-এর সাথে যুক্ত নয়।");
          }
          return Response.json({ ok: true });
        }

        // Default reply
        await tgSend(chatId, "🤖 কমান্ড ব্যবহার করুন: /start &lt;code&gt;, /status, /help");
        return Response.json({ ok: true });
      },
    },
  },
});
