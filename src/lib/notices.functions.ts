import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NoticePriority = "info" | "warning" | "critical";

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  priority: NoticePriority;
  target_package_ids: string[];
  target_all_users: boolean;
  published: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ------------------------------ ADMIN OPS ------------------------------ */

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("forbidden");
}

function priorityLabel(priority: NoticePriority) {
  if (priority === "critical") return "🚨 জরুরি";
  if (priority === "warning") return "⚠️ সতর্কতা";
  return "ℹ️ নোটিশ";
}

async function sendNoticeToTelegramTargets(
  _supabase: any,
  actorId: string,
  notice: NoticeRow,
): Promise<{ sent: number; failed: number; recipients: number }> {
  if (!notice.published) return { sent: 0, failed: 0, recipients: 0 };

  const targets = Array.isArray(notice.target_package_ids) ? notice.target_package_ids : [];

  // Use admin client so recipient lookup and delivery are not affected by RLS
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc("telegram_notice_recipients", {
    _actor: actorId,
    _target_all_users: !!notice.target_all_users,
    _target_package_ids: targets,
  });
  if (error) {
    console.error("[notice] telegram_notice_recipients failed:", error.message);
    return { sent: 0, failed: 0, recipients: 0 };
  }

  const recipients = ((data ?? []) as Array<{ chat_id?: number | string | null; full_name?: string | null }>)
    .filter((r) => r.chat_id != null);
  if (recipients.length === 0) return { sent: 0, failed: 0, recipients: 0 };

  const { sendTelegramMessage } = await import("./telegram.server");
  const text = `${priorityLabel(notice.priority)} <b>${notice.title}</b>\n\n${notice.body}`;
  const results = await Promise.all(
    recipients.map((r) =>
      sendTelegramMessage(r.chat_id as number | string, text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💰 ব্যালেন্স", callback_data: "balance" }, { text: "📦 প্যাকেজ", callback_data: "package" }],
            [{ text: "📊 স্ট্যাটাস", callback_data: "status" }],
          ],
        },
      }),
    ),
  );
  const sent = results.filter(Boolean).length;
  const failed = results.length - sent;
  if (failed > 0) console.warn(`[notice] telegram: ${sent}/${recipients.length} sent, ${failed} failed`);
  return { sent, failed, recipients: recipients.length };
}

export const listAdminNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { notices: (data ?? []) as NoticeRow[] };
  });

export const saveNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string | null;
    title: string;
    body: string;
    priority: NoticePriority;
    target_package_ids: string[];
    target_all_users: boolean;
    published: boolean;
    expires_at?: string | null;
  }) => ({
    id: d.id ?? null,
    title: String(d.title ?? "").slice(0, 200).trim(),
    body: String(d.body ?? "").slice(0, 4000).trim(),
    priority: (["info", "warning", "critical"].includes(d.priority) ? d.priority : "info") as NoticePriority,
    target_package_ids: Array.isArray(d.target_package_ids) ? d.target_package_ids.slice(0, 30) : [],
    target_all_users: !!d.target_all_users,
    published: !!d.published,
    expires_at: d.expires_at ? String(d.expires_at) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.title || !data.body) throw new Error("Title ও body আবশ্যক");
    if (!data.target_all_users && data.target_package_ids.length === 0) {
      throw new Error("অন্তত একটি package select করুন অথবা 'সব user' চিহ্নিত করুন");
    }

    const payload = {
      title: data.title,
      body: data.body,
      priority: data.priority,
      target_package_ids: data.target_all_users ? [] : data.target_package_ids,
      target_all_users: data.target_all_users,
      published: data.published,
      expires_at: data.expires_at,
    };

    const { data: row, error } = await (context.supabase as any).rpc("admin_save_notice", {
      _actor: context.userId,
      _id: data.id,
      _patch: payload,
    });
    if (error) throw new Error(error.message);
    const notice = row as NoticeRow;
    const telegram = data.published
      ? await sendNoticeToTelegramTargets(context.supabase, context.userId, notice)
      : { sent: 0, failed: 0, recipients: 0 };
    return { notice, telegram };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (context.supabase as any).rpc("admin_delete_notice", {
      _actor: context.userId,
      _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublishNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; published: boolean }) => ({ id: String(d.id), published: !!d.published }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await (context.supabase as any).rpc("admin_toggle_notice", {
      _actor: context.userId,
      _id: data.id,
      _published: data.published,
  });

export const resendNoticeToTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("notices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("notice not found");
    const notice = { ...(row as NoticeRow), published: true };
    const telegram = await sendNoticeToTelegramTargets(context.supabase, context.userId, notice);
    return { telegram };
  });
    if (error) throw new Error(error.message);
    const notice = row as NoticeRow;
    const telegram = data.published
      ? await sendNoticeToTelegramTargets(context.supabase, context.userId, notice)
      : { sent: 0, failed: 0, recipients: 0 };
    return { notice, telegram };
  });

