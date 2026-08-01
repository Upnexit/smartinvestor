import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PaymentMethod = "bkash" | "nagad" | "rocket";

export const submitDistributorPackageOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { packageId: string; method: PaymentMethod; senderNumber: string; trxId: string }) => {
    const packageId = String(input.packageId ?? "");
    const method = input.method;
    const senderNumber = String(input.senderNumber ?? "").replace(/\D/g, "");
    const trxId = String(input.trxId ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[0-9a-f-]{36}$/i.test(packageId)) throw new Error("প্যাকেজ শনাক্ত করা যায়নি");
    if (!["bkash", "nagad", "rocket"].includes(method)) throw new Error("পেমেন্ট মেথড নির্বাচন করুন");
    if (!/^01[3-9]\d{8}$/.test(senderNumber)) throw new Error("সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন");
    if (!/^[A-Z0-9]{6,32}$/.test(trxId)) throw new Error("সঠিক Transaction ID দিন");
    return { packageId, method, senderNumber, trxId };
  })
  .handler(async ({ data, context }) => {
    const { data: distributor, error: distributorError } = await context.supabase
      .from("distributors")
      .select("user_id,status")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (distributorError || !distributor) throw new Error("শুধু সক্রিয় ডিস্ট্রিবিউটর প্যাকেজ কিনতে পারবেন");

    const { data: existing } = await context.supabase
      .from("distributor_package_orders")
      .select("id,status")
      .eq("distributor_id", context.userId)
      .eq("package_id", data.packageId)
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payment = {
      payment_method: data.method,
      sender_number: data.senderNumber,
      trx_id: data.trxId,
      submitted_at: new Date().toISOString(),
      status: "pending",
      rejection_reason: null,
    };
    if (existing?.id) {
      const { error } = await context.supabase.from("distributor_package_orders").update(payment).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { orderId: existing.id, status: "pending" as const };
    }

    const { data: created, error } = await context.supabase
      .from("distributor_package_orders")
      .insert({ ...payment, distributor_id: context.userId, package_id: data.packageId })
      .select("id")
      .single();
    if (error || !created) throw new Error(error?.message ?? "অর্ডার তৈরি করা যায়নি");
    return { orderId: created.id, status: "pending" as const };
  });

export const reviewDistributorPackageOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; action: "approve" | "reject"; reason?: string }) => {
    const orderId = String(input.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("অর্ডার শনাক্ত করা যায়নি");
    if (!["approve", "reject"].includes(input.action)) throw new Error("সঠিক সিদ্ধান্ত দিন");
    return { orderId, action: input.action, reason: String(input.reason ?? "").trim() };
  })
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("admin_review_distributor_package_order", {
      _actor: context.userId,
      _order_id: data.orderId,
      _action: data.action,
      _reason: data.reason || undefined,
    });
    if (error) throw new Error(error.message);
    return result;
  });