import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

let _cachedBotUsername: string | null = null;
let _webhookEnsuredFor: string | null = null;
let _lastUpdateOffset = 0;

const FALLBACK_BOT_USERNAME = "smartinvestornotifybot_bot";

function cleanOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function stableLovableOriginFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const hostname = parsed.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") return null;
    if (/^project--[^.]+-dev\./.test(hostname) || /^project--[^.]+\./.test(hostname)) {
      return `https://${host}`;
    }

    const bridgedPreview = hostname.match(/^(?:id-preview|preview)--([^.]+)\.(.+)$/);
    if (bridgedPreview) return `https://project--${bridgedPreview[1]}-dev.${bridgedPreview[2]}`;

    const legacyPreview = hostname.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject(?:-dev)?\.com$/i);
    if (legacyPreview) return `https://project--${legacyPreview[1]}-dev.lovable.app`;

    return `${parsed.protocol}//${host}`;
  } catch {
    return null;
  }
}

async function fetchTelegram(token: string, method: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    return await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBotUsername(): Promise<string> {
  if (_cachedBotUsername) return _cachedBotUsername;
  const envName = (process.env.TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, "");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token) {
    try {
      const r = await fetchTelegram(token, "getMe");
      const j = (await r.json()) as { ok?: boolean; result?: { username?: string } };
      const u = j?.result?.username ?? "";
      if (u) {
        _cachedBotUsername = u;
        if (envName && envName !== u) console.warn(`[telegram] TELEGRAM_BOT_USERNAME mismatch; using @${u}`);
        return u;
      }
    } catch (e) {
      console.warn("[telegram] getMe failed", e instanceof Error ? e.message : e);
    }
  }
  _cachedBotUsername = envName || FALLBACK_BOT_USERNAME;
  return _cachedBotUsername;
}

async function ensureTelegramWebhook(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  let requestOrigin = "";
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    requestOrigin = stableLovableOriginFromUrl(getRequest().url) ?? "";
  } catch {
    requestOrigin = "";
  }

  let origin = cleanOrigin(process.env.TELEGRAM_WEBHOOK_BASE_URL || process.env.PUBLIC_SITE_URL || process.env.SITE_URL || "");
  const projectId = process.env.LOVABLE_PROJECT_ID;
  if (!origin && projectId) origin = `https://project--${projectId}-dev.lovable.app`;
  if (!origin) origin = requestOrigin;
  origin = cleanOrigin(stableLovableOriginFromUrl(origin) ?? origin);
  if (!origin || origin.includes("localhost")) return;

  const webhookUrl = `${origin}/api/public/telegram/webhook`;
  if (_webhookEnsuredFor === webhookUrl) return;

  try {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    };
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret) body.secret_token = secret;

    const r = await fetchTelegram(token, "setWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!r.ok || j.ok === false) throw new Error(j.description || `setWebhook failed [${r.status}]`);
    _webhookEnsuredFor = webhookUrl;
  } catch (e) {
    console.warn("[telegram] setWebhook failed", e instanceof Error ? e.message : e);
  }
}

async function completeConnectFromRecentUpdates(code: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !code) return;

  try {
    const query = new URLSearchParams({
      timeout: "0",
      limit: "20",
      allowed_updates: JSON.stringify(["message"]),
    });
    if (_lastUpdateOffset > 0) query.set("offset", String(_lastUpdateOffset));

    const r = await fetchTelegram(token, `getUpdates?${query.toString()}`);
    const j = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: Array<{
        update_id: number;
        message?: { chat?: { id?: number }; from?: { username?: string }; text?: string };
        edited_message?: { chat?: { id?: number }; from?: { username?: string }; text?: string };
      }>;
      description?: string;
    };
    if (!r.ok || j.ok === false || !Array.isArray(j.result)) return;

    for (const update of j.result) {
      _lastUpdateOffset = Math.max(_lastUpdateOffset, update.update_id + 1);
      const msg = update.message ?? update.edited_message;
      const chatId = msg?.chat?.id;
      const text = (msg?.text ?? "").trim();
      if (!chatId || !text.startsWith("/start")) continue;

      const receivedCode = text.split(/\s+/)[1]?.trim();
      if (receivedCode !== code) continue;

      const { completeTelegramConnectFromCode } = await import("./telegram.server");
      await completeTelegramConnectFromCode({ code, chatId, username: msg?.from?.username ?? null });
      return;
    }
  } catch (e) {
    console.warn("[telegram] getUpdates fallback failed", e instanceof Error ? e.message : e);
  }
}

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
      configurationError: botUsername ? null : "Telegram bot username configure করা নেই",
    };
  });

/** Disconnect Telegram for the current user. */
export const disconnectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
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
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { notifyUserTelegram } = await import("./telegram.server");
    const ok = await notifyUserTelegram(
      context.userId,
      "✅ <b>Smart Investor</b>\nআপনার Telegram সফলভাবে যুক্ত হয়েছে। এখন থেকে সকল গুরুত্বপূর্ণ notification এখানে পাবেন।",
    );
    if (!ok) throw new Error("Telegram এখনো connected নয়");
    return { ok: true };
  });
