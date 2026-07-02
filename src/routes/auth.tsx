import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Sparkles,
  ShieldCheck, Zap, Gift, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";

type Search = { redirect?: string; mode?: string };

function safeRedirect(target?: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  return target;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    mode: typeof s.mode === "string" ? s.mode : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      let dest = safeRedirect(search.redirect);
      if (!dest) {
        const user = data.session.user;
        const email = user.email?.toLowerCase() ?? "";
        // Determine best destination based on role
        let isAdmin = email === "upnex360@gmail.com";
        let isDistributor = false;
        try {
          const { data: roleRows } = await supabase
            .from("user_roles").select("role").eq("user_id", user.id);
          const roles = (roleRows ?? []).map((r) => r.role as string);
          if (roles.includes("admin")) isAdmin = true;
          if (roles.includes("distributor")) isDistributor = true;
        } catch { /* ignore */ }
        dest = isAdmin ? "/admin" : isDistributor ? "/distributor" : "/dashboard";
      }
      throw redirect({ to: dest });
    }
  },
  head: () => ({
    meta: [
      { title: "লগইন — Smart Investor" },
      { name: "description", content: "Smart Investor অ্যাকাউন্টে লগইন করুন।" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "সঠিক ইমেইল দিন" }).max(255),
  password: z.string().min(6, { message: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর" }).max(72),
});

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("email not confirmed")) return "একাউন্ট active হচ্ছে — একটু পরে আবার চেষ্টা করুন";
  if (m.includes("invalid") && m.includes("credentials")) return "ইমেইল অথবা পাসওয়ার্ড ভুল";
  if (m.includes("rate")) return "একটু পরে আবার চেষ্টা করুন";
  return msg;
}

