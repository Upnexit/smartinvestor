import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Sparkles,
  User as UserIcon, Phone, Wallet, Gift, ShieldCheck, Zap,
  ArrowRight, Check, Crown, TrendingUp, Banknote, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: origin ? `${origin}/dashboard` : undefined,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          payment_method: form.payment_method,
          payment_number: form.payment_number,
          ref: search.ref ?? null,
        },
      },
    });
    if (err) {
      setLoading(false);
      const msg = mapSignupError(err.message);
      setError(msg);
      toast.error(msg);
      return;
    }
    if (typeof window !== "undefined") localStorage.setItem("signup_bonus_pending", "1");
    toast.success("একাউন্ট সফলভাবে তৈরি হয়েছে! ৳৩০০ বোনাস যোগ হয়েছে");
    if (!data.session) {
      await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    }
    setLoading(false);
    navigate({ to: safeRedirect(search.redirect) ?? "/dashboard", replace: true });
  }

  const benefits = [
    { Icon: Gift, t: "৳৩০০ সাইনআপ বোনাস (লকড)", tone: "bg-rose-100 text-rose-700" },
    { Icon: TrendingUp, t: "প্রতিটি Like ৳০.৫০, Comment ৳১.২০", tone: "bg-emerald-100 text-emerald-700" },
    { Icon: Banknote, t: "bKash / Nagad / Rocket পেমেন্ট", tone: "bg-amber-100 text-amber-700" },
    { Icon: Award, t: "প্রতি রেফারে ৳৫০ বোনাস", tone: "bg-sky-100 text-sky-700" },
    { Icon: ShieldCheck, t: "১০০% নিরাপদ", tone: "bg-violet-100 text-violet-700" },
    { Icon: Crown, t: "VIP প্যাকেজে দৈনিক ৳১,২০০ আয়", tone: "bg-orange-100 text-orange-700" },
  ];

  const steps = [
    "একাউন্ট তৈরি করুন (১ মিনিটে)",
    "প্যাকেজ একটিভ করুন (ইচ্ছামতো)",
    "Like / Comment টাস্ক করুন",
    "bKash / Nagad এ উইথড্র করুন",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/40 to-rose-50/40">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-amber-200/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="bn-display text-lg text-slate-900">Smart Investor</span>
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            লগইন করুন
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left aside */}
          <aside className="space-y-5 lg:col-span-2">
            {/* Bonus banner */}
            <div className="relative overflow-hidden rounded-3xl p-6 text-white shadow-pop"
              style={{ backgroundImage: "linear-gradient(135deg, oklch(0.65 0.2 25), oklch(0.62 0.22 0), oklch(0.55 0.22 320))" }}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">সাইনআপ অফার</span>
              <p className="bn-display mt-3 text-4xl leading-none">৳ ৩০০ বোনাস</p>
              <p className="mt-2 text-sm text-white/90">
                রেজিস্ট্রেশন করার সাথে সাথে ৳৩০০ লকড বোনাস — প্রথম প্যাকেজ কিনলেই আনলক হবে।
              </p>
            </div>

            {/* Why */}
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-soft">
              <h3 className="bn-display text-xl text-slate-900">কেন একাউন্ট খুলবেন?</h3>
              <ul className="mt-4 space-y-3">
                {benefits.map(({ Icon, t, tone }) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-slate-700">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* How */}
            <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-soft">
              <h3 className="bn-display text-xl text-slate-900">কিভাবে কাজ করবে?</h3>
              <ol className="mt-4 space-y-3">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700">{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { n: "৫০K+", l: "ইউজার", from: "from-amber-400", to: "to-orange-500" },
                { n: "৳২ কোটি+", l: "পেমেন্ট", from: "from-emerald-400", to: "to-teal-600" },
                { n: "৯৯%", l: "সফলতা", from: "from-rose-400", to: "to-pink-600" },
              ].map((s) => (
                <div key={s.l} className={`rounded-2xl bg-gradient-to-br ${s.from} ${s.to} p-4 text-center text-white shadow-sm`}>
                  <p className="bn-display text-lg leading-tight">{s.n}</p>
                  <p className="mt-1 text-[11px] text-white/90">{s.l}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* Right form */}
          <section className="lg:col-span-3">
            <div className="rounded-[28px] bg-gradient-to-br from-amber-400 via-rose-400 to-fuchsia-500 p-[2px] shadow-pop">
              <div className="relative overflow-hidden rounded-[26px] bg-white p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
                <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-rose-200/40 blur-3xl" />
                <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                <Sparkles className="h-3.5 w-3.5" /> ফ্রি রেজিস্ট্রেশন
              </span>
              <h1 className="bn-display mt-3 text-3xl text-slate-900 sm:text-4xl">
                নতুন <span className="text-gradient">একাউন্ট</span> তৈরি করুন
              </h1>
              <p className="mt-2 text-sm text-slate-600">মাত্র ১ মিনিটে রেজিস্ট্রেশন — পেয়ে যান ৳৩০০ বোনাস</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <Field icon={UserIcon} label="পূর্ণ নাম" value={form.full_name} onChange={(v) => update("full_name", v)} placeholder="আপনার নাম" />
                <Field icon={Mail} label="ইমেইল" type="email" autoComplete="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@example.com" />
                <Field icon={Phone} label="ফোন নাম্বার" type="tel" value={form.phone} onChange={(v) => update("phone", v.replace(/\D/g, ""))} placeholder="01XXXXXXXXX" maxLength={11} />

                {/* Payment method combined row */}
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

                {/* Password */}
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

                <button type="submit" disabled={loading} className="btn-gold w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  একাউন্ট তৈরি করুন
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-600">
                আগে থেকেই একাউন্ট আছে?{" "}
                <Link to="/auth" className="font-semibold text-amber-700 hover:text-amber-800">লগইন করুন →</Link>
              </p>
            </div>

            {/* Trust badges */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
              {[
                { Icon: Check, t: "১০০% ফ্রি", c: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { Icon: ShieldCheck, t: "ইনভেস্টমেন্ট নেই", c: "text-amber-800 bg-amber-50 border-amber-200" },
                { Icon: Zap, t: "ডেটা সুরক্ষিত", c: "text-rose-700 bg-rose-50 border-rose-200" },
              ].map(({ Icon, t, c }) => (
                <div key={t} className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 font-medium ${c}`}>
                  <Icon className="h-3.5 w-3.5" /> {t}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
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
