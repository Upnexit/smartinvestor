let _cachedBotUsername: string | null = null;
let _webhookEnsuredFor: string | null = null;
let _lastUpdateOffset = 0;

const FALLBACK_BOT_USERNAME = "smartinvestornotifybot_bot";

function envValue(name: string): string {
  try {
    return process.env?.[name] ?? "";
  } catch {
    return "";
  }
}

function cleanOrigin(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function stableLovableOriginFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const hostname = parsed.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") return null;
    if (/^project--[^.]+-dev\./.test(hostname) || /^project--[^.]+\./.test(hostname)) return `https://${host}`;

    const bridgedPreview = hostname.match(/^(?:id-preview|preview)--([^.]+)\.(.+)$/);
    if (bridgedPreview) return `https://project--${bridgedPreview[1]}-dev.${bridgedPreview[2]}`;

    const legacyPreview = hostname.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject(?:-dev)?\.com$/i);
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
    return await fetch(`https://api.telegram.org/bot${token}/${method}`, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveBotUsername(): Promise<string> {
  if (_cachedBotUsername) return _cachedBotUsername;
  const envName = envValue("TELEGRAM_BOT_USERNAME").trim().replace(/^@/, "");
  const token = envValue("TELEGRAM_BOT_TOKEN");
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

export async function ensureTelegramWebhook(): Promise<void> {
  const token = envValue("TELEGRAM_BOT_TOKEN");
  if (!token) return;

  let requestOrigin = "";
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    requestOrigin = stableLovableOriginFromUrl(getRequest().url) ?? "";
  } catch {
    requestOrigin = "";
  }

  let origin = cleanOrigin(envValue("TELEGRAM_WEBHOOK_BASE_URL") || envValue("PUBLIC_SITE_URL") || envValue("SITE_URL"));
  const projectId = envValue("LOVABLE_PROJECT_ID");
  if (!origin && projectId) origin = `https://project--${projectId}-dev.lovable.app`;
  if (!origin) origin = requestOrigin;
  origin = cleanOrigin(stableLovableOriginFromUrl(origin) ?? origin);
  if (!origin || origin.includes("localhost")) return;

  const webhookUrl = `${origin}/api/public/telegram/webhook`;
  if (_webhookEnsuredFor === webhookUrl) return;

  try {
    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    };
    const secret = envValue("TELEGRAM_WEBHOOK_SECRET");
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

export async function completeConnectFromRecentUpdates(code: string): Promise<void> {
  const token = envValue("TELEGRAM_BOT_TOKEN");
  if (!token || !code) return;

  try {
    const readUpdates = async () => {
      const query = new URLSearchParams({
        timeout: "0",
        limit: "20",
        allowed_updates: JSON.stringify(["message"]),
      });
      if (_lastUpdateOffset > 0) query.set("offset", String(_lastUpdateOffset));
      const response = await fetchTelegram(token, `getUpdates?${query.toString()}`);
      const json = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: Array<{
          update_id: number;
          message?: { chat?: { id?: number }; from?: { username?: string }; text?: string };
          edited_message?: { chat?: { id?: number }; from?: { username?: string }; text?: string };
        }>;
        description?: string;
      };
      return { response, json };
    };

    let { response: r, json: j } = await readUpdates();
    if (j.description?.includes("webhook is active")) {
      await fetchTelegram(token, "deleteWebhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: false }),
      }).catch(() => undefined);
      ({ response: r, json: j } = await readUpdates());
    }

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
      await ensureTelegramWebhook();
      return;
    }

    await ensureTelegramWebhook();
  } catch (e) {
    console.warn("[telegram] getUpdates fallback failed", e instanceof Error ? e.message : e);
  }
}