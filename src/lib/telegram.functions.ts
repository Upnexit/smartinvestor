import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Get connection status + a fresh deep-link if not connected. */
export const getTelegramStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_username, telegram_connect_code, telegram_connected_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";
    let code = (data as { telegram_connect_code?: string | null } | null)?.telegram_connect_code ?? null;

    // If not connected and no code yet, mint one
    const chatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id ?? null;
    if (!chatId && !code) {
      code = `u${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("profiles").update({ telegram_connect_code: code }).eq("id", userId);
    }

    const deepLink = botUsername && code ? `https://t.me/${botUsername}?start=${code}` : null;

    return {
      connected: !!chatId,
      username: (data as { telegram_username?: string | null } | null)?.telegram_username ?? null,
      connectedAt: (data as { telegram_connected_at?: string | null } | null)?.telegram_connected_at ?? null,
      botUsername,
      deepLink,
    };
  });

/** Disconnect Telegram for the current user. */
export const disconnectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
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
  .handler(async ({ context }) => {
    const { notifyUserTelegram } = await import("./telegram.server");
    const ok = await notifyUserTelegram(
      context.userId,
      "✅ <b>Smart Investor</b>\nআপনার Telegram সফলভাবে যুক্ত হয়েছে। এখন থেকে সকল গুরুত্বপূর্ণ notification এখানে পাবেন।",
    );
    if (!ok) throw new Error("Telegram এখনো connected নয়");
    return { ok: true };
  });
