// Direct client-side admin operations using Supabase.
// Bypasses server functions entirely — admin RLS policies + security-definer
// RPCs do the access control. This is the simplest reliable path because the
// browser already has an authenticated session.

import { supabase } from "@/integrations/supabase/client";

async function actorId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("লগইন প্রয়োজন");
  return data.user.id;
}

/* ============ USERS ============ */

export async function listUsers(q: string) {
  let req = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
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
    if (/^[0-9a-fA-F-]+$/.test(esc)) parts.push(`id::text.ilike.${esc}%`);
    req = req.or(parts.join(","));
  }
  const { data, error } = await req;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserBundle(userId: string) {
  const [profile, packages, withdrawals, tasks, refs] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_packages").select("*, packages(name,price)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("task_submissions").select("*, link_tasks(title,reward)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("referral_earnings").select("*").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  return {
    profile: profile.data,
    packages: packages.data ?? [],
    withdrawals: withdrawals.data ?? [],
    tasks: tasks.data ?? [],
    referrals: refs.data ?? [],
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
  const a = await actorId();
  const { error } = await supabase.rpc("admin_delete_user_data", { _actor: a, _user_id: userId });
  if (error) throw new Error(error.message);
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
