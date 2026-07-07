// Server-only Telegram Bot API helper.
// Uses direct Telegram Bot API (no gateway).

const TG_API = "https://api.telegram.org";

function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error: findError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_connect_code", connectCode)
    .maybeSingle();

  if (findError) {
    console.error("telegram connect lookup error:", findError.message);
    return { ok: false, reason: "database_error" };
  }
  if (!profile) return { ok: false, reason: "invalid_code" };

  const userId = (profile as { id: string }).id;
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({
      telegram_chat_id: chatId,
      telegram_username: username ?? null,
      telegram_connected_at: new Date().toISOString(),
      telegram_connect_code: null,
    })
    .eq("id", userId);

  if (updateError) {
    console.error("telegram connect update error:", updateError.message);
    return { ok: false, userId, reason: "database_error" };
  }

  const name = (profile as { full_name?: string | null }).full_name || "বন্ধু";
  await sendTelegramMessage(
    chatId,
    `✅ <b>সফলভাবে সংযুক্ত হয়েছে!</b>\n\nস্বাগতম, ${name} 🎉\n\nএখন থেকে withdraw, task, package, ও support সংক্রান্ত সকল notification এখানে পাবেন।`,
  );

  return { ok: true, userId };
}

/** Notify a user by Supabase user id (fetches telegram_chat_id). */
export async function notifyUserTelegram(userId: string, text: string, extra: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", userId)
    .maybeSingle();
  const chatId = (data as { telegram_chat_id?: number | null } | null)?.telegram_chat_id;
  if (!chatId) return false;
  return sendTelegramMessage(chatId, text, extra);
}