function AuthPage() {
  const site = useSiteSettings();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: typeof errors = {};
      parsed.error.issues.forEach((i) => { fe[i.path[0] as "email" | "password"] = i.message; });
      setErrors(fe);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error || !data.user) {
      setLoading(false);
      const msg = mapAuthError(error?.message ?? "লগইন ব্যর্থ");
      setErrors({ form: msg });
      toast.error(msg);
      return;
    }
    toast.success("সফলভাবে লগইন হয়েছে!");
    const { data: roleRows } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isAdmin = roles.includes("admin") || data.user.email?.toLowerCase() === "upnex360@gmail.com";
    const isDistributor = roles.includes("distributor");
    const dest = safeRedirect(search.redirect) ?? (isAdmin ? "/admin" : isDistributor ? "/distributor" : "/dashboard");
    setLoading(false);
    navigate({ to: dest, replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40">
      <style>{`
        @keyframes si-gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes si-wave { 0%,60%,100%{transform:rotate(0deg)} 10%,30%{transform:rotate(18deg)} 20%{transform:rotate(-10deg)} }
        @keyframes si-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes si-blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.08)} 66%{transform:translate(-15px,10px) scale(0.95)} }
        .si-anim-bg{background:linear-gradient(120deg,#fde68a,#fca5a5,#c4b5fd,#7dd3fc,#86efac,#fde68a);background-size:300% 300%;animation:si-gradient-shift 14s ease-in-out infinite}
        .si-wave-hand{transform-origin:140px 140px;animation:si-wave 2.6s ease-in-out infinite}
        .si-float{animation:si-float 3.5s ease-in-out infinite}
        .si-blob{animation:si-blob 12s ease-in-out infinite}
      `}</style>
      <div className="grid min-h-screen lg:grid-cols-5">
        <aside
          className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between p-10 text-white"
          style={{ backgroundImage: "linear-gradient(160deg, oklch(0.72 0.18 70), oklch(0.65 0.2 45) 50%, oklch(0.6 0.22 25))" }}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />

          <div className="relative z-10">
            <Link to="/" aria-label="হোম পেজে ফিরুন" className="flex items-center gap-3 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg ring-1 ring-white/30 overflow-hidden">
                {site.logo_url ? (
                  <img src={site.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Sparkles className="h-7 w-7" />
                )}
              </div>
              <div>
                <p className="bn-display text-2xl leading-tight">{site.site_name}</p>
                <p className="text-xs text-white/80">{site.tagline || "হোমে ফিরে যান"}</p>
              </div>
            </Link>

            <h1 className="bn-display mt-16 text-4xl leading-tight">
              Like, Comment করে<br/>টাকা Income করুন
            </h1>
            <p className="mt-4 max-w-md text-white/90 leading-relaxed">
              ঘরে বসে মোবাইল দিয়ে আয় করার বাংলাদেশের #১ বিশ্বস্ত প্ল্যাটফর্ম।
            </p>

            <ul className="mt-8 space-y-4">
              {[
                { Icon: ShieldCheck, t: "১০০% নিরাপদ ও যাচাইকৃত প্ল্যাটফর্ম" },
                { Icon: Zap, t: "bKash / Nagad / Rocket ইনস্ট্যান্ট পেমেন্ট" },
                { Icon: Gift, t: "প্রতিটি রেফারে অতিরিক্ত ৳৫০ বোনাস" },
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

        <main className="relative flex items-start lg:items-center justify-center px-5 py-6 sm:px-10 lg:col-span-3 lg:py-10">
          {/* Mobile-only animated colorful background */}
          <div className="pointer-events-none absolute inset-0 lg:hidden overflow-hidden">
            <div className="absolute inset-0 si-anim-bg opacity-70" />
            <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-fuchsia-300/50 blur-3xl si-blob" />
            <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-sky-300/50 blur-3xl si-blob" style={{ animationDelay: "-4s" }} />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-300/50 blur-3xl si-blob" style={{ animationDelay: "-8s" }} />
          </div>

          <div className="relative w-full max-w-md">
            {/* Mobile hero: waving character + centered brand */}
            <div className="lg:hidden flex flex-col items-center text-center">
              <div className="si-float">
                <WavingCharacter />
              </div>
              <Link to="/" aria-label="হোম" className="mt-2 flex flex-col items-center gap-2">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 text-white shadow-xl ring-2 ring-white/60 overflow-hidden">
                  {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-7 w-7" />}
                </div>
                <span className="bn-display text-2xl text-slate-900 drop-shadow-sm">{site.site_name}</span>
              </Link>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> SMART NETWORK BD
              </span>
              <h1 className="bn-display mt-3 text-2xl text-slate-900">আপনার একাউন্টে লগইন</h1>
              <p className="mt-1.5 text-sm text-slate-700">আবার স্বাগতম! ড্যাশবোর্ডে প্রবেশ করুন।</p>
            </div>

            {/* Desktop brand header */}
            <div className="hidden lg:block">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Sparkles className="h-3.5 w-3.5" /> SMART NETWORK BD
              </span>
              <h1 className="bn-display mt-4 text-3xl text-slate-900">আপনার একাউন্টে লগইন</h1>
              <p className="mt-2 text-sm text-slate-600">আবার স্বাগতম! আপনার ড্যাশবোর্ডে প্রবেশ করুন।</p>
            </div>

            {/* Form card — colorful frame on mobile */}
            <div
              className="mt-5 rounded-3xl bg-white/85 backdrop-blur-xl p-5 sm:p-6 shadow-2xl ring-1 ring-white/60 lg:bg-transparent lg:shadow-none lg:ring-0 lg:p-0 lg:backdrop-blur-none lg:mt-7"
              style={{ boxShadow: "0 20px 60px -20px rgba(244, 114, 182, 0.35), 0 10px 30px -15px rgba(59, 130, 246, 0.25)" }}
            >
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Field
                  icon={Mail}
                  label="ইমেইল"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  error={errors.email}
                />

                <div>
                  <label className="text-sm font-medium text-slate-700">পাসওয়ার্ড</label>
                  <div className="relative mt-1.5">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-xl border-2 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:ring-4 ${
                        errors.password
                          ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
                          : "border-slate-200 focus:border-amber-400 focus:ring-amber-100"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                      aria-label={showPw ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <InlineError msg={errors.password} />}
                </div>

                {errors.form && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 border border-rose-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errors.form}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl hover:brightness-110 disabled:opacity-70"
                  style={{ backgroundImage: "linear-gradient(90deg,#f59e0b,#ef4444,#ec4899,#8b5cf6)" }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  লগইন করুন
                </button>
              </form>

              <Link
                to="/register"
                className="mt-5 flex items-center justify-between rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50 via-rose-50 to-fuchsia-50 px-4 py-3 text-sm font-medium text-amber-900 hover:from-amber-100 hover:to-fuchsia-100 transition"
              >
                <span className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  নতুন এখানে? ৳৩০০ সাইনআপ বোনাস
                </span>
                <ArrowRight className="h-4 w-4 text-amber-700" />
              </Link>

              <p className="mt-4 text-center text-xs text-slate-500">
                একাউন্ট তৈরি করার মাধ্যমে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন।
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function WavingCharacter() {
  return (
    <svg width="140" height="140" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="siBodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id="siHeadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="86" fill="#ffffff" opacity="0.4" />
      <path d="M55 175 C55 135, 145 135, 145 175 Z" fill="url(#siBodyGrad)" />
      <circle cx="100" cy="88" r="38" fill="url(#siHeadGrad)" stroke="#f59e0b" strokeWidth="2" />
      <path d="M72 72 Q100 50 128 72 Q112 60 100 62 Q88 60 72 72Z" fill="#7c2d12" />
      <circle cx="88" cy="88" r="4" fill="#1f2937" />
      <circle cx="112" cy="88" r="4" fill="#1f2937" />
      <circle cx="89" cy="87" r="1.3" fill="#fff" />
      <circle cx="113" cy="87" r="1.3" fill="#fff" />
      <path d="M88 102 Q100 112 112 102" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="100" r="4" fill="#fb7185" opacity="0.7" />
      <circle cx="120" cy="100" r="4" fill="#fb7185" opacity="0.7" />
      <path d="M60 145 Q50 160 55 175" stroke="url(#siBodyGrad)" strokeWidth="12" fill="none" strokeLinecap="round" />
      <g className="si-wave-hand">
        <path d="M140 145 Q158 120 155 95" stroke="url(#siBodyGrad)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <circle cx="155" cy="90" r="11" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      </g>
      <g fill="#fbbf24">
        <circle cx="40" cy="60" r="2.5" />
        <circle cx="170" cy="70" r="2" />
        <circle cx="30" cy="120" r="2" />
        <circle cx="175" cy="130" r="2.5" />
      </g>
    </svg>
  );
}

function InlineError({ msg }: { msg: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-rose-600">
      <AlertCircle className="h-3.5 w-3.5" /> {msg}
    </p>
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
  error?: string;
};

function Field({ icon: Icon, label, value, onChange, placeholder, type = "text", maxLength, autoComplete, error }: FieldProps) {
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
          className={`w-full rounded-xl border-2 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:ring-4 ${
            error
              ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
              : "border-slate-200 focus:border-amber-400 focus:ring-amber-100"
          }`}
        />
      </div>
      {error && <InlineError msg={error} />}
    </div>
  );
}
