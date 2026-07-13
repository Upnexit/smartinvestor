import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENT_TYPES = [
  "distributor_task_generated",
  "distributor_task_activated",
  "distributor_task_deleted",
] as const;

export type DistributorActivityRow = {
  id: string;
  event_type: string;
  created_at: string;
  meta: Record<string, unknown>;
  user_id: string;
  distributor_name: string | null;
  distributor_email: string | null;
  package_name: string | null;
};

export const listDistributorTaskActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { date?: string; distributorId?: string; eventType?: string }) => ({
    date: typeof d?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : "",
    distributorId: typeof d?.distributorId === "string" ? d.distributorId : "",
    eventType: typeof d?.eventType === "string" ? d.eventType : "",
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./distributor-task-helpers.server");
    await assertAdmin(context.supabase, context.userId);

    let q = context.supabase
      .from("activity_logs")
      .select("id,event_type,created_at,meta,user_id")
      .in("event_type", data.eventType ? [data.eventType] : (EVENT_TYPES as unknown as string[]))
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.date) {
      const dayStartISO = new Date(`${data.date}T00:00:00+06:00`).toISOString();
      const dayEndISO = new Date(`${data.date}T23:59:59.999+06:00`).toISOString();
      q = q.gte("created_at", dayStartISO).lte("created_at", dayEndISO);
    }
    if (data.distributorId) q = q.eq("user_id", data.distributorId);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((logs ?? []).map((l) => l.user_id)));
    const pkgIds = Array.from(new Set(
      (logs ?? []).map((l) => (l.meta as { package_id?: string } | null)?.package_id).filter(Boolean) as string[],
    ));

    const [{ data: profiles }, { data: pkgs }] = await Promise.all([
      userIds.length
        ? context.supabase.from("profiles").select("id,full_name,email,user_code").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null; user_code: string | null }> }),
      pkgIds.length
        ? context.supabase.from("packages").select("id,name,price").in("id", pkgIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; price: number }> }),
    ]);

    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const pkgMap = new Map((pkgs ?? []).map((p) => [p.id, p]));

    const rows: DistributorActivityRow[] = (logs ?? []).map((l) => {
      const p = pmap.get(l.user_id);
      const m = (l.meta ?? {}) as { package_id?: string };
      const pk = m.package_id ? pkgMap.get(m.package_id) : undefined;
      return {
        id: l.id,
        event_type: l.event_type,
        created_at: l.created_at,
        meta: (l.meta ?? {}) as Record<string, unknown>,
        user_id: l.user_id,
        distributor_name: p?.full_name ?? p?.user_code ?? null,
        distributor_email: p?.email ?? null,
        package_name: pk?.name ?? null,
      };
    });

    // Aggregate stats
    const byDistributor = new Map<string, { name: string | null; email: string | null; generated: number; activated: number; deleted: number; totalAmount: number; lastAt: string }>();
    let totGenerated = 0, totActivated = 0, totDeleted = 0, totAmount = 0;
    for (const r of rows) {
      const cur = byDistributor.get(r.user_id) ?? { name: r.distributor_name, email: r.distributor_email, generated: 0, activated: 0, deleted: 0, totalAmount: 0, lastAt: r.created_at };
      const m = r.meta as { count?: number; total_amount?: number };
      if (r.event_type === "distributor_task_generated") { cur.generated += Number(m.count ?? 0); totGenerated += Number(m.count ?? 0); }
      if (r.event_type === "distributor_task_activated") {
        cur.activated += Number(m.count ?? 0); totActivated += Number(m.count ?? 0);
        cur.totalAmount += Number(m.total_amount ?? 0); totAmount += Number(m.total_amount ?? 0);
      }
      if (r.event_type === "distributor_task_deleted") { cur.deleted += 1; totDeleted += 1; }
      if (r.created_at > cur.lastAt) cur.lastAt = r.created_at;
      byDistributor.set(r.user_id, cur);
    }

    // Distributor list for filter
    const { data: allDist } = await context.supabase
      .from("distributors")
      .select("user_id,full_name,email")
      .order("full_name");

    return {
      rows,
      totals: { generated: totGenerated, activated: totActivated, deleted: totDeleted, amount: Math.round(totAmount * 100) / 100 },
      byDistributor: Array.from(byDistributor.entries()).map(([id, v]) => ({ user_id: id, ...v })),
      distributors: (allDist ?? []) as Array<{ user_id: string; full_name: string | null; email: string | null }>,
    };
  });
