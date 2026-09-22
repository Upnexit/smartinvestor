import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { completeConnectFromRecentUpdates, ensureTelegramWebhook, resolveBotUsername } from "./telegram-link.server";

/** Get connection status + a fresh deep-link if not connected. */
export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { ensureWebhook?: boolean; verifyUpdates?: boolean }) => ({
    ensureWebhook: data?.ensureWebhook !== false,
    verifyUpdates: data?.verifyUpdates === true,
  }))
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;
    let { data, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_username, telegram_connect_code, telegram_connected_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const botUsername = await resolveBotUsername();
    if (input.ensureWebhook) await ensureTelegramWebhook();
    let code = (data as { telegram_connect_code?: string | null } | null)?.telegram_connect_code ?? null;
    const chatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id ?? null;

    if (!chatId && !code) {
      code = `u${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ telegram_connect_code: code })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);
    }

    if (!chatId && code && input.verifyUpdates) {
      await completeConnectFromRecentUpdates(code);
      const refreshed = await supabase
        .from("profiles")
        .select("telegram_chat_id, telegram_username, telegram_connect_code, telegram_connected_at")
        .eq("id", userId)
        .maybeSingle();
      if (refreshed.error) throw new Error(refreshed.error.message);
      data = refreshed.data;
    }

    code = (data as { telegram_connect_code?: string | null } | null)?.telegram_connect_code ?? code;
    const finalChatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id ?? null;
    const deepLink = botUsername && code && !finalChatId ? `https://t.me/${botUsername}?start=${code}` : null;

    return {
      connected: !!finalChatId,
      username: (data as { telegram_username?: string | null } | null)?.telegram_username ?? null,
      connectedAt: (data as { telegram_connected_at?: string | null } | null)?.telegram_connected_at ?? null,
      botUsername,
      connectCode: code,
      deepLink,
      fallback: input.verifyUpdates && !finalChatId,
      configurationError: null,
    };
  });

/** Disconnect Telegram for the current user. */
export const disconnectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        telegram_connect_code: null,
        telegram_connected_at: null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Send a test message to the connected Telegram account. */
export const sendTelegramTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const chatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id;
    if (!chatId) throw new Error("Telegram এখনো connected নয় — Profile পেজ থেকে Connect করুন");

    const { tgCall } = await import("./telegram.server");
    try {
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: "✅ <b>Smart Click BD</b>\nআপনার Telegram সফলভাবে যুক্ত হয়েছে। এখন থেকে সকল গুরুত্বপূর্ণ notification এখানে পাবেন।",
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Telegram-এ পাঠানো যায়নি: ${msg}`);
    }
    return { ok: true };
  });