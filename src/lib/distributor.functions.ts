import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function uuid(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("invalid id");
  return v;
}
function str(v: unknown, max = 200, min = 0): string {
  if (typeof v !== "string") throw new Error("invalid string");
  const s = v.trim();
  if (s.length < min || s.length > max) throw new Error("invalid string length");
  return s;
}
function opt(v: unknown, max = 200): string | null {
  if (v === undefined || v === null || v === "") return null;
  return str(v, max);
}

type Db = SupabaseClient<Database>;

async function assertAdmin(db: Db, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
  return db;
}

async function assertDistributor(db: Db, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await db.rpc("has_role" as any, { _user_id: userId, _role: "distributor" as any });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
  return db;
}

/* =========  ADMIN  ========= */

export const adminListDistributors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string; limit?: number }) => ({
    q: typeof d?.q === "string" ? d.q.trim().slice(0, 80) : "",
    limit: Math.min(Math.max(d?.limit ?? 200, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (db as any).from("distributors").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.q) q = q.or(`full_name.ilike.%${data.q}%,email.ilike.%${data.q}%,phone.ilike.%${data.q}%,district.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    // attach user counts
    const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: profs } = await db.from("profiles").select("distributor_id").in("distributor_id", ids);
      counts = ((profs ?? []) as { distributor_id: string }[]).reduce<Record<string, number>>((acc, p) => {
        acc[p.distributor_id] = (acc[p.distributor_id] ?? 0) + 1; return acc;
      }, {});
    }
    return (rows ?? []).map((r: Record<string, unknown>) => ({ ...r, users_count: counts[r.user_id as string] ?? 0 }));
  });

export const adminCreateDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => {
    const email = str(d.email, 200, 5).toLowerCase();
    if (!EMAIL.test(email)) throw new Error("invalid email");
    return {
      email,
      password: str(d.password, 72, 6),
      full_name: str(d.full_name, 120, 2),
      phone: opt(d.phone, 30),
      payment_method: ["bkash", "nagad", "rocket"].includes(d.payment_method as string)
        ? (d.payment_method as string) : "bkash",
      payment_number: opt(d.payment_number, 30),
      district: opt(d.district, 60),
      thana: opt(d.thana, 60),
      address: opt(d.address, 300),
      commission_rate: Math.min(Math.max(Number(d.commission_rate ?? 5), 0), 100),
      notes: opt(d.notes, 500),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Create auth user (email confirmed)
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone ?? "", role: "distributor" },
    });
    if (cErr || !created?.user) throw new Error(cErr?.message ?? "auth create failed");

    const newUserId = created.user.id;
    // Wait briefly for handle_new_user trigger
    await new Promise((r) => setTimeout(r, 250));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any).rpc("admin_upsert_distributor", {
      _actor: context.userId,
      _user_id: newUserId,
      _patch: {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        payment_method: data.payment_method,
        payment_number: data.payment_number,
        district: data.district,
        thana: data.thana,
        address: data.address,
        commission_rate: data.commission_rate,
        status: "active",
        notes: data.notes,
      },
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdateDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; patch: Record<string, unknown> }) => ({
    userId: uuid(d.userId), patch: d.patch ?? {},
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any).rpc("admin_upsert_distributor", {
      _actor: context.userId, _user_id: data.userId, _patch: data.patch as never,
    });
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteDistributor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; deleteAuth?: boolean }) => ({
    userId: uuid(d.userId), deleteAuth: !!d.deleteAuth,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("admin_delete_distributor", {
      _actor: context.userId, _user_id: data.userId,
    });
    if (error) throw new Error(error.message);
    if (data.deleteAuth) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.auth.admin.deleteUser(data.userId);
      } catch (e) { console.warn("auth delete failed", e); }
    }
    return { ok: true };
  });

/* =========  DISTRIBUTOR (SELF)  ========= */

export const distributorGetMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertDistributor(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (context.supabase as any)
      .from("distributors").select("*").eq("user_id", context.userId).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: stats } = await (context.supabase as any).rpc("distributor_stats", { _user_id: context.userId });
    return { profile, stats };
  });

export const distributorListMyUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q?: string }) => ({ q: typeof d?.q === "string" ? d.q.trim().slice(0, 80) : "" }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    let q = context.supabase.from("profiles").select("*").eq("distributor_id", context.userId).order("created_at", { ascending: false });
    if (data.q) q = q.or(`full_name.ilike.%${data.q}%,email.ilike.%${data.q}%,phone.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const distributorUpdateMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patch: Record<string, unknown> }) => ({ patch: d.patch ?? {} }))
  .handler(async ({ data, context }) => {
    await assertDistributor(context.supabase, context.userId);
    const allowed = ["full_name", "phone", "payment_method", "payment_number", "district", "thana", "address"];
    const filtered: Record<string, unknown> = {};
    for (const k of allowed) if (k in data.patch) filtered[k] = data.patch[k];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (context.supabase as any)
      .from("distributors").update(filtered).eq("user_id", context.userId).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