/* ------------------------------ USER OPS ------------------------------ */

export const listActiveNoticesForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // User-এর active package IDs
    const { data: ups } = await supabase
      .from("user_packages")
      .select("package_id, status")
      .eq("user_id", userId)
      .eq("status", "active");
    const myPackageIds = new Set((ups ?? []).map((r: any) => r.package_id as string));

    // Published + not expired
    const nowIso = new Date().toISOString();
    const { data: notices, error } = await supabase
      .from("notices")
      .select("*")
      .eq("published", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    // Dismissals
    const { data: dismissals } = await supabase
      .from("notice_dismissals").select("notice_id").eq("user_id", userId);
    const dismissed = new Set((dismissals ?? []).map((d: any) => d.notice_id as string));

    // Filter by target audience
    const filtered = (notices ?? []).filter((n: any) => {
      if (dismissed.has(n.id)) return false;
      if (n.target_all_users) return true;
      const targets: string[] = Array.isArray(n.target_package_ids) ? n.target_package_ids : [];
      if (targets.length === 0) return false;
      return targets.some((pid) => myPackageIds.has(pid));
    }) as NoticeRow[];

    return { notices: filtered };
  });

export const dismissNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { notice_id: string }) => ({ notice_id: String(d.notice_id) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notice_dismissals")
      .insert({ notice_id: data.notice_id, user_id: context.userId });
    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

/* ------------------------- AI IMPROVE (Bangla) ------------------------- */

async function callGatewayLovable(system: string, user: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "smart-investor-notices",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    throw new Error(`Lovable ${res.status}: ${t.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export const improveNoticeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { raw: string; priority?: NoticePriority }) => ({
    raw: String(d.raw ?? "").slice(0, 4000).trim(),
    priority: (d.priority ?? "info") as NoticePriority,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.raw) throw new Error("কোনো টেক্সট পাওয়া যায়নি");

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY configure করা নেই");

    const { getBusinessContext } = await import("./ai-context.server");
    const ctx = await getBusinessContext();

    const system = `You rewrite raw Bengali speech-to-text notes into short, professional Bangla notices for the Smart Investor platform.

STRICT OUTPUT:
Line 1: শিরোনাম: <short 4-8 word title in Bengali>
Line 2 onwards: notice body — 2-6 short, clear Bangla sentences or bullets (use "•").
No preface, no code fences, no markdown headings, no English unless a brand name.
Tone: ${data.priority === "critical" ? "জরুরি ও সরাসরি" : data.priority === "warning" ? "সতর্কতামূলক ও নম্র" : "বন্ধুত্বপূর্ণ ও তথ্যবহুল"}.

${ctx}`;

    const user = `Raw voice/text note from admin:\n"""${data.raw}"""\n\nএটিকে উপরের format-এ পরিষ্কার Bangla notice হিসেবে rewrite করুন। বানান, বিরাম, বাক্যগঠন সব ঠিক করুন। অতিরিক্ত তথ্য বানাবেন না।`;

    const out = await callGatewayLovable(system, user, lovableKey);
    if (!out) throw new Error("AI থেকে উত্তর পাওয়া যায়নি");

    // Parse "শিরোনাম: ..." from line 1
    const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "";
    let bodyStart = 0;
    if (lines[0] && /^শিরোনাম\s*[:：]/.test(lines[0])) {
      title = lines[0].replace(/^শিরোনাম\s*[:：]\s*/, "").trim();
      bodyStart = 1;
    }
    const body = lines.slice(bodyStart).join("\n").trim() || out;
    return { title: title.slice(0, 200), body: body.slice(0, 4000) };
  });

