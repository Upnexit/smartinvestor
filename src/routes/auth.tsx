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

import {
  FloatingHeroReactions,
  FacebookIcon,
  YouTubeIcon,
  FbLikeReaction,
  FbLoveReaction,
} from "@/components/home/FloatingHeroReactions";

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
      { title: "লগইন — Smart Click BD" },
      { name: "description", content: "Smart Click BD অ্যাকাউন্টে লগইন করুন।" },
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
    <div className="relative min-h-screen overflow-hidden">
      <style>{`
        @keyframes si-gradient-shift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes si-blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-15px) scale(1.08)} 66%{transform:translate(-15px,10px) scale(0.95)} }
        @keyframes si-arm-dangle { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
        @keyframes si-arm-dangle-2 { 0%,100%{transform:rotate(5deg)} 50%{transform:rotate(-7deg)} }
        @keyframes si-leg-swing { 0%,100%{transform:rotate(-14deg)} 50%{transform:rotate(18deg)} }
        @keyframes si-leg-swing-2 { 0%,100%{transform:rotate(16deg)} 50%{transform:rotate(-12deg)} }
        @keyframes si-blink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
        @keyframes si-breathe { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-2px) scale(1.01)} }
        .si-anim-bg{background:linear-gradient(120deg,#fde68a,#fca5a5,#c4b5fd,#7dd3fc,#86efac,#fbcfe8,#fde68a);background-size:400% 400%;animation:si-gradient-shift 18s ease-in-out infinite}
        .si-blob{animation:si-blob 12s ease-in-out infinite}
        .si-arm-l{transform-origin:82px 118px;animation:si-arm-dangle 3.2s ease-in-out infinite}
        .si-arm-r{transform-origin:138px 118px;animation:si-arm-dangle-2 3.2s ease-in-out infinite}
        .si-leg-l{transform-origin:92px 168px;animation:si-leg-swing 2.4s ease-in-out infinite}
        .si-leg-r{transform-origin:128px 168px;animation:si-leg-swing-2 2.4s ease-in-out infinite}
        .si-eye{transform-origin:center;animation:si-blink 5s ease-in-out infinite}
        .si-breathe{animation:si-breathe 4s ease-in-out infinite}
      `}</style>

      {/* Full-page animated gradient background (mobile + desktop) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 si-anim-bg" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/20 to-white/50" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-300/40 blur-3xl si-blob" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-300/40 blur-3xl si-blob" style={{ animationDelay: "-4s" }} />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl si-blob" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="grid min-h-screen lg:grid-cols-5">
        <aside
          className="relative hidden overflow-hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between p-10 text-white"
          style={{ backgroundImage: "linear-gradient(155deg, #0f172a 0%, #1e1b4b 35%, #4338ca 70%, #e11d48 100%)" }}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-rose-500/25 blur-3xl" />

          <div className="relative z-10">
            <Link to="/" aria-label="হোম পেজে ফিরুন" className="flex items-center gap-3 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/70">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-white/30 overflow-hidden p-1">
                <img src="/logo.png" alt="Smart Click BD" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="bn-display text-2xl leading-tight">Smart Click BD</p>
                <p className="text-xs text-white/80">স্মার্ট ক্লিক বিডি</p>
              </div>
            </Link>

            <h1 className="bn-display mt-14 text-4xl leading-tight font-black">
              Like, Comment করে<br/>টাকা Income করুন
            </h1>
            <p className="mt-4 max-w-md text-white/90 leading-relaxed text-sm">
              ঘরে বসে মোবাইল দিয়ে আয় করার বাংলাদেশের #১ বিশ্বস্ত ও BTCL অনুমোদিত প্ল্যাটফর্ম।
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm ring-1 ring-white/25">
                <FacebookIcon className="h-4 w-4" />
                <FbLikeReaction className="h-4 w-4" />
                ফেসবুক লাইক
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm ring-1 ring-white/25">
                <YouTubeIcon className="h-4 w-4" />
                <FbLoveReaction className="h-4 w-4" />
                ইউটিউব কমেন্ট
              </span>
            </div>

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
                  <span className="text-white/95 text-sm font-medium">{t}</span>
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
                <p className="bn-display text-xl font-bold">{s.n}</p>
                <p className="text-xs text-white/80 mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="relative flex items-start lg:items-center justify-center px-5 py-6 sm:px-10 lg:col-span-3 lg:py-10 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            {/* Mobile hero: realistic character sitting on the logo */}
            <div className="lg:hidden flex flex-col items-center text-center">
              <div className="relative flex flex-col items-center">
                <div className="si-breathe">
                  <SittingCharacter />
                </div>
                {/* Logo the character sits on — overlaps upward so feet rest on top */}
                <Link to="/" aria-label="হোম" className="-mt-4 flex flex-col items-center gap-2">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-white shadow-2xl ring-2 ring-white/70 overflow-hidden p-1">
                    <img src="/logo.png" alt="Smart Click BD" className="h-full w-full object-contain" />
                  </div>
                  <span className="bn-display text-2xl text-slate-900 drop-shadow-sm font-extrabold">Smart Click BD</span>
                </Link>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> SMART CLICK BD
              </span>
              <h1 className="bn-display mt-3 text-2xl text-slate-900 font-bold">আপনার একাউন্টে লগইন</h1>
              <p className="mt-1.5 text-sm text-slate-700">আবার স্বাগতম! ড্যাশবোর্ডে প্রবেশ করুন।</p>
            </div>

            {/* Desktop brand header */}
            <div className="hidden lg:block">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" /> SMART CLICK BD
              </span>
              <h1 className="bn-display mt-4 text-3xl text-slate-900 font-extrabold">আপনার একাউন্টে লগইন</h1>
              <p className="mt-2 text-sm text-slate-600">আবার স্বাগতম! আপনার ড্যাশবোর্ডে প্রবেশ করুন।</p>
            </div>

            {/* Form card — white glass on both mobile and desktop */}
            <div
              className="mt-5 rounded-3xl bg-white/95 backdrop-blur-xl p-5 sm:p-6 shadow-2xl ring-1 ring-slate-200/80 lg:mt-7 lg:p-7"
              style={{ boxShadow: "0 20px 50px -15px rgba(99, 102, 241, 0.18), 0 10px 30px -10px rgba(225, 29, 72, 0.12)" }}
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
                search={search.redirect ? { redirect: search.redirect } : {}}
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

