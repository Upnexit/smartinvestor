// Server-only Telegram Bot API helper.
// Uses direct Telegram Bot API (no gateway).
import { createClient } from "@supabase/supabase-js";
import { resolveSupabasePublicEnv } from "@/integrations/supabase/config";

const TG_API = "https://api.telegram.org";

let _publicSupabase: ReturnType<typeof createClient> | null = null;

function envValue(name: string): string {
  try {
    return process.env?.[name] ?? "";
  } catch {
    return "";
  }
}

function getPublicSupabase() {
  if (!_publicSupabase) {
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = resolveSupabasePublicEnv();
    _publicSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  }
  return _publicSupabase;
}

function botToken(): string {
  const t = envValue("TELEGRAM_BOT_TOKEN");
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  return t;
}

export async function tgCall(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${TG_API}/bot${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || (j && j.ok === false)) {
    const desc = (j && (j.description as string)) || `Telegram ${method} failed [${res.status}]`;
    throw new Error(desc);
  }
  return j.result;
}

export async function sendTelegramMessage(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  try {
    await tgCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
    return true;
  } catch (e) {
    console.error("sendTelegramMessage error:", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function completeTelegramConnectFromCode({
  code,
  chatId,
  username,
}: {
  code: string;
  chatId: number;
  username?: string | null;
}): Promise<{ ok: boolean; userId?: string; reason?: string }> {
  const connectCode = code.trim();
  if (!connectCode) return { ok: false, reason: "missing_code" };

  const { data, error } = await (getPublicSupabase() as any).rpc("telegram_connect_account", {
    _code: connectCode,
    _chat_id: chatId,
    _username: username ?? null,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.toLowerCase().includes("invalid connect code")) return { ok: false, reason: "invalid_code" };
    console.error("telegram connect rpc error:", message);
    return { ok: false, reason: "database_error" };
  }

  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile?.user_id) return { ok: false, reason: "invalid_code" };

  const name = profile.full_name || "বন্ধু";
  await sendTelegramMessage(
    chatId,
    `✅ <b>সফলভাবে সংযুক্ত হয়েছে!</b>\n\nস্বাগতম, ${name} 🎉\n\nএখন থেকে withdraw, task, package, ও support সংক্রান্ত সকল notification এখানে পাবেন।`,
    {
      reply_markup: {
        keyboard: [
          [{ text: "💰 ব্যালেন্স" }, { text: "📦 প্যাকেজ" }],
          [{ text: "📊 স্ট্যাটাস" }, { text: "❓ সাহায্য" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    },
  );

  return { ok: true, userId: profile.user_id };
}

export async function findTelegramAccountByChat(chatId: number): Promise<{
  full_name?: string | null;
  user_code?: string | null;
  balance?: number | null;
  locked_balance?: number | null;
  total_earned?: number | null;
  active_package?: string | null;
  package_expires_at?: string | null;
} | null> {
  const { data, error } = await (getPublicSupabase() as any).rpc("telegram_find_account_by_chat", { _chat_id: chatId });
  if (error) {
    console.error("telegram status rpc error:", error.message);
    return null;
  }
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

/** Notify a user by Supabase user id (fetches telegram_chat_id). */
export async function notifyUserTelegram(userId: string, text: string, extra: Record<string, unknown> = {}) {
  let chatId: number | string | null = null;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", userId)
      .maybeSingle();
    chatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id ?? null;
  } catch (e) {
    console.warn("telegram admin chat lookup fallback:", e instanceof Error ? e.message : e);
  }

  if (!chatId) {
    const { data, error } = await (getPublicSupabase() as any).rpc("telegram_chat_for_user", { _user_id: userId });
    if (error) console.error("telegram chat rpc error:", error.message);
    const row = Array.isArray(data) ? data[0] : data;
    chatId = row?.chat_id ?? null;
  }

  if (!chatId) return false;
  return sendTelegramMessage(chatId, text, extra);
}
