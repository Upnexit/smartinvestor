// Create a fully-confirmed user account without sending a confirmation email.
// Uses the service role to bypass Supabase's public signup rate limit and
// email delivery. All input is validated; only the fields we expect are used.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PHONE = /^01[3-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const full_name = String(body?.full_name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim();
    const payment_method = String(body?.payment_method ?? "bkash");
    const payment_number = String(body?.payment_number ?? "").trim();
    const password = String(body?.password ?? "");
    const ref = body?.ref ? String(body.ref).trim() : null;

    if (full_name.length < 2 || full_name.length > 80) throw new Error("পুরো নাম দিন");
    if (!EMAIL.test(email) || email.length > 255) throw new Error("সঠিক ইমেইল দিন");
    if (!PHONE.test(phone)) throw new Error("সঠিক বাংলাদেশী মোবাইল নম্বর দিন");
    if (!["bkash","nagad","rocket"].includes(payment_method)) throw new Error("পেমেন্ট মেথড ভুল");
    if (!PHONE.test(payment_number)) throw new Error("সঠিক পেমেন্ট নম্বর দিন");
    if (password.length < 6 || password.length > 72) throw new Error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone, payment_method, payment_number, ref },
    });
    if (error) {
      const m = error.message.toLowerCase();
      if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
        return new Response(JSON.stringify({ error: "এই ইমেইল আগে থেকেই রেজিস্টার্ড — লগইন করুন" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw error;
    }
    return new Response(JSON.stringify({ ok: true, userId: created.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "রেজিস্ট্রেশন ব্যর্থ হয়েছে" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
