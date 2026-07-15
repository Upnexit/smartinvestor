import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string; p256dh: string; auth: string; user_agent?: string | null }) => ({
    endpoint: String(d.endpoint ?? "").slice(0, 2000).trim(),
    p256dh: String(d.p256dh ?? "").slice(0, 300).trim(),
    auth: String(d.auth ?? "").slice(0, 200).trim(),
    user_agent: d.user_agent ? String(d.user_agent).slice(0, 300) : null,
  }))
  .handler(async ({ data, context }) => {
    if (!data.endpoint || !data.p256dh || !data.auth) throw new Error("invalid subscription");
    const { supabase, userId } = context;

    // Upsert by endpoint (unique). If the same endpoint existed for another user
    // (device shared), reassign it to the current user.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.user_agent,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { endpoint: string }) => ({ endpoint: String(d.endpoint ?? "").slice(0, 2000) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPushSelfTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    const list = (subs ?? []) as Array<{ id: string; user_id: string; endpoint: string; p256dh: string; auth: string }>;
    if (list.length === 0) return { sent: 0, failed: 0, recipients: 0 };

    const { sendWebPushToNoticeTargets } = await import("./push.server");
    // Reuse the notice pipeline by faking a self-targeted notice row.
    return sendWebPushToNoticeTargets(supabase, {
      id: "self-test",
      title: "টেস্ট নোটিফিকেশন",
      body: "Push notification ঠিকঠাক কাজ করছে ✅",
      priority: "info",
      target_package_ids: [],
      target_user_ids: [userId],
      target_all_users: false,
      published: true,
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
