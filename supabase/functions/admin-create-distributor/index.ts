// Secure admin-only distributor creation.
// Runs in Supabase Edge runtime so service-role secrets are available there,
// while the browser only sends the signed-in admin's JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown, max = 200, min = 0) {
  const s = String(value ?? "").trim();
  if (s.length < min || s.length > max) throw new Error("invalid input");
  return s;
}

function optional(value: unknown, max = 200) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.length > max) throw new Error("invalid input");
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("server_not_configured");

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authUser, error: authError } = await admin.auth.getUser(token);
    if (authError || !authUser.user) return json({ error: "unauthorized" }, 401);

    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
      _user_id: authUser.user.id,
      _role: "admin",
    });
    if (roleError) throw roleError;
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const email = text(body.email, 200, 5).toLowerCase();
    const password = text(body.password, 72, 6);
    const full_name = text(body.full_name, 120, 2);
    if (!EMAIL.test(email)) throw new Error("invalid email");

    const payment_method = ["bkash", "nagad", "rocket"].includes(String(body.payment_method))
      ? String(body.payment_method)
      : "bkash";
    const patch = {
      full_name,
      email,
      phone: optional(body.phone, 30),
      payment_method,
      payment_number: optional(body.payment_number, 30),
      district: optional(body.district, 60),
      thana: optional(body.thana, 60),
      address: optional(body.address, 300),
      commission_rate: Math.min(Math.max(Number(body.commission_rate ?? 5), 0), 100),
      status: "active",
      notes: optional(body.notes, 500),
    };

    // Create the auth user — or reuse if this email already has an account.
    let userId: string;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone: patch.phone ?? "", role: "distributor" },
    });
    if (createError || !created?.user) {
      const msg = (createError?.message ?? "").toLowerCase();
      const alreadyExists = msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("duplicate");
      if (!alreadyExists) throw createError ?? new Error("auth create failed");
      // Look up the existing auth user by email and reuse it.
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) throw listErr;
      const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!existing) throw new Error("এই ইমেইল আগে থেকেই ব্যবহার করা হয়েছে");
      userId = existing.id;
      // Update password so the applicant's chosen password works.
      await admin.auth.admin.updateUserById(userId, { password, email_confirm: true }).catch(() => null);
    } else {
      userId = created.user.id;
    }


    const { data: distributor, error: upsertError } = await admin.rpc("admin_upsert_distributor", {
      _actor: authUser.user.id,
      _user_id: created.user.id,
      _patch: patch,
    });
    if (upsertError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => null);
      throw upsertError;
    }

    const initialBalance = Math.max(0, Number(body.initial_balance ?? 0));
    if (initialBalance > 0) {
      await admin.from("distributors").update({
        balance: initialBalance,
        total_earned: initialBalance,
      }).eq("user_id", created.user.id);
    }

    const applicationId = typeof body.application_id === "string" ? body.application_id : null;
    if (applicationId) {
      await admin.from("distributor_applications").update({
        status: "approved",
        reviewed_by: authUser.user.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", applicationId);
    }

    return json({ ok: true, userId: created.user.id, distributor });
  } catch (e) {
    const message = e instanceof Error ? e.message : "ডিস্ট্রিবিউটর তৈরি ব্যর্থ";
    const lower = message.toLowerCase();
    if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
      return json({ error: "এই ইমেইল আগে থেকেই ব্যবহার করা হয়েছে" }, 409);
    }
    return json({ error: message === "server_not_configured" ? "সার্ভার কনফিগারেশন সম্পূর্ণ নয়" : message }, 400);
  }
});