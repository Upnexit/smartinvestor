// Direct client-side admin operations using Supabase.
// Bypasses server functions entirely — admin RLS policies + security-definer
// RPCs do the access control. This is the simplest reliable path because the
// browser already has an authenticated session.

import { supabase } from "@/integrations/supabase/client";

type DistributorInput = {
  email: string;
  password?: string;
  full_name: string;
  phone?: string | null;
  payment_method?: string | null;
  payment_number?: string | null;
  district?: string | null;
  thana?: string | null;
  address?: string | null;
  commission_rate?: number;
  status?: string;
  notes?: string | null;
};

async function actorId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("লগইন প্রয়োজন");
  return data.user.id;
}

/* ============ USERS ============ */

export async function listUsers(q: string) {
  // Exclude distributors from user management list
  const { data: distRoleRows } = await supabase
    .from("user_roles")
    .select("user_id")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("role", "distributor" as any);
  const distIds = ((distRoleRows ?? []) as { user_id: string }[]).map((r) => r.user_id);

  let req = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (distIds.length) {
    req = req.not("id", "in", `(${distIds.join(",")})`);
  }
  const s = q.trim();
  if (s) {
    const esc = s.replace(/[%,()]/g, "");
    const parts = [
      `full_name.ilike.%${esc}%`,
      `email.ilike.%${esc}%`,
      `phone.ilike.%${esc}%`,
      `user_code.ilike.%${esc}%`,
      `referral_code.ilike.%${esc}%`,
    ];
    req = req.or(parts.join(","));
  }
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  return rows.map((r) => ({ ...r, is_distributor: false }));
}

export async function getUserBundle(userId: string) {
  const [profile, packages, withdrawals, tasks, refs, referredUsers, totalRefCount, totalRefEarned] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_packages").select("*, packages(name,price)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("task_submissions").select("*, link_tasks(title,reward)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("referral_earnings").select("*").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id,full_name,email,phone,user_code,created_at,total_earned").eq("referred_by", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    supabase.from("referral_earnings").select("amount").eq("referrer_id", userId),
  ]);
  const earnedSum = (totalRefEarned.data ?? []).reduce((s: number, r: { amount: number | string | null }) => s + Number(r.amount || 0), 0);
  return {
    profile: profile.data,
    packages: packages.data ?? [],
    withdrawals: withdrawals.data ?? [],
    tasks: tasks.data ?? [],
    referrals: refs.data ?? [],
    referredUsers: referredUsers.data ?? [],
    referralCount: totalRefCount.count ?? 0,
    referralEarnedTotal: earnedSum,
  };
}

