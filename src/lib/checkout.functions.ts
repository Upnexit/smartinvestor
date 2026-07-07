import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const METHODS = new Set(["bkash", "nagad", "rocket"]);

type Method = "bkash" | "nagad" | "rocket";

function validatePhone(input: unknown): string {
  if (typeof input !== "string") return "not-provided";
  let n = input.replace(/\D/g, "");
  if (n.length === 13 && n.startsWith("880")) n = "0" + n.slice(3);
  return n || input.trim().slice(0, 40) || "not-provided";
}

function validateMethod(input: unknown): Method {
  if (typeof input !== "string" || !METHODS.has(input)) throw new Error("invalid method");
  return input as Method;
}

function validateTrx(input: unknown): string {
  const t = String(input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return t || `SUBMITTED${Date.now()}`;
}

function validateUuid(input: unknown): string {
  if (typeof input !== "string" || !/^[0-9a-f-]{36}$/i.test(input)) throw new Error("invalid id");
  return input;
}

export const createPendingCheckoutOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string; method: Method; senderNumber: string }) => ({
    packageId: validateUuid(data.packageId),
    method: validateMethod(data.method),
    senderNumber: validatePhone(data.senderNumber),
  }))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const { data: existing } = await context.supabase
      .from("user_packages")
      .select("id")
      .eq("user_id", userId)
      .eq("package_id", data.packageId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      await context.supabase
        .from("user_packages")
        .update({
          payment_method: data.method,
          sender_number: data.senderNumber,
        })
        .eq("id", existing.id);
      return { orderId: existing.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("user_packages")
      .insert({
        user_id: userId,
        package_id: data.packageId,
        payment_method: data.method,
        sender_number: data.senderNumber,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !inserted) throw new Error(error?.message ?? "order create failed");
    return { orderId: inserted.id };
  });

export const submitCheckoutPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { packageId: string; method: Method; senderNumber: string; trxId: string }) => ({
    packageId: validateUuid(data.packageId),
    method: validateMethod(data.method),
    senderNumber: validatePhone(data.senderNumber),
    trxId: validateTrx(data.trxId),
  }))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // find or create pending/rejected order
    const { data: existing } = await context.supabase
      .from("user_packages")
      .select("id, status")
      .eq("user_id", userId)
      .eq("package_id", data.packageId)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let orderId = existing?.id;
    if (!orderId) {
      const { data: inserted, error } = await context.supabase
        .from("user_packages")
        .insert({
          user_id: userId,
          package_id: data.packageId,
          payment_method: data.method,
          sender_number: data.senderNumber,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "order create failed");
      orderId = inserted.id;
    }

    const { error: updErr } = await context.supabase
      .from("user_packages")
      .update({
        trx_id: data.trxId,
        payment_txn: data.trxId,
        payment_method: data.method,
        sender_number: data.senderNumber,
        submitted_at: new Date().toISOString(),
        status: "pending",
        rejection_reason: null,
      })
      .eq("id", orderId);

    if (updErr) throw new Error(updErr.message);
    return { orderId, status: "pending" as const };
  });

async function notifyPackageDecision(
  orderId: string,
  action: "approve" | "reject",
  reason?: string,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_packages")
      .select("user_id, packages(name, price)")
      .eq("id", orderId)
      .maybeSingle();
    const r = data as { user_id?: string; packages?: { name?: string; price?: number } | null } | null;
    if (!r?.user_id) return;
    const { notifyUserTelegram } = await import("./telegram.server");
    const pkgName = r.packages?.name ?? "Package";
    const price = Number(r.packages?.price ?? 0).toFixed(0);
    if (action === "approve") {
      await notifyUserTelegram(
        r.user_id,
        `✅ <b>প্যাকেজ অ্যাক্টিভেট হয়েছে!</b>\n\n📦 প্যাকেজ: <b>${pkgName}</b>\n💰 মূল্য: ৳${price}\n\nএখন থেকে দৈনিক আয় শুরু 🎉\nDashboard-এ গিয়ে টাস্ক শুরু করুন।`,
      );
    } else {
      const rsn = reason ? `\n\n📝 কারণ: ${reason}` : "";
      await notifyUserTelegram(
        r.user_id,
        `❌ <b>প্যাকেজ অর্ডার বাতিল হয়েছে</b>\n\n📦 প্যাকেজ: <b>${pkgName}</b>${rsn}\n\nসঠিক Transaction ID দিয়ে আবার চেষ্টা করুন।`,
      );
    }
  } catch (e) {
    console.warn("telegram notify (package) failed:", (e as Error).message);
  }
}

export const adminApprovePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => ({ orderId: validateUuid(data.orderId) }))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_review_user_package", {
      _actor_user_id: context.userId,
      _order_id: data.orderId,
      _action: "approve",
      _reason: undefined,
    });
    if (error) throw new Error(error.message);
    await notifyPackageDecision(data.orderId, "approve");
    return result;
  });

export const adminRejectPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason: string }) => {
    const reason = String(data.reason ?? "").trim();
    if (reason.length < 3) throw new Error("reason must be at least 3 characters");
    return { orderId: validateUuid(data.orderId), reason };
  })
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_review_user_package", {
      _actor_user_id: context.userId,
      _order_id: data.orderId,
      _action: "reject",
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await notifyPackageDecision(data.orderId, "reject", data.reason);
    return result;
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: Boolean(data) };
  });
