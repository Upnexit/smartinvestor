import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;
const UUID = /^[0-9a-f-]{36}$/i;
const STATUSES = ["new", "contacted", "interested", "converted", "dropped"] as const;

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

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; q?: string }) => ({
    status: typeof d?.status === "string" ? d.status : "",
    q: typeof d?.q === "string" ? d.q.trim().slice(0, 80) : "",
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (context.supabase as any).from("distributor_leads").select("*")
      .eq("distributor_id", context.userId).order("created_at", { ascending: false }).limit(500);
    if (data.status) q = q.eq("status", data.status);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,phone.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => ({
    name: String(d?.name ?? "").trim().slice(0, 120),
    phone: d?.phone ? String(d.phone).trim().slice(0, 30) : null,
    source: d?.source ? String(d.source).trim().slice(0, 60) : null,
    status: (STATUSES as readonly string[]).includes(d?.status as string) ? (d.status as string) : "new",
    notes: d?.notes ? String(d.notes).trim().slice(0, 1000) : null,
    next_followup_at: d?.next_followup_at ? String(d.next_followup_at) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    if (!data.name) throw new Error("নাম দিন");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any).from("distributor_leads")
      .insert({ ...data, distributor_id: context.userId }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Record<string, unknown> }) => ({ id: uuid(d.id), patch: d.patch ?? {} }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const allowed = ["name", "phone", "source", "status", "notes", "next_followup_at"];
    const filtered: Record<string, unknown> = {};
    for (const k of allowed) if (k in data.patch) filtered[k] = data.patch[k];
    if (filtered.status && !(STATUSES as readonly string[]).includes(filtered.status as string)) throw new Error("invalid status");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any).from("distributor_leads")
      .update(filtered).eq("id", data.id).eq("distributor_id", context.userId).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: uuid(d.id) }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("distributor_leads")
      .delete().eq("id", data.id).eq("distributor_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
