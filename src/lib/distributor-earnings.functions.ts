import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDistributorEarnings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { source?: string }) => ({ source: typeof d?.source === "string" ? d.source : "" }))
  .handler(async ({ data, context }) => {
    const { assertDistributor } = await import("./distributor-task-helpers.server");
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any).from("distributor_earnings").select("*")
      .eq("distributor_id", context.userId).order("created_at", { ascending: false }).limit(200);
    if (data.source) q = q.eq("source", data.source);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const bySource: Record<string, number> = {};
    let total = 0;
    for (const r of (rows ?? []) as Array<{ source: string; amount: number }>) {
      bySource[r.source] = (bySource[r.source] ?? 0) + Number(r.amount);
      total += Number(r.amount);
    }
    return { rows: rows ?? [], summary: { total, bySource } };
  });
