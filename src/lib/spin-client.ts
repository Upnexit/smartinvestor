import { supabase } from "@/integrations/supabase/client";

export interface SpinSlice {
  id: string;
  label: string;
  amount: number;
  color: string;
  text_color: string;
  weight: number;
  is_active: boolean;
  sort_order: number;
}

export interface SpinHistoryItem {
  id: string;
  user_id: string;
  won_amount: number;
  deposit_required: number;
  status: "pending_deposit" | "deposit_submitted" | "approved" | "rejected";
  payment_method: string | null;
  sender_number: string | null;
  trx_id: string | null;
  screenshot_url: string | null;
  admin_notes: string | null;
  slice_label: string | null;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    user_code: string | null;
    email: string | null;
  } | null;
}

export interface SpinEligibility {
  canSpin: boolean;
  remainingSeconds: number;
  lastSpinAt: string | null;
  totalSpins: number;
  balance: number;
  totalEarned: number;
}

/**
 * Fetch all active slices sorted by sort_order
 */
export async function getActiveSpinSlices(): Promise<SpinSlice[]> {
  const { data, error } = await supabase
    .from("spin_wheel_slices" as any)
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load spin slices:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    color: row.color,
    text_color: row.text_color || "#FFFFFF",
    weight: Number(row.weight),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order),
  }));
}

/**
 * Check user spin eligibility and remaining cooldown
 */
export async function getUserSpinEligibility(userId: string): Promise<SpinEligibility> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_spin_at, total_spins, balance, total_earned")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      canSpin: true,
      remainingSeconds: 0,
      lastSpinAt: null,
      totalSpins: 0,
      balance: 0,
      totalEarned: 0,
    };
  }

  const profile = data as any;
  const lastSpinAt = profile.last_spin_at ? new Date(profile.last_spin_at) : null;
  const totalSpins = profile.total_spins || 0;
  const balance = Number(profile.balance || 0);
  const totalEarned = Number(profile.total_earned || 0);

  if (!lastSpinAt) {
    return {
      canSpin: true,
      remainingSeconds: 0,
      lastSpinAt: null,
      totalSpins,
      balance,
      totalEarned,
    };
  }

  const cooldownMs = 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - lastSpinAt.getTime();
  const diffMs = cooldownMs - elapsedMs;

  if (diffMs > 0) {
    return {
      canSpin: false,
      remainingSeconds: Math.ceil(diffMs / 1000),
      lastSpinAt: lastSpinAt.toISOString(),
      totalSpins,
      balance,
      totalEarned,
    };
  }

  return {
    canSpin: true,
    remainingSeconds: 0,
    lastSpinAt: lastSpinAt.toISOString(),
    totalSpins,
    balance,
    totalEarned,
  };
}

/**
 * Execute spin for user
 */
export async function executeUserSpin(userId: string): Promise<{
  success: boolean;
  spin_id?: string;
  slice?: {
    id: string;
    label: string;
    amount: number;
    color: string;
    sort_order: number;
  };
  won_amount?: number;
  deposit_required?: number;
  remaining_seconds?: number;
  error?: string;
}> {
  const { data, error } = await supabase.rpc("execute_user_spin", {
    p_user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as any;
}

/**
 * Submit deposit details for a pending spin prize claim
 */
export async function submitSpinDeposit(params: {
  spinId: string;
  method: string;
  sender: string;
  trx: string;
  screenshot?: string | null;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const { data, error } = await supabase.rpc("submit_spin_deposit", {
    p_spin_id: params.spinId,
    p_method: params.method,
    p_sender: params.sender,
    p_trx: params.trx,
    p_screenshot: params.screenshot || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as any;
}

/**
 * Fetch a user's spin history
 */
export async function getUserSpinHistory(userId: string): Promise<SpinHistoryItem[]> {
  const { data, error } = await supabase
    .from("spin_history" as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load spin history:", error);
    return [];
  }
  return (data || []) as SpinHistoryItem[];
}

/* =========================================================
 * ADMIN FUNCTIONS
 * ========================================================= */

/**
 * Admin: List all slices (active & inactive)
 */
export async function listAllSlicesAdmin(): Promise<SpinSlice[]> {
  const { data, error } = await supabase
    .from("spin_wheel_slices" as any)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to load admin slices:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    color: row.color,
    text_color: row.text_color || "#FFFFFF",
    weight: Number(row.weight),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order),
  }));
}

/**
 * Admin: Save or update a slice
 */
export async function saveSliceAdmin(slice: Partial<SpinSlice> & { label: string; amount: number; color: string }): Promise<{ success: boolean; error?: string }> {
  if (slice.id) {
    const { error } = await (supabase.from("spin_wheel_slices" as any) as any)
      .update({
        label: slice.label,
        amount: slice.amount,
        color: slice.color,
        text_color: slice.text_color || "#FFFFFF",
        weight: slice.weight ?? 10,
        is_active: slice.is_active ?? true,
        sort_order: slice.sort_order ?? 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slice.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } else {
    const { error } = await (supabase.from("spin_wheel_slices" as any) as any)
      .insert({
        label: slice.label,
        amount: slice.amount,
        color: slice.color,
        text_color: slice.text_color || "#FFFFFF",
        weight: slice.weight ?? 10,
        is_active: slice.is_active ?? true,
        sort_order: slice.sort_order ?? 0,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }
}

/**
 * Admin: Delete a slice
 */
export async function deleteSliceAdmin(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("spin_wheel_slices" as any)
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Admin: List spin deposit claims
 */
export async function listSpinClaimsAdmin(filterStatus?: string): Promise<SpinHistoryItem[]> {
  let query = supabase
    .from("spin_history" as any)
    .select(`
      *,
      profiles:user_id (
        full_name,
        phone,
        user_code,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load spin claims:", error);
    return [];
  }
  return (data || []) as SpinHistoryItem[];
}

/**
 * Admin: Approve a spin deposit claim
 */
export async function approveSpinClaimAdmin(spinId: string, adminId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { data, error } = await supabase.rpc("admin_approve_spin", {
    p_spin_id: spinId,
    p_admin_id: adminId,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as any;
}

/**
 * Admin: Reject a spin deposit claim
 */
export async function rejectSpinClaimAdmin(spinId: string, adminId: string, reason: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const { data, error } = await supabase.rpc("admin_reject_spin", {
    p_spin_id: spinId,
    p_admin_id: adminId,
    p_reason: reason,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return data as any;
}
