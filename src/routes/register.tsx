import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Sparkles,
  User as UserIcon, Phone, Gift, ShieldCheck, Zap, Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "রেজিস্টার — Smart Investor" },
      { name: "description", content: "নতুন একাউন্ট খুলে ৳৩০০ সাইনআপ বোনাস নিন।" },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, { message: "পুরো নাম দিন" }).max(80),
  email: z.string().trim().email({ message: "সঠিক ইমেইল দিন" }),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: "সঠিক বাংলাদেশী মোবাইল নম্বর দিন" }),
  password: z.string().min(6, { message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" }),
  referral_code: z.string().trim().max(16).optional().or(z.literal("")),
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", referral_code: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          referral_code: form.referral_code || null,
        },
      },
    });
    setLoading(false);
    if (err) { setError(err.message.includes("registered") ? "এই ইমেইল ইতিমধ্যে নিবন্ধিত" : "রেজিস্ট্রেশন ব্যর্থ — আবার চেষ্টা করুন"); return; }
    if (typeof window !== "undefined") sessionStorage.setItem("smartinv:welcome", "1");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40">
      <div className="grid min-h-screen lg:grid-cols-5">
        <aside
          className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between p-10 text-white"
          style={{ backgroundImage: "linear-gradient(160deg, oklch(0.72 0.18 70), oklch(0.65 0.2 45) 50%, oklch(0.6 0.22 25))" }}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <div>
                <p className="bn-display text-2xl leading-tight">Smart Investor</p>
                <p className="text-xs text-white/80">স্মার্ট ইনভেস্টর</p>
              </div>
            </div>
            <h2 className="bn-display mt-16 text-4xl leading-tight">
              আজই যোগ দিন<br/>৳৩০০ বোনাস নিয়ে
            </h2>
            <p className="mt-4 max-w-md text-white/90">
              রেজিস্টার করার সাথে সাথে আপনার একাউন্টে ৳৩০০ বোনাস ক্রেডিট হবে।
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { Icon: Gift, t: "৳৩০০ ইনস্ট্যান্ট সাইনআপ বোনাস" },
                { Icon: ShieldCheck, t: "RLS নিরাপদ ও বিশ্বস্ত প্ল্যাটফর্ম" },
                { Icon: Zap, t: "৫ মিনিটে bKash/Nagad উইথড্র" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-white/95">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative z-10 mt-10 grid grid-cols-3 gap-3">
            {[{ n: "৫০K+", l: "ইউজার" }, { n: "৳২ কোটি+", l: "পেমেন্ট" }, { n: "৯৯%", l: "সফলতা" }].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 text-center border border-white/15">
                <p className="bn-display text-xl">{s.n}</p>
                <p className="text-xs text-white/80 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-10 lg:col-span-3">
          <div className="w-full max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" /> SMART INVESTOR
            </span>
            <h1 className="bn-display mt-4 text-3xl text-slate-900">নতুন একাউন্ট খুলুন</h1>
            <p className="mt-2 text-sm text-slate-600">পুরো নাম, ইমেইল ও মোবাইল নম্বর দিন।</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <Field icon={UserIcon} label="পুরো নাম" value={form.full_name} onChange={(v) => update("full_name", v)} placeholder="আপনার নাম" />
              <Field icon={Mail} label="ইমেইল" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" />
              <Field icon={Phone} label="মোবাইল নম্বর" type="tel" value={form.phone} onChange={(v) => update("phone", v)} placeholder="01XXXXXXXXX" maxLength={11} />
              <div>
                <label className="text-sm font-medium text-slate-700">পাসওয়ার্ড</label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label={showPw ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Field icon={Tag} label="রেফারেল কোড (ঐচ্ছিক)" value={form.referral_code} onChange={(v) => update("referral_code", v.toUpperCase())} placeholder="REF কোড" maxLength={16} />

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 border border-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-green w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                রেজিস্টার করুন
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-600">
              ইতিমধ্যে একাউন্ট আছে?{" "}
              <Link to="/auth" className="font-semibold text-amber-700 hover:text-amber-800">লগইন করুন</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

type FieldProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
};

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", maxLength }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
        />
      </div>
    </div>
  );
}
