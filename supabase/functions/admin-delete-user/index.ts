// Supabase Edge Function: admin-delete-user
// Permanently deletes a user from ALL public database tables and from Supabase Auth (auth.users).
// After deletion, the user cannot log in with their old email and password.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "সার্ভার কনফিগারেশন পাওয়া যায়নি (Missing Supabase env)" }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "অননুমোদিত অনুরোধ (Unauthorized)" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify caller identity and admin privilege
    const { data: authUser, error: authError } = await admin.auth.getUser(token);
    if (authError || !authUser.user) return json({ error: "অননুমোদিত অনুরোধ (Invalid token)" }, 401);

    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: authUser.user.id,
      _role: "admin",
    });
    if (roleError) throw roleError;
    if (!isAdmin) return json({ error: "শুধুমাত্র অ্যাডমিন ইউজার ডিলিট করতে পারবেন" }, 403);

    // 2. Parse and validate target userId
    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.userId ?? "").trim();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!targetUserId || !UUID_RE.test(targetUserId)) {
      return json({ error: "সঠিক ইউজার আইডি প্রদান করুন" }, 400);
    }

    if (targetUserId === authUser.user.id) {
      return json({ error: "অ্যাডমিন নিজের অ্যাকাউন্ট ডিলিট করতে পারবেন না" }, 400);
    }

    // 3. Purge user data across all tables in public schema
    // First, clear any foreign references in other profiles to avoid constraint failure
    await admin.from("profiles").update({ referred_by: null }).eq("referred_by", targetUserId);
    await admin.from("profiles").update({ distributor_id: null }).eq("distributor_id", targetUserId);

    // Dependent activity, tasks, submissions, and payments
    await admin.from("task_submissions").delete().eq("user_id", targetUserId);
    await admin.from("withdrawals").delete().eq("user_id", targetUserId);
    await admin.from("user_packages").delete().eq("user_id", targetUserId);
    await admin.from("referral_earnings").delete().or(`referrer_id.eq.${targetUserId},referred_user_id.eq.${targetUserId}`);
    await admin.from("community_messages").delete().eq("user_id", targetUserId);
    await admin.from("community_bans").delete().eq("user_id", targetUserId);
    await admin.from("user_payment_methods").delete().eq("user_id", targetUserId);
    await admin.from("support_messages").delete().eq("user_id", targetUserId);
    await admin.from("notice_dismissals").delete().eq("user_id", targetUserId);
    await admin.from("push_subscriptions").delete().eq("user_id", targetUserId);
    await admin.from("email_otps").delete().eq("user_id", targetUserId);
    await admin.from("activity_logs").delete().eq("user_id", targetUserId);

    // Distributor tables
    await admin.from("distributor_earnings").delete().or(`distributor_id.eq.${targetUserId},related_user_id.eq.${targetUserId}`);
    await admin.from("distributor_withdrawals").delete().eq("distributor_id", targetUserId);
    await admin.from("distributor_package_orders").delete().eq("distributor_id", targetUserId);
    await admin.from("distributor_tasks").delete().eq("distributor_id", targetUserId);
    await admin.from("distributor_leads").delete().eq("distributor_id", targetUserId);
    await admin.from("distributor_applications").delete().eq("user_id", targetUserId);
    await admin.from("distributors").delete().eq("user_id", targetUserId);

    // E-commerce orders
    await admin.from("shop_orders").delete().eq("user_id", targetUserId);

    // User roles & profile
    await admin.from("user_roles").delete().eq("user_id", targetUserId);
    await admin.from("profiles").delete().eq("id", targetUserId);

    // Call stored RPC as a secondary clean-up pass
    await admin.rpc("admin_delete_user_data", {
      _actor: authUser.user.id,
      _user_id: targetUserId,
    }).catch(() => null);

    // 4. CRITICAL: Permanently delete the user from Supabase Auth (auth.users)
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      // If the user was already gone from auth.users, that's fine
      const msg = authDeleteError.message || "";
      if (!/not.?found|user.?not.?found/i.test(msg)) {
        console.error("[admin-delete-user] Failed to delete from auth.users:", msg);
        return json({ error: `ডাটাবেস পরিষ্কার হলেও Auth থেকে ইউজার মুছে ফেলা যায়নি: ${msg}` }, 500);
      }
    }

    return json({
      ok: true,
      message: "ব্যবহারকারীর সকল ডাটা এবং লগইন অ্যাকাউন্ট সফলভাবে স্থায়ীভাবে মুছে ফেলা হয়েছে",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin-delete-user] Unexpected error:", msg);
    return json({ error: msg || "ইউজার ডিলিট করতে সমস্যা হয়েছে" }, 500);
  }
});