function SittingCharacter() {
  // Realistic-style cartoon person sitting: hands dangle, legs swing. viewBox 220x220.
  return (
    <svg width="170" height="170" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="siSkin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde3c7" />
          <stop offset="100%" stopColor="#f2c19a" />
        </linearGradient>
        <linearGradient id="siShirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="siPants" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id="siCheek" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft shadow under seat */}
      <ellipse cx="110" cy="205" rx="55" ry="6" fill="#000" opacity="0.12" />

      {/* Legs (swinging) — drawn first so torso sits on top */}
      <g className="si-leg-l">
        <rect x="86" y="165" width="14" height="42" rx="7" fill="url(#siPants)" />
        <ellipse cx="93" cy="210" rx="11" ry="5" fill="#0b0f19" />
      </g>
      <g className="si-leg-r">
        <rect x="120" y="165" width="14" height="42" rx="7" fill="url(#siPants)" />
        <ellipse cx="127" cy="210" rx="11" ry="5" fill="#0b0f19" />
      </g>

      {/* Torso / shirt */}
      <path d="M75 118 Q75 100 90 96 L130 96 Q145 100 145 118 L148 168 Q110 178 72 168 Z" fill="url(#siShirt)" />
      {/* Shirt collar */}
      <path d="M100 96 Q110 108 120 96 Z" fill="#1e3a8a" opacity="0.35" />
      {/* Shirt shading */}
      <path d="M75 118 Q80 140 78 168 L72 168 Z" fill="#000" opacity="0.08" />

      {/* Arms (dangling / swinging) */}
      <g className="si-arm-l">
        <path d="M82 118 Q70 145 74 165" stroke="url(#siShirt)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <circle cx="74" cy="167" r="8" fill="url(#siSkin)" stroke="#c98a5b" strokeWidth="1" />
      </g>
      <g className="si-arm-r">
        <path d="M138 118 Q150 145 146 165" stroke="url(#siShirt)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <circle cx="146" cy="167" r="8" fill="url(#siSkin)" stroke="#c98a5b" strokeWidth="1" />
      </g>

      {/* Neck */}
      <rect x="102" y="86" width="16" height="16" fill="url(#siSkin)" />

      {/* Head */}
      <ellipse cx="110" cy="66" rx="34" ry="36" fill="url(#siSkin)" stroke="#c98a5b" strokeWidth="1.2" />
      {/* Hair */}
      <path d="M76 60 Q78 32 110 28 Q142 32 144 60 Q138 46 122 44 Q112 40 98 44 Q82 46 76 60 Z" fill="#2b1a10" />
      {/* Ears */}
      <ellipse cx="76" cy="68" rx="5" ry="7" fill="url(#siSkin)" stroke="#c98a5b" strokeWidth="1" />
      <ellipse cx="144" cy="68" rx="5" ry="7" fill="url(#siSkin)" stroke="#c98a5b" strokeWidth="1" />

      {/* Eyebrows */}
      <path d="M92 58 Q99 54 106 58" stroke="#2b1a10" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M114 58 Q121 54 128 58" stroke="#2b1a10" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Eyes (blinking) */}
      <g className="si-eye" style={{ transformOrigin: "99px 68px" }}>
        <ellipse cx="99" cy="68" rx="4" ry="5" fill="#1f2937" />
        <circle cx="100" cy="66.5" r="1.3" fill="#fff" />
      </g>
      <g className="si-eye" style={{ transformOrigin: "121px 68px", animationDelay: "0.05s" }}>
        <ellipse cx="121" cy="68" rx="4" ry="5" fill="#1f2937" />
        <circle cx="122" cy="66.5" r="1.3" fill="#fff" />
      </g>

      {/* Nose */}
      <path d="M110 72 Q108 80 112 82" stroke="#c98a5b" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* Cheeks */}
      <circle cx="90" cy="80" r="6" fill="url(#siCheek)" />
      <circle cx="130" cy="80" r="6" fill="url(#siCheek)" />

      {/* Smile */}
      <path d="M100 86 Q110 92 120 86" stroke="#7c2d12" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Small sparkles */}
      <g fill="#fbbf24">
        <circle cx="40" cy="50" r="2" />
        <circle cx="185" cy="55" r="1.8" />
        <circle cx="30" cy="130" r="1.8" />
        <circle cx="190" cy="140" r="2" />
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
