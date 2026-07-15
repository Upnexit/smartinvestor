import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, improveNoticeTextWithAI, sendNoticeToTelegramTargets } from "./notices.server";

export type NoticePriority = "info" | "warning" | "critical";

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  priority: NoticePriority;
  target_package_ids: string[];
  target_user_ids: string[];
  target_all_users: boolean;
  published: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ------------------------------ ADMIN OPS ------------------------------ */

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
    target_user_ids?: string[];
    target_all_users: boolean;
    published: boolean;
    expires_at?: string | null;
  }) => ({
    id: d.id ?? null,
    title: String(d.title ?? "").slice(0, 200).trim(),
    body: String(d.body ?? "").slice(0, 4000).trim(),
    priority: (["info", "warning", "critical"].includes(d.priority) ? d.priority : "info") as NoticePriority,
    target_package_ids: Array.isArray(d.target_package_ids) ? d.target_package_ids.slice(0, 30) : [],
    target_user_ids: Array.isArray(d.target_user_ids) ? d.target_user_ids.slice(0, 500) : [],
    target_all_users: !!d.target_all_users,
    published: !!d.published,
    expires_at: d.expires_at ? String(d.expires_at) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.title || !data.body) throw new Error("Title ও body আবশ্যক");
    if (!data.target_all_users && data.target_package_ids.length === 0 && data.target_user_ids.length === 0) {
      throw new Error("অন্তত একটি package/user select করুন অথবা 'সব user' চিহ্নিত করুন");
    }

    const payload = {
      title: data.title,
      body: data.body,
      priority: data.priority,
      target_package_ids: data.target_all_users ? [] : data.target_package_ids,
      target_user_ids: data.target_all_users ? [] : data.target_user_ids,
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
    if (error) throw new Error(error.message);
    const notice = row as NoticeRow;
    const telegram = data.published
      ? await sendNoticeToTelegramTargets(context.supabase, context.userId, notice)
      : { sent: 0, failed: 0, recipients: 0 };
    return { notice, telegram };
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
      const userTargets: string[] = Array.isArray(n.target_user_ids) ? n.target_user_ids : [];
      if (userTargets.includes(userId)) return true;
      const pkgTargets: string[] = Array.isArray(n.target_package_ids) ? n.target_package_ids : [];
      if (pkgTargets.length > 0 && pkgTargets.some((pid) => myPackageIds.has(pid))) return true;
      return false;
    }) as NoticeRow[];

    return { notices: filtered };
  });

/** Admin: one-click "you missed today's tasks" notice for a specific user. */
export const sendMissedTaskNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; date?: string | null }) => ({
    user_id: String(d.user_id),
    date: d.date ? String(d.date) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await (context.supabase as any).rpc("admin_send_missed_task_notice", {
      _actor: context.userId,
      _user_id: data.user_id,
      _bd_date: data.date,
    });
    if (error) throw new Error(error.message);
    const notice = row as NoticeRow;
    const telegram = await sendNoticeToTelegramTargets(context.supabase, context.userId, notice);
    return { notice, telegram };
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

export const improveNoticeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { raw: string; priority?: NoticePriority }) => ({
    raw: String(d.raw ?? "").slice(0, 4000).trim(),
    priority: (d.priority ?? "info") as NoticePriority,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.raw) throw new Error("কোনো টেক্সট পাওয়া যায়নি");
    return improveNoticeTextWithAI(data.raw, data.priority);
  });

