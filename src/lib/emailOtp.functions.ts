import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_NAME = "Smart Click BD";

function hash(code: string, userId: string) {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

function buildHtml(code: string, fullName: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(15,23,42,.08)">
      <tr><td style="background:linear-gradient(135deg,#f43f5e 0%,#ec4899 50%,#a855f7 100%);padding:28px 32px;text-align:center;color:#fff">
        <div style="font-size:13px;letter-spacing:3px;font-weight:700;opacity:.9">SMART CLICK BD</div>
        <div style="font-size:22px;font-weight:800;margin-top:6px">ইমেইল ভেরিফিকেশন</div>
      </td></tr>
      <tr><td style="padding:30px 32px 8px;color:#0f172a">
        <p style="margin:0 0 6px;font-size:15px">আসসালামু আলাইকুম${fullName ? `, <b>${fullName}</b>` : ""},</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">আপনার Smart Click BD একাউন্ট ভেরিফাই করতে নিচের ৬-সংখ্যার কোডটি ব্যবহার করুন। কোডটি <b>১০ মিনিট</b> পর্যন্ত বৈধ থাকবে।</p>
      </td></tr>
      <tr><td align="center" style="padding:18px 32px 8px">
        <div style="display:inline-block;padding:18px 28px;background:linear-gradient(135deg,#fff7ed,#fef3c7);border:2px dashed #f59e0b;border-radius:14px;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:10px;color:#b45309">${code}</div>
      </td></tr>
      <tr><td style="padding:14px 32px 28px;color:#64748b;font-size:12.5px;line-height:1.6">
        <p style="margin:0 0 8px">কোডটি কারো সাথে শেয়ার করবেন না — Smart Click BD টিম কখনো আপনার কোড জানতে চাইবে না।</p>
        <p style="margin:0">যদি আপনি এই অনুরোধ না করে থাকেন, তবে এই ইমেইল উপেক্ষা করুন।</p>
      </td></tr>
      <tr><td style="background:#0f172a;color:#94a3b8;padding:16px 32px;font-size:11px;text-align:center">
        © ${new Date().getFullYear()} Smart Click BD · বাংলাদেশ
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function buildRaw(to: string, fromEmail: string, subject: string, html: string) {
  const fromHeader = `${FROM_NAME} <${fromEmail}>`;
  const mime = [
    `From: ${fromHeader}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ].join("\r\n");
  return Buffer.from(mime, "utf-8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGmailAddress(): Promise<string> {
  if (!process.env.LOVABLE_API_KEY) throw new Error("সার্ভার কনফিগারেশন ত্রুটি: LOVABLE_API_KEY অনুপস্থিত");
  if (!process.env.GOOGLE_MAIL_API_KEY) throw new Error("Gmail সংযোগ পাওয়া যায়নি — অ্যাডমিনকে জানান");
  const r = await fetch(`${GATEWAY}/users/me/profile`, {
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.GOOGLE_MAIL_API_KEY,
    },
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    console.error("[gmail] profile fetch failed", r.status, t.slice(0, 300));
    throw new Error(`Gmail সংযোগ ব্যর্থ (${r.status})`);
  }
  const j = (await r.json()) as { emailAddress?: string };
  return j.emailAddress ?? "no-reply@smartclickbd.com";
}

export const sendEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("email, full_name, email_verified")
      .eq("id", userId)
      .maybeSingle();

    if (!prof?.email) throw new Error("ইমেইল পাওয়া যায়নি");
    if (prof.email_verified) throw new Error("ইতিমধ্যে ভেরিফাইড");

    // Rate-limit: 1 OTP per 60s
    const { data: recent } = await supabase
      .from("email_otps")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent?.[0]) {
      const ageMs = Date.now() - new Date(recent[0].created_at).getTime();
      if (ageMs < 60_000) {
        throw new Error(`একটু অপেক্ষা করুন (${Math.ceil((60_000 - ageMs) / 1000)}s)`);
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insErr } = await supabase.from("email_otps").insert({
      user_id: userId,
      email: prof.email,
      code_hash: hash(code, userId),
      expires_at: expires,
    });
    if (insErr) throw new Error(insErr.message);

    const fromEmail = await getGmailAddress();
    const html = buildHtml(code, prof.full_name ?? "");
    const raw = buildRaw(prof.email, fromEmail, "Smart Click BD — আপনার ভেরিফিকেশন কোড", html);

    const resp = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": process.env.GOOGLE_MAIL_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`ইমেইল পাঠানো ব্যর্থ: ${resp.status} ${t.slice(0, 120)}`);
    }

    return { ok: true, email: prof.email };
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row } = await supabase
      .from("email_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("user_id", userId)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("কোনো সক্রিয় কোড নেই — আবার পাঠান");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("কোডের মেয়াদ শেষ");
    if (row.attempts >= 5) throw new Error("অনেকবার ভুল — নতুন কোড নিন");

    if (row.code_hash !== hash(data.code, userId)) {
      await supabase.from("email_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("কোড মিলেনি");
    }

    await supabase.from("email_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    const { error: upErr } = await supabase.from("profiles").update({ email_verified: true }).eq("id", userId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });

// Update the signed-in user's email (auth + profile) and reset verification.
// Used by the verification modal when the user wants to correct a wrong email.
export const updateMyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email("সঠিক ইমেইল দিন") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const newEmail = data.email;

    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (prof?.email?.toLowerCase() === newEmail) {
      return { ok: true, changed: false, email: newEmail };
    }

    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEYS);

    if (hasServiceRole) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Reject if another user already owns this email
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .neq("id", userId)
        .maybeSingle();
      if (existing) throw new Error("এই ইমেইল ইতিমধ্যে ব্যবহৃত");

      const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      });
      if (aErr) {
        console.error("[updateMyEmail] auth admin error", aErr);
        throw new Error(aErr.message || "ইমেইল আপডেট ব্যর্থ");
      }
    }

    const writeClient = hasServiceRole
      ? (await import("@/integrations/supabase/client.server")).supabaseAdmin
      : supabase;

    const { error: pErr } = await writeClient
      .from("profiles")
      .update({ email: newEmail, email_verified: false })
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);

    // Invalidate any pending OTPs
    await writeClient
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("consumed_at", null);

    return { ok: true, changed: true, email: newEmail };
  });

