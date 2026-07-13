import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;
const UUID = /^[0-9a-f-]{36}$/i;

async function assertDistributor(db: Db, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await db.rpc("has_role" as any, { _user_id: userId, _role: "distributor" as any });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}
function uuid(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("invalid id");
  return v;
}
function todayBD(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* All active packages + counts */
export const listDistributorPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertDistributor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: pkgs }, { data: tasks }, { data: counts }] = await Promise.all([
      supabaseAdmin.from("packages").select("id,name,price,daily_tasks,daily_income,duration_days,active")
        .eq("active", true).order("price"),
      supabaseAdmin.from("link_tasks").select("id,required_package_id,active,is_draft,scheduled_date,created_by_distributor"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any).rpc("packages_active_user_counts"),
    ]);

    const today = todayBD();
    const perPkg = new Map<string, { total: number; todayActive: number; mine: number }>();
    (tasks ?? []).forEach((t) => {
      const key = t.required_package_id ?? "";
      if (!key) return;
      const cur = perPkg.get(key) ?? { total: 0, todayActive: 0, mine: 0 };
      cur.total += 1;
      if (t.active && !t.is_draft && t.scheduled_date === today) cur.todayActive += 1;
      if (t.created_by_distributor === context.userId) cur.mine += 1;
      perPkg.set(key, cur);
    });

    const activeUsers = new Map<string, number>();
    ((counts ?? []) as Array<{ package_id: string; active_users: number }>).forEach((r) =>
      activeUsers.set(r.package_id, r.active_users));

    return { packages: pkgs ?? [], perPkg: Object.fromEntries(perPkg), activeUsers: Object.fromEntries(activeUsers) };
  });

/* List tasks for a package on a date */
export const listPackageTasksForDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string; date: string }) => ({
    packageId: uuid(d.packageId),
    date: typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : todayBD(),
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: pkg }, { data: tasks }, { data: cnt }] = await Promise.all([
      supabaseAdmin.from("packages").select("id,name,price,daily_tasks,daily_income,duration_days,active")
        .eq("id", data.packageId).maybeSingle(),
      supabaseAdmin.from("link_tasks").select("*")
        .eq("required_package_id", data.packageId).eq("scheduled_date", data.date)
        .order("created_at", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin as any).rpc("package_active_user_count", { _pkg: data.packageId }),
    ]);
    return { pkg, tasks: tasks ?? [], activeUserCount: Number(cnt ?? 0), userId: context.userId };
  });

/* Bulk insert drafts for a package (distributor-authored) */
type NewTask = { title: string; link_url: string; action_type: string; description?: string | null };
export const distributorBulkInsertPackageTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string; date: string; tasks: NewTask[]; perReward: number }) => ({
    packageId: uuid(d.packageId),
    date: typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : todayBD(),
    perReward: Math.max(0.1, Math.min(500, Number(d.perReward) || 2)),
    tasks: (Array.isArray(d.tasks) ? d.tasks : []).slice(0, 200).map((t) => ({
      title: String(t?.title ?? "").slice(0, 200),
      link_url: String(t?.link_url ?? "").slice(0, 500),
      action_type: String(t?.action_type ?? "like").slice(0, 30),
      description: t?.description ? String(t.description).slice(0, 2000) : null,
    })).filter((t) => t.title && t.link_url),
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    if (!data.tasks.length) throw new Error("কোনো task নেই");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.tasks.map((t) => ({
      title: t.title,
      link_url: t.link_url,
      action_type: t.action_type,
      description: t.description,
      reward: data.perReward,
      category: "facebook",
      daily_limit: 1,
      active: false,
      is_draft: true,
      scheduled_date: data.date,
      required_package_id: data.packageId,
      created_by_distributor: context.userId,
    }));
    const { data: inserted, error } = await supabaseAdmin.from("link_tasks").insert(rows).select();
    if (error) throw new Error(error.message);
    return inserted ?? [];
  });

/* Activate my drafts in a package on a date */
export const distributorActivateOwnDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string; date: string }) => ({
    packageId: uuid(d.packageId),
    date: typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : todayBD(),
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("link_tasks")
      .update({ is_draft: false, active: true })
      .eq("required_package_id", data.packageId)
      .eq("scheduled_date", data.date)
      .eq("created_by_distributor", context.userId)
      .eq("is_draft", true)
      .select("id");
    if (error) throw new Error(error.message);
    return { activated: rows?.length ?? 0 };
  });

/* Toggle / update own task */
export const distributorUpdateOwnLinkTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => ({ id: uuid(d.id), patch: d.patch ?? {} }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const allowed = ["title", "link_url", "reward", "action_type", "active", "is_draft", "description"];
    const patch: Record<string, unknown> = {};
    for (const k of allowed) if (k in data.patch) patch[k] = data.patch[k];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("link_tasks")
      .update(patch).eq("id", data.id).eq("created_by_distributor", context.userId)
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not your task");
    return row;
  });

export const distributorDeleteOwnLinkTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("link_tasks")
      .delete().eq("id", data.id).eq("created_by_distributor", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const distributorDeleteOwnDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { packageId: string; date: string }) => ({
    packageId: uuid(d.packageId),
    date: typeof d.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : todayBD(),
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("link_tasks").delete()
      .eq("required_package_id", data.packageId)
      .eq("scheduled_date", data.date)
      .eq("created_by_distributor", context.userId)
      .eq("is_draft", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
