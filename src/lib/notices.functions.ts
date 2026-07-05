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

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("notices").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return { notice: row as NoticeRow };
    }
    const { data: row, error } = await context.supabase
      .from("notices")
      .insert({ ...payload, created_by: context.userId })
      .select().single();
    if (error) throw new Error(error.message);
    return { notice: row as NoticeRow };
  });

export const deleteNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("notices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublishNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; published: boolean }) => ({ id: String(d.id), published: !!d.published }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("notices").update({ published: data.published }).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    return { notice: row as NoticeRow };
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

async function callGateway(system: string, user: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    throw new Error(`AI ${res.status}: ${t.slice(0, 160)}`);
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

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service configure করা নেই");

    const system = `You rewrite raw Bengali speech-to-text notes into short, professional Bangla notices for a Bangladesh online-earning platform ("Smart Investor").

STRICT OUTPUT:
Line 1: শিরোনাম: <short 4-8 word title in Bengali>
Line 2 onwards: notice body — 2-6 short, clear Bangla sentences or bullets (use "•").
No preface, no code fences, no markdown headings, no English unless a brand name.
Tone: ${data.priority === "critical" ? "জরুরি ও সরাসরি" : data.priority === "warning" ? "সতর্কতামূলক ও নম্র" : "বন্ধুত্বপূর্ণ ও তথ্যবহুল"}.`;

    const user = `Raw voice/text note from admin:\n"""${data.raw}"""\n\nএটিকে উপরের format-এ পরিষ্কার Bangla notice হিসেবে rewrite করুন। বানান, বিরাম, বাক্যগঠন সব ঠিক করুন। অতিরিক্ত তথ্য বানাবেন না।`;

    const out = await callGateway(system, user, key);
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
