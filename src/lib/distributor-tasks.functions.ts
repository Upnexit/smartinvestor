import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID = /^[0-9a-f-]{36}$/i;
function uuid(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("invalid id");
  return v;
}

/* Generate a batch of AI-drafted tasks */
export const generateDistributorTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { count?: number; keyword?: string; reward?: number }) => ({
    count: Math.min(Math.max(Number(d?.count ?? 5), 1), 20),
    keyword: String(d?.keyword ?? "").slice(0, 120),
    reward: Math.min(Math.max(Number(d?.reward ?? 2), 0.5), 50),
  }))
  .handler(async ({ data, context }) => {
    const { assertDistributor, generateFacebookTaskBatch } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI configured নেই — অ্যাডমিনকে জানান");

    const items = await generateFacebookTaskBatch(data.count, data.keyword, key);
    const rows = items.map((it) => ({
      distributor_id: context.userId,
      title: it.title,
      fb_page_url: it.fb_page_url,
      action_type: it.action_type,
      instruction: it.instruction,
      reward: data.reward,
      status: "draft",
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (context.supabase as any)
      .from("distributor_tasks").insert(rows).select();
    if (error) throw new Error(error.message);
    return inserted ?? [];
  });

export const listDistributorTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) => ({ status: typeof d?.status === "string" ? d.status : "" }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any).from("distributor_tasks").select("*")
      .eq("distributor_id", context.userId).order("created_at", { ascending: false }).limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const verifyDistributorTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("distributor_tasks")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", data.id).eq("distributor_id", context.userId)
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAndRegenerateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; keyword?: string; reward?: number }) => ({
    id: uuid(d.id),
    keyword: String(d?.keyword ?? "").slice(0, 120),
    reward: Math.min(Math.max(Number(d?.reward ?? 2), 0.5), 50),
  }))
  .handler(async ({ data, context }) => {
    const { assertDistributor, generateFacebookTaskBatch } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // Delete first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dErr } = await (context.supabase as any)
      .from("distributor_tasks").delete().eq("id", data.id).eq("distributor_id", context.userId);
    if (dErr) throw new Error(dErr.message);

    // Generate 1 new
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI configured নেই");
    const items = await generateFacebookTaskBatch(1, data.keyword, key);
    if (!items.length) throw new Error("regenerate failed");
    const it = items[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error } = await (context.supabase as any)
      .from("distributor_tasks").insert({
        distributor_id: context.userId,
        title: it.title,
        fb_page_url: it.fb_page_url,
        action_type: it.action_type,
        instruction: it.instruction,
        reward: data.reward,
        status: "draft",
      }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteDistributorTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("distributor_tasks").delete().eq("id", data.id).eq("distributor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Publish a verified task → creates a link_tasks row for referred users */
export const publishDistributorTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: draft, error: dErr } = await (context.supabase as any)
      .from("distributor_tasks").select("*").eq("id", data.id)
      .eq("distributor_id", context.userId).maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!draft) throw new Error("task not found");
    if (draft.status !== "verified") throw new Error("verify করার পর publish করুন");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pub, error: pErr } = await (context.supabase as any)
      .from("link_tasks").insert({
        title: draft.title,
        link_url: draft.fb_page_url,
        action_type: draft.action_type,
        reward: draft.reward,
        description: draft.instruction,
        category: "facebook",
        daily_limit: 1,
        active: true,
        is_draft: false,
        created_by_distributor: context.userId,
      }).select().maybeSingle();
    if (pErr) throw new Error(pErr.message);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (context.supabase as any).from("distributor_tasks").update({
      status: "published",
      published_at: new Date().toISOString(),
      published_task_id: pub?.id,
    }).eq("id", data.id);

    return pub;
  });

/* Get referred active users summary */
export const getReferredActiveUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profs } = await (context.supabase as any)
      .from("profiles").select("id, user_code, full_name")
      .eq("distributor_id", context.userId).limit(500);
    const ids = (profs ?? []).map((p: { id: string }) => p.id);
    if (!ids.length) return { total: 0, active: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pkgs } = await (context.supabase as any)
      .from("user_packages").select("user_id").eq("status", "active").in("user_id", ids);
    const activeSet = new Set<string>(((pkgs ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    const active = (profs ?? []).filter((p: { id: string }) => activeSet.has(p.id))
      .map((p: { id: string; user_code: string }) => ({ id: p.id, user_code: p.user_code }));
    return { total: active.length, active };
  });

/* Update daily task limit setting */
export const updateDailyTaskLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit: number }) => ({
    limit: Math.min(Math.max(Number(d?.limit ?? 5), 1), 20),
  }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("distributors").update({ daily_task_limit: data.limit })
      .eq("user_id", context.userId).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
