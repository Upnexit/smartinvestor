import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().regex(/^01[3-9]\d{8}$/),
  payment_method: z.enum(["bkash", "nagad", "rocket"]),
  payment_number: z.string().regex(/^01[3-9]\d{8}$/),
  password: z.string().min(6).max(72),
  ref: z.string().trim().max(80).nullable().optional(),
});

export const createConfirmedUserAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        phone: data.phone,
        payment_method: data.payment_method,
        payment_number: data.payment_number,
        ref: data.ref ?? null,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
        throw new Error("এই ইমেইল আগে থেকেই রেজিস্টার্ড — লগইন করুন");
      }
      throw new Error(error.message);
    }

    if (!created.user) throw new Error("একাউন্ট তৈরি ব্যর্থ হয়েছে");

    return { ok: true, userId: created.user.id };
  });

export const confirmExistingEmailAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email().max(255) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();

    for (let page = 1; page <= 10; page += 1) {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const user = users.users.find((u) => u.email?.toLowerCase() === email);
      if (user) {
        if (!user.email_confirmed_at) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email_confirm: true,
          });
          if (updateError) throw new Error(updateError.message);
        }
        return { ok: true };
      }
      if (users.users.length < 1000) break;
    }

    return { ok: false };
  });