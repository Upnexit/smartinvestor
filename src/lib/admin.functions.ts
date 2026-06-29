import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;
function uuid(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("invalid id");
  return v;
}
function str(v: unknown, max = 500): string {
  if (typeof v !== "string") throw new Error("invalid string");
  const s = v.trim();
  if (s.length === 0 || s.length > max) throw new Error("invalid string length");
  return s;
}

type AdminDb = Parameters<Parameters<typeof requireSupabaseAuth["options"]["server"]>[0]["next"]>[0]["context"]["supabase"];

async function assertAdmin(db: AdminDb, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
  return db;
}

/* =====================  USERS  ===================== */

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; limit?: number }) => ({
    q: typeof d?.q === "string" ? d.q.trim().slice(0, 80) : "",
    limit: Math.min(Math.max(d?.limit ?? 100, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    let q = db.from("profiles").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.q) q = q.or(`full_name.ilike.%${data.q}%,email.ilike.%${data.q}%,phone.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminGetUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => ({ userId: uuid(d.userId) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const [profile, packages, withdrawals, tasks, refs] = await Promise.all([
      db.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      db.from("user_packages").select("*, packages(name,price)").eq("user_id", data.userId).order("created_at", { ascending: false }),
      db.from("withdrawals").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }),
      db.from("task_submissions").select("*, link_tasks(title,reward)").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50),
      db.from("referral_earnings").select("*").eq("referrer_id", data.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    return {
      profile: profile.data,
      packages: packages.data ?? [],
      withdrawals: withdrawals.data ?? [],
      tasks: tasks.data ?? [],
      referrals: refs.data ?? [],
    };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; patch: Record<string, unknown> }) => ({
    userId: uuid(d.userId),
    patch: d.patch ?? {},
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await db.rpc("admin_update_user_profile", {
      _actor: context.userId, _user_id: data.userId, _patch: data.patch as never,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => ({ userId: uuid(d.userId) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { error } = await db.rpc("admin_delete_user_data", {
      _actor: context.userId, _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    // also try to remove the auth user (best-effort)
    return { ok: true };
  });

/* =====================  PACKAGES  ===================== */

export const adminListPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data, error } = await db.from("packages").select("*").order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSavePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string | null; patch: Record<string, unknown> }) => ({
    id: d.id ? uuid(d.id) : null, patch: d.patch ?? {},
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await db.rpc("admin_save_package", {
      _actor: context.userId, _id: data.id as string, _patch: data.patch as never,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const adminTogglePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active: boolean }) => ({ id: uuid(d.id), active: !!d.active }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await db.rpc("admin_toggle_package", {
      _actor: context.userId, _id: data.id, _active: data.active,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { error } = await db.rpc("admin_delete_package", {
      _actor: context.userId, _id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =====================  WITHDRAWALS  ===================== */

export const adminReviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; action: "approve" | "reject"; note?: string }) => {
    if (d.action !== "approve" && d.action !== "reject") throw new Error("invalid action");
    return { id: uuid(d.id), action: d.action, note: d.note ? str(d.note, 500) : null };
  })
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await db.rpc("admin_review_withdrawal", {
      _actor: context.userId, _id: data.id, _action: data.action, _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return row;
  });

/* =====================  TASKS  ===================== */

export const adminSaveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string | null; patch: Record<string, unknown> }) => ({
    id: d.id ? uuid(d.id) : null, patch: d.patch ?? {},
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await db.from("link_tasks").update(data.patch as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("link_tasks").insert(data.patch as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { error } = await db.from("link_tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =====================  SETTINGS  ===================== */

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => ({
    key: str(d.key, 80), value: d.value,
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { error } = await db.from("site_settings").upsert({ key: data.key, value: data.value as never });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =====================  COMMUNITY  ===================== */

export const adminDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { error } = await db.from("community_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; reason: string; hours?: number }) => ({
    userId: uuid(d.userId), reason: str(d.reason, 300),
    hours: Math.min(Math.max(d.hours ?? 24, 1), 24 * 365),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const expires = new Date(Date.now() + data.hours * 3600_000).toISOString();
    const { error } = await db.from("community_bans").insert({
      user_id: data.userId, banned_by: context.userId, reason: data.reason, expires_at: expires,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* =====================  REPORTS  ===================== */

export const adminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { days?: number }) => ({ days: Math.min(Math.max(d?.days ?? 30, 1), 365) }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const [signups, revenue, withdrawals, taskComps] = await Promise.all([
      db.from("profiles").select("created_at").gte("created_at", since),
      db.from("user_packages").select("created_at, packages(price)").eq("status", "active").gte("created_at", since),
      db.from("withdrawals").select("created_at, amount, status").gte("created_at", since),
      db.from("task_submissions").select("created_at").eq("status", "approved").gte("created_at", since),
    ]);
    return {
      signups: signups.data ?? [],
      revenue: revenue.data ?? [],
      withdrawals: withdrawals.data ?? [],
      taskCompletions: taskComps.data ?? [],
    };
  });

export const adminTopUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data } = await db.from("profiles").select("id, full_name, total_earned, balance").order("total_earned", { ascending: false }).limit(10);
    return data ?? [];
  });

/* =====================  MONITOR  ===================== */

export const adminMonitor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const start = Date.now();
    const [users, errors] = await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("error_logs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    return {
      latencyMs: Date.now() - start,
      totalUsers: users.count ?? 0,
      errors: errors.data ?? [],
      checkedAt: new Date().toISOString(),
    };
  });

/* =====================  STORAGE  ===================== */

export const adminSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bucket: string; path: string }) => ({
    bucket: str(d.bucket, 80), path: str(d.path, 500),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    const { data: signed, error } = await db.storage.from(data.bucket).createSignedUrl(data.path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
