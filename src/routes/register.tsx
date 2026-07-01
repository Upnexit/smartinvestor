import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Sparkles,
  User as UserIcon, Phone, Wallet, Gift, ShieldCheck, Zap,
  ArrowRight, TrendingUp, Banknote, Award, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";

type Search = { ref?: string; redirect?: string };

function safeRedirect(t?: string | null) {
  if (!t) return null;
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  return t;
}

export const Route = createFileRoute("/register")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: safeRedirect(search.redirect) ?? "/dashboard" });
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
  email: z.string().trim().email({ message: "সঠিক ইমেইল দিন" }).max(255),
  phone: z.string().regex(/^01[3-9]\d{8}$/, { message: "সঠিক বাংলাদেশী মোবাইল নম্বর দিন" }),
  payment_method: z.enum(["bkash", "nagad", "rocket"]),
  payment_number: z.string().regex(/^01[3-9]\d{8}$/, { message: "সঠিক পেমেন্ট নম্বর দিন" }),
  password: z.string().min(6, { message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" }).max(72),
});

function mapSignupError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("registered") || m.includes("already")) return "এই ইমেইল আগে থেকেই রেজিস্টার্ড — লগইন করুন";
  if (m.includes("weak") || m.includes("pwned") || m.includes("password")) return "পাসওয়ার্ডটি অনেক সহজ";
  if (m.includes("rate")) return "একটু পরে আবার চেষ্টা করুন";
  return msg;
}

