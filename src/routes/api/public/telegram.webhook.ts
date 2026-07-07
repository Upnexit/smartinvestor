import { createFileRoute } from "@tanstack/react-router";

type TgUser = { id: number; username?: string; first_name?: string };
type TgMessage = { chat: { id: number }; from?: TgUser; text?: string };
type TgCallback = { id: string; from?: TgUser; message?: TgMessage; data?: string };
type TgUpdate = { update_id: number; message?: TgMessage; edited_message?: TgMessage; callback_query?: TgCallback };

const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "💰 ব্যালেন্স" }, { text: "📦 প্যাকেজ" }],
    [{ text: "📊 স্ট্যাটাস" }, { text: "❓ সাহায্য" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

const INLINE_KEYBOARD = {
  inline_keyboard: [
    [{ text: "💰 ব্যালেন্স", callback_data: "balance" }, { text: "📦 প্যাকেজ", callback_data: "package" }],
    [{ text: "📊 স্ট্যাটাস", callback_data: "status" }],
  ],
};

async function tgApi(method: string, body: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function tgSend(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await tgApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

async function answerCallback(id: string) {
  await tgApi("answerCallbackQuery", { callback_query_id: id });
}

function money(value: unknown) {
  return `৳${Number(value ?? 0).toFixed(0)}`;
}

async function sendAccountInfo(chatId: number, mode: "status" | "balance" | "package" = "status") {
  const { findTelegramAccountByChat } = await import("@/lib/telegram.server");
  const data = await findTelegramAccountByChat(chatId);
  if (!data) {
    await tgSend(chatId, "👋 Smart Investor Bot-এ স্বাগতম।\n\nআপনার account যুক্ত করতে Profile পেজ থেকে <b>Telegram Connect</b> চাপুন।", { reply_markup: MAIN_KEYBOARD });
    return;
  }

  const p = data as {
    full_name?: string | null;
    user_code?: string | null;
    balance?: number | null;
    locked_balance?: number | null;
    total_earned?: number | null;
    active_package?: string | null;
    package_expires_at?: string | null;
  };

  if (mode === "balance") {
    await tgSend(
      chatId,
      `💰 <b>আপনার ব্যালেন্স</b>\n\nAvailable: <b>${money(p.balance)}</b>\nLocked: <b>${money(p.locked_balance)}</b>\nTotal Earned: <b>${money(p.total_earned)}</b>`,
      { reply_markup: INLINE_KEYBOARD },
    );
    return;
  }

  if (mode === "package") {
    await tgSend(
      chatId,
      `📦 <b>আপনার প্যাকেজ</b>\n\n${p.active_package ? `Active: <b>${p.active_package}</b>${p.package_expires_at ? `\nExpire: ${new Date(p.package_expires_at).toLocaleDateString("bn-BD")}` : ""}` : "কোন active package নেই।"}`,
      { reply_markup: INLINE_KEYBOARD },
    );
    return;
  }

  await tgSend(
    chatId,
    `✅ <b>সংযুক্ত আছে</b>\n\nনাম: <b>${p.full_name ?? ""}</b>\nUser ID: <code>${p.user_code ?? ""}</code>\nBalance: <b>${money(p.balance)}</b>\nPackage: <b>${p.active_package ?? "নেই"}</b>`,
    { reply_markup: INLINE_KEYBOARD },
  );
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

        if (update.callback_query?.message?.chat?.id) {
          const chatId = update.callback_query.message.chat.id;
          const action = update.callback_query.data;
          await answerCallback(update.callback_query.id);
          if (action === "balance") await sendAccountInfo(chatId, "balance");
          else if (action === "package") await sendAccountInfo(chatId, "package");
          else await sendAccountInfo(chatId, "status");
          return Response.json({ ok: true });
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
            await sendAccountInfo(chatId, "status");
            return Response.json({ ok: true });
          }

          const { completeTelegramConnectFromCode } = await import("@/lib/telegram.server");
          const result = await completeTelegramConnectFromCode({
            code,
            chatId,
            username: msg.from?.username ?? null,
          });

          if (!result.ok && result.reason === "invalid_code") {
            await sendAccountInfo(chatId, "status");
            return Response.json({ ok: true });
          }

          if (!result.ok) {
            await tgSend(chatId, "❌ সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
            return Response.json({ ok: true });
          }
          return Response.json({ ok: true });
        }

        if (text === "/help" || text === "/menu" || text === "❓ সাহায্য") {
          await tgSend(
            chatId,
            "ℹ️ <b>Smart Investor Bot</b>\n\nনিচের button থেকে balance, package ও status দেখুন।",
            { reply_markup: MAIN_KEYBOARD },
          );
          return Response.json({ ok: true });
        }

        if (text === "/status" || text === "📊 স্ট্যাটাস") {
          await sendAccountInfo(chatId, "status");
          return Response.json({ ok: true });
        }

        if (text === "💰 ব্যালেন্স") {
          await sendAccountInfo(chatId, "balance");
          return Response.json({ ok: true });
        }

        if (text === "📦 প্যাকেজ") {
          await sendAccountInfo(chatId, "package");
          return Response.json({ ok: true });
        }

        // Default reply
        await sendAccountInfo(chatId, "status");
        return Response.json({ ok: true });
      },
    },
  },
});