export async function updateUser(userId: string, patch: Record<string, unknown>) {
  const a = await actorId();
  const { data, error } = await supabase.rpc("admin_update_user_profile", {
    _actor: a, _user_id: userId, _patch: patch as never,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteUser(userId: string) {
  // 1) Purge public-schema rows via security-definer RPC (admin check inside).
  const a = await actorId();
  const { error: rpcErr } = await supabase.rpc("admin_delete_user_data", {
    _actor: a, _user_id: userId,
  });
  if (rpcErr) throw new Error(rpcErr.message);

  // 2) Best-effort remove the auth.users row via server fn (service-role).
  //    Public data is already gone — a server-fn env race here shouldn't fail the whole op.
  try {
    const { adminHardDeleteUser } = await import("@/lib/admin.functions");
    await adminHardDeleteUser({ data: { userId } } as never);
  } catch (e) {
    console.warn("[deleteUser] auth.users cleanup skipped:", e);
  }
}

export async function setUserStatus(userId: string, status: "active" | "suspended" | "banned", reason?: string) {
  const a = await actorId();
  const { data, error } = await supabase.rpc("admin_set_user_status", {
    _actor: a, _user_id: userId, _status: status, _reason: reason ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ============ DISTRIBUTORS ============ */

function cleanSearch(value: string) {
  return value.trim().replace(/[%,()]/g, "").slice(0, 80);
}

function normalizeDistributorPatch(input: DistributorInput) {
  return {
    full_name: input.full_name?.trim() ?? "",
    email: input.email?.trim().toLowerCase() ?? "",
    phone: input.phone?.trim() || null,
    payment_method: ["bkash", "nagad", "rocket"].includes(String(input.payment_method)) ? input.payment_method : "bkash",
    payment_number: input.payment_number?.trim() || null,
    district: input.district?.trim() || null,
    thana: input.thana?.trim() || null,
    address: input.address?.trim() || null,
    commission_rate: Math.min(Math.max(Number(input.commission_rate ?? 5), 0), 100),
    status: input.status ?? "active",
    notes: input.notes?.trim() || null,
  };
}

export async function listDistributors(q: string) {
  let req = supabase.from("distributors").select("*").order("created_at", { ascending: false }).limit(500);
  const s = cleanSearch(q);
  if (s) {
    req = req.or([
      `full_name.ilike.%${s}%`,
      `email.ilike.%${s}%`,
      `phone.ilike.%${s}%`,
      `district.ilike.%${s}%`,
      `thana.ilike.%${s}%`,
    ].join(","));
  }
  const { data, error } = await req;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = rows.map((r) => r.user_id).filter(Boolean);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: profiles, error: countError } = await supabase
      .from("profiles")
      .select("distributor_id")
      .in("distributor_id", ids);
    if (countError) throw new Error(countError.message);
    for (const profile of profiles ?? []) {
      const id = profile.distributor_id;
      if (id) counts[id] = (counts[id] ?? 0) + 1;
    }
  }

  return rows.map((row) => ({ ...row, users_count: counts[row.user_id] ?? 0 }));
}

export async function createDistributor(input: DistributorInput) {
  if (!input.password || input.password.length < 6) {
    throw new Error("পাসওয়ার্ড ৬+ অক্ষর হতে হবে");
  }
  const actor = await actorId();
  const patch = normalizeDistributorPatch(input);

  // Create via Supabase Edge Function instead of TanStack server fn so the
  // service-role secret is read in Supabase runtime, avoiding local preview
  // "Missing Supabase environment variable" failures.
  try {
    const { data, error } = await supabase.functions.invoke("admin-create-distributor", {
      body: {
        actor,
        password: input.password,
        ...patch,
      },
    } as never);
    const serverError = (data as { error?: string } | null)?.error;
    if (error || serverError) throw new Error(serverError || error?.message || "ডিস্ট্রিবিউটর তৈরি ব্যর্থ");
    return (data as { distributor?: unknown } | null)?.distributor ?? data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/already|registered|exists|user_exists|duplicate/i.test(msg)) {
      throw new Error("এই ইমেইল আগে থেকেই ব্যবহার করা হয়েছে");
    }
    if (/forbidden|unauthorized|jwt|admin/i.test(msg)) {
      throw new Error("শুধু অ্যাডমিন নতুন ডিস্ট্রিবিউটর তৈরি করতে পারবেন");
    }
    if (/rate limit|email rate/i.test(msg)) {
      throw new Error("ইমেইল rate limit — কিছুক্ষণ পরে আবার চেষ্টা করুন");
    }
    if (/Missing Supabase environment/i.test(msg)) {
      throw new Error("সার্ভার সংযোগ প্রস্তুত নয় — পেজ রিফ্রেশ করে আবার চেষ্টা করুন");
    }
    throw new Error(msg);
  }
}


export async function updateDistributor(userId: string, input: DistributorInput) {
  const actor = await actorId();
  const { data, error } = await supabase.rpc("admin_upsert_distributor", {
    _actor: actor,
    _user_id: userId,
    _patch: normalizeDistributorPatch(input) as never,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDistributor(userId: string) {
  const actor = await actorId();
  const { error } = await supabase.rpc("admin_delete_distributor", {
    _actor: actor,
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
}

export async function getMyDistributorBundle() {
  const userId = await actorId();
  const [profileRes, statsRes] = await Promise.all([
    supabase.from("distributors").select("*").eq("user_id", userId).maybeSingle(),
    supabase.rpc("distributor_stats", { _user_id: userId }),
  ]);
  if (profileRes.error) throw new Error(profileRes.error.message);
  if (statsRes.error) throw new Error(statsRes.error.message);
  return { profile: profileRes.data, stats: statsRes.data };
}

export async function listMyDistributorUsers(q: string) {
  const userId = await actorId();
  let req = supabase
    .from("profiles")
    .select("*")
    .eq("distributor_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  const s = cleanSearch(q);
  if (s) {
    req = req.or([
      `full_name.ilike.%${s}%`,
      `email.ilike.%${s}%`,
      `phone.ilike.%${s}%`,
      `user_code.ilike.%${s}%`,
    ].join(","));
  }
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateMyDistributorProfile(patch: Record<string, unknown>) {
  const userId = await actorId();
  const allowed = ["full_name", "phone", "payment_method", "payment_number", "district", "thana", "address"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in patch) filtered[key] = patch[key];
  }
  const { data, error } = await supabase
    .from("distributors")
    .update(filtered as never)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/* ============ PACKAGES ============ */

export async function listPackages() {
  const { data, error } = await supabase.from("packages").select("*").order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function savePackage(id: string | null, patch: Record<string, unknown>) {
  const a = await actorId();
  const { data, error } = await supabase.rpc("admin_save_package", {
    _actor: a, _id: id as string, _patch: patch as never,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function togglePackage(id: string, active: boolean) {
  const a = await actorId();
  const { error } = await supabase.rpc("admin_toggle_package", { _actor: a, _id: id, _active: active });
  if (error) throw new Error(error.message);
}

export async function deletePackage(id: string) {
  const a = await actorId();
  const { error } = await supabase.rpc("admin_delete_package", { _actor: a, _id: id });
  if (error) throw new Error(error.message);
}

/* ============ WITHDRAWALS ============ */

export async function reviewWithdrawal(id: string, action: "approve" | "reject", note?: string) {
  const a = await actorId();
  const { data, error } = await supabase.rpc("admin_review_withdrawal", {
    _actor: a, _id: id, _action: action, _note: note ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ============ PACKAGE ORDERS (approvals) ============ */

export async function reviewOrder(orderId: string, action: "approve" | "reject", reason?: string) {
  const a = await actorId();
  const { data, error } = await supabase.rpc("admin_review_user_package", {
    _actor_user_id: a, _order_id: orderId, _action: action, _reason: reason ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ============ SETTINGS ============ */

export async function saveSetting(key: string, value: unknown) {
  const { error } = await supabase.from("site_settings").upsert({ key, value: value as never });
  if (error) throw new Error(error.message);
}

/* ============ TASKS ============ */

export async function saveTask(id: string | null, patch: Record<string, unknown>) {
  if (id) {
    const { error } = await supabase.from("link_tasks").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("link_tasks").insert(patch as never);
    if (error) throw new Error(error.message);
  }
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("link_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ============ COMMUNITY ============ */

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("community_messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function banUser(userId: string, reason: string, hours: number) {
  const a = await actorId();
  const expires = new Date(Date.now() + hours * 3600_000).toISOString();
  const { error } = await supabase.from("community_bans").insert({
    user_id: userId, banned_by: a, reason, expires_at: expires,
  });
  if (error) throw new Error(error.message);
}

/* ============ STORAGE (signed URL) ============ */

export async function signedUrl(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ============ REALTIME helper ============ */

export function subscribeTable(table: string, cb: () => void) {
  const ch = supabase.channel(`rt-${table}-${Math.random().toString(36).slice(2,8)}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, cb)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