function RegisterPage() {
  const site = useSiteSettings();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "",
    payment_method: "bkash" as "bkash" | "nagad" | "rocket",
    payment_number: "", password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const msg = parsed.error.issues[0].message;
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    const email = form.email.toLowerCase();
    const { data: signup, error: signupError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          payment_method: form.payment_method,
          payment_number: form.payment_number,
          ref: search.ref ?? null,
        },
      },
    });
    if (signupError) {
      setLoading(false);
      const msg = mapSignupError(signupError.message);
      setError(msg);
      toast.error(msg);
      return;
    }
    if (typeof window !== "undefined") localStorage.setItem("signup_bonus_pending", "1");
    // If email confirmations are enabled on Supabase, the signUp above returns
    // no session. Auto-confirm the user via edge function so login works.
    if (!signup.session) {
      try {
        await supabase.functions.invoke("auto-confirm-signup", { body: { email } });
      } catch {
        /* non-fatal — retry sign-in anyway */
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (loginError) {
        setLoading(false);
        const msg = mapSignupError(loginError.message);
        setError(msg);
        toast.error(msg);
        return;
      }
    }
    toast.success("একাউন্ট সফলভাবে তৈরি হয়েছে! ৳৩০০ বোনাস যোগ হয়েছে");
    setLoading(false);
    navigate({ to: safeRedirect(search.redirect) ?? "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40">
      <div className="grid min-h-screen lg:grid-cols-5">
        {/* Left gradient aside — mirrors /auth */}
        <aside
          className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between p-10 text-white"
          style={{ backgroundImage: "linear-gradient(160deg, oklch(0.72 0.18 70), oklch(0.65 0.2 45) 50%, oklch(0.6 0.22 25))" }}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative z-10">
            <Link to="/" aria-label="হোম পেজে ফিরুন" className="flex items-center gap-3 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg ring-1 ring-white/30 overflow-hidden">
                {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-7 w-7" />}
              </div>
              <div>
                <p className="bn-display text-2xl leading-tight">{site.site_name}</p>
                <p className="text-xs text-white/80">{site.tagline || "হোমে ফিরে যান"}</p>
              </div>
            </Link>

            <div className="mt-12 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Gift className="h-3.5 w-3.5" /> সাইনআপ অফার
            </div>
            <h2 className="bn-display mt-4 text-4xl leading-tight">
              ৳ ৩০০ বোনাস<br/>সাথে সাথেই আনলক
            </h2>
            <p className="mt-4 max-w-md text-white/90 leading-relaxed">
              রেজিস্ট্রেশনের সাথেই ৳৩০০ লকড বোনাস — প্রথম প্যাকেজ একটিভ করলেই উইথড্রয়েবল।
            </p>

            <ul className="mt-8 space-y-4">
              {[
                { Icon: TrendingUp, t: "প্রতি Like ৳০.৫০, Comment ৳১.২০" },
                { Icon: Banknote, t: "bKash / Nagad / Rocket ইনস্ট্যান্ট পেমেন্ট" },
                { Icon: Award, t: "প্রতি রেফারে অতিরিক্ত ৳৫০ বোনাস" },
                { Icon: Crown, t: "VIP প্যাকেজে দৈনিক ৳১,২০০ আয়" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-white/95">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mt-10 grid grid-cols-3 gap-3">
            {[
              { n: "৫০K+", l: "ইউজার" },
              { n: "৳২ কোটি+", l: "পেমেন্ট" },
              { n: "৯৯%", l: "সফলতা" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 text-center border border-white/15">
                <p className="bn-display text-xl">{s.n}</p>
                <p className="text-xs text-white/80 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Right form column */}
        <main className="flex items-center justify-center px-5 py-10 sm:px-10 lg:col-span-3">
          <div className="w-full max-w-md">
            {/* Mobile brand bar */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link to="/" aria-label="হোম পেজে ফিরুন" className="flex items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md overflow-hidden">
                  {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <span className="bn-display text-lg text-slate-900">{site.site_name}</span>
              </Link>
              <Link to="/auth" search={{ mode: "login" }} className="text-sm font-medium text-amber-700">লগইন →</Link>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Sparkles className="h-3.5 w-3.5" /> ফ্রি রেজিস্ট্রেশন
            </span>
            <h1 className="bn-display mt-4 text-3xl text-slate-900">নতুন একাউন্ট তৈরি করুন</h1>
            <p className="mt-2 text-sm text-slate-600">মাত্র ১ মিনিটে রেজিস্ট্রেশন — পেয়ে যান ৳৩০০ বোনাস</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <Field icon={UserIcon} label="পূর্ণ নাম" value={form.full_name} onChange={(v) => update("full_name", v)} placeholder="আপনার নাম" />
              <Field icon={Mail} label="ইমেইল" type="email" autoComplete="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" />
              <Field icon={Phone} label="ফোন নাম্বার" type="tel" value={form.phone} onChange={(v) => update("phone", v.replace(/\D/g, ""))} placeholder="01XXXXXXXXX" maxLength={11} />

              <div>
                <label className="text-sm font-medium text-slate-700">পেমেন্ট মেথড ও নাম্বার</label>
                <div className="mt-1.5 flex items-stretch rounded-xl border-2 border-slate-200 bg-white transition focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100">
                  <div className="flex items-center pl-3 pr-2 text-slate-400">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <select
                    value={form.payment_method}
                    onChange={(e) => update("payment_method", e.target.value as typeof form.payment_method)}
                    className="bg-transparent py-3 pr-2 text-sm font-medium text-slate-700 outline-none"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                  <div className="my-2 w-px bg-slate-200" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.payment_number}
                    onChange={(e) => update("payment_number", e.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    className="flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                  />
                </div>
              </div>

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

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-green w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                একাউন্ট তৈরি করুন
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="mt-5 flex items-center justify-between rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100/80 transition"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                আগে থেকেই একাউন্ট আছে? লগইন করুন
              </span>
              <ArrowRight className="h-4 w-4 text-amber-700" />
            </Link>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
              {[
                { Icon: ShieldCheck, t: "১০০% ফ্রি", c: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { Icon: Gift, t: "৳৩০০ বোনাস", c: "text-amber-800 bg-amber-50 border-amber-200" },
                { Icon: Zap, t: "ডেটা সুরক্ষিত", c: "text-rose-700 bg-rose-50 border-rose-200" },
              ].map(({ Icon, t, c }) => (
                <div key={t} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 font-medium ${c}`}>
                  <Icon className="h-3.5 w-3.5" /> {t}
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              একাউন্ট তৈরি করার মাধ্যমে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।
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
  autoComplete?: string;
};

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", maxLength, autoComplete }: FieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative mt-1.5">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          autoComplete={autoComplete}
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
