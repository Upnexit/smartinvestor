import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  Crown, User, Phone, Mail, MapPin, Wallet, ArrowLeft, ArrowRight,
  Loader2, CheckCircle2, Home, Sparkles, FileText, Lock, Eye, EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BD_DISTRICTS } from "@/lib/bd-districts";
import { BD_THANAS } from "@/lib/bd-thanas";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/distributor-apply")({
  head: () => ({
    meta: [
      { title: "ডিস্ট্রিবিউটর আবেদন — Smart Investor" },
      { name: "description", content: "Smart Investor এর অফিসিয়াল ডিস্ট্রিবিউটর হতে এখনই আবেদন করুন।" },
    ],
  }),
  component: DistributorApplyPage,
});

const PAYMENTS = [
  { value: "bkash",  label: "বিকাশ",  gradient: "from-pink-500 to-rose-600" },
  { value: "nagad",  label: "নগদ",    gradient: "from-orange-500 to-amber-600" },
  { value: "rocket", label: "রকেট",   gradient: "from-purple-500 to-indigo-600" },
] as const;

function DistributorApplyPage() {
  const { site_name } = useSiteSettings();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    full_name: "", father_name: "", phone: "", email: "",
    password: "", confirm_password: "",
    district: "", thana: "", address: "",
    payment_method: "bkash" as "bkash"|"nagad"|"rocket",
    payment_number: "", experience: "",
  });

  const thanas = useMemo(() => (form.district ? BD_THANAS[form.district] ?? [] : []), [form.district]);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.full_name.trim().length < 2) return toast.error("পুরো নাম দিন");
    if (!/^01[0-9]{9}$/.test(form.phone)) return toast.error("সঠিক ফোন নম্বর দিন (01XXXXXXXXX)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error("সঠিক ইমেইল দিন");
    if (form.password.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে");
    if (form.password !== form.confirm_password) return toast.error("পাসওয়ার্ড মিলছে না");
    if (!form.district) return toast.error("জেলা নির্বাচন করুন");
    if (!form.thana) return toast.error("উপজেলা নির্বাচন করুন");
    if (form.address.trim().length < 5) return toast.error("বিস্তারিত ঠিকানা দিন");
    if (!/^01[0-9]{9}$/.test(form.payment_number)) return toast.error("সঠিক পেমেন্ট নম্বর দিন");

    setBusy(true);
    try {
      const { error } = await supabase.from("distributor_applications").insert({
        full_name: form.full_name.trim(),
        father_name: form.father_name.trim() || null,
        phone: form.phone,
        email: form.email.toLowerCase().trim(),
        password: form.password,
        district: form.district,
        thana: form.thana,
        address: form.address.trim(),
        payment_method: form.payment_method,
        payment_number: form.payment_number,
        experience: form.experience.trim() || null,
      });
      if (error) throw error;
      setDone(true);
      toast.success("আবেদন সফলভাবে জমা হয়েছে ✓");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "আবেদন ব্যর্থ";
      toast.error(msg);
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 grid place-items-center p-6">
        <Toaster position="top-center" />
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl ring-1 ring-indigo-100">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="bn-display mt-5 text-2xl text-slate-900">আবেদন সম্পন্ন!</h1>
          <p className="mt-3 text-sm text-slate-600">
            আপনার আবেদন সফলভাবে জমা হয়েছে। আমাদের টিম <b>২৪ ঘণ্টার</b> মধ্যে যাচাই করে
            আপনার সাথে যোগাযোগ করবে। অ্যাপ্রুভ হলে আপনার ইমেইলে লগইন তথ্য পাঠানো হবে।
          </p>
          <div className="mt-6 flex gap-2">
            <Link to="/" className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-soft hover:border-indigo-400">
              <Home className="h-4 w-4" /> হোম
            </Link>
            <button onClick={() => navigate({ to: "/distributor-info" })} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-md">
              বিস্তারিত <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white via-indigo-50/40 to-fuchsia-50/40">
      <Toaster position="top-center" />
      <header className="sticky top-0 z-40 border-b border-indigo-100 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/distributor-info" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" /> বিস্তারিত
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white">
              <Crown className="h-4 w-4" />
            </div>
            <span className="bn-display text-lg text-slate-900">{site_name}</span>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-500/30">
          <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
          <div className="relative flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">অফিসিয়াল আবেদন ফর্ম</p>
              <h1 className="bn-display text-2xl sm:text-3xl">ডিস্ট্রিবিউটর হওয়ার আবেদন</h1>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl bg-white/80 p-6 shadow-soft ring-1 ring-slate-200 backdrop-blur">
          {/* Personal */}
          <SectionTitle icon={<User className="h-4 w-4" />}>ব্যক্তিগত তথ্য</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="পুরো নাম *" icon={<User className="h-4 w-4" />} value={form.full_name} onChange={(v) => set("full_name", v)} placeholder="মোঃ আব্দুল করিম" />
            <Field label="পিতার নাম" icon={<User className="h-4 w-4" />} value={form.father_name} onChange={(v) => set("father_name", v)} placeholder="মোঃ ..." />
            <Field label="মোবাইল নম্বর *" icon={<Phone className="h-4 w-4" />} value={form.phone} onChange={(v) => set("phone", v.replace(/\D/g, "").slice(0, 11))} placeholder="01XXXXXXXXX" />
            <Field label="ইমেইল *" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" type="email" />
          </div>

          {/* Location */}
          <SectionTitle icon={<MapPin className="h-4 w-4" />}>আপনার এলাকা</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="জেলা *" value={form.district} onChange={(v) => { set("district", v); set("thana", ""); }} options={BD_DISTRICTS} placeholder="জেলা নির্বাচন করুন" />
            <Select label="উপজেলা / থানা *" value={form.thana} onChange={(v) => set("thana", v)} options={thanas} placeholder={form.district ? "উপজেলা নির্বাচন করুন" : "প্রথমে জেলা বাছুন"} disabled={!form.district} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">বিস্তারিত ঠিকানা *</label>
            <textarea value={form.address} onChange={(e) => set("address", e.target.value)}
              rows={2} placeholder="গ্রাম / ওয়ার্ড / বাসার নম্বর / পোস্ট অফিস..."
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </div>

          {/* Payment */}
          <SectionTitle icon={<Wallet className="h-4 w-4" />}>পেমেন্ট মাধ্যম</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-3">
            {PAYMENTS.map((p) => {
              const active = form.payment_method === p.value;
              return (
                <button key={p.value} type="button" onClick={() => set("payment_method", p.value)}
                  className={`rounded-xl border-2 p-3 text-sm font-bold transition ${active
                    ? `border-transparent bg-gradient-to-br ${p.gradient} text-white shadow-md`
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <Field label="পেমেন্ট নম্বর *" icon={<Phone className="h-4 w-4" />} value={form.payment_number} onChange={(v) => set("payment_number", v.replace(/\D/g, "").slice(0, 11))} placeholder="01XXXXXXXXX" />

          {/* Experience */}
          <SectionTitle icon={<FileText className="h-4 w-4" />}>অতিরিক্ত (ঐচ্ছিক)</SectionTitle>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">অভিজ্ঞতা / মন্তব্য</label>
            <textarea value={form.experience} onChange={(e) => set("experience", e.target.value)} rows={3}
              placeholder="আপনার পূর্ব অভিজ্ঞতা, কেন এজেন্ট হতে চান ইত্যাদি..."
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </div>

          <button type="submit" disabled={busy}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-3.5 text-base font-bold text-white shadow-xl shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-60">
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> সাবমিট হচ্ছে...</> : <>আবেদন সাবমিট করুন <ArrowRight className="h-5 w-5" /></>}
          </button>
          <p className="text-center text-[11px] text-slate-500">
            সাবমিট করে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন। অ্যাপ্রুভ হলে ইমেইলে লগইন তথ্য পাবেন।
          </p>
        </form>
      </main>
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white">{icon}</div>
      <h3 className="bn-display text-base text-slate-900">{children}</h3>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", icon }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-xl border-2 border-slate-200 bg-white ${icon ? "pl-9" : "pl-3"} pr-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100`} />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
