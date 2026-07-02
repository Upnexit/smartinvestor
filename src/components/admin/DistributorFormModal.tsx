import { useState, useEffect, useMemo } from "react";
import {
  X, Loader2, Eye, EyeOff, RefreshCw, Copy, Check,
  User as UserIcon, Mail, Lock, Phone as PhoneIcon, MapPin, Wallet,
  Percent, FileText, Sparkles, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { BD_DISTRICTS } from "@/lib/bd-districts";
import { BD_THANAS, NOTE_PRESETS } from "@/lib/bd-thanas";
import { createDistributor, updateDistributor } from "@/lib/admin-client";

type DistributorRow = {
  user_id: string; full_name: string; email: string; phone: string | null;
  payment_method: string | null; payment_number: string | null;
  district: string | null; thana: string | null; address: string | null;
  commission_rate: number; status: string; notes: string | null;
};

const PAYMENT_OPTIONS = [
  { value: "bkash", label: "bKash", gradient: "from-pink-500 to-rose-600", ring: "ring-pink-200" },
  { value: "nagad", label: "Nagad", gradient: "from-orange-500 to-amber-600", ring: "ring-orange-200" },
  { value: "rocket", label: "Rocket", gradient: "from-purple-500 to-indigo-600", ring: "ring-purple-200" },
] as const;

export function DistributorFormModal({
  open, onClose, onSaved, editing, prefill, applicationId, initialBalance,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  editing?: DistributorRow | null;
  prefill?: Partial<DistributorRow> | null;
  applicationId?: string | null;
  initialBalance?: number;
}) {
  const isEdit = !!editing;

  const [form, setForm] = useState({
    full_name: "", email: "", password: "",
    phone: "", payment_method: "bkash", payment_number: "",
    district: "", thana: "", address: "",
    commission_rate: 5, notes: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        full_name: editing.full_name ?? "",
        email: editing.email ?? "",
        password: "",
        phone: editing.phone ?? "",
        payment_method: editing.payment_method ?? "bkash",
        payment_number: editing.payment_number ?? "",
        district: editing.district ?? "",
        thana: editing.thana ?? "",
        address: editing.address ?? "",
        commission_rate: editing.commission_rate ?? 5,
        notes: editing.notes ?? "",
      });
    } else {
      setForm({
        full_name: "", email: "", password: genPassword(),
        phone: "", payment_method: "bkash", payment_number: "",
        district: "", thana: "", address: "",
        commission_rate: 5, notes: "",
      });
    }
    setShowPw(false); setCopied(false);
  }, [editing, open]);

  // Form completion meter
  const completion = useMemo(() => {
    const req = ["full_name", "email", "phone", "payment_number", "district"];
    const filled = req.filter((k) => String((form as unknown as Record<string, unknown>)[k] ?? "").trim()).length;
    return Math.round((filled / req.length) * 100);
  }, [form]);

  if (!open) return null;

  function validate() {
    if (!form.full_name || form.full_name.trim().length < 2) { toast.error("পুরো নাম দিন (২+ অক্ষর)"); return false; }
    if (!isEdit) {
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("সঠিক ইমেইল দিন"); return false; }
      if (!form.password || form.password.length < 6) { toast.error("পাসওয়ার্ড ৬+ অক্ষর হতে হবে"); return false; }
    }
    if (form.phone && !/^01[0-9]{9}$/.test(form.phone)) { toast.error("ফোন নম্বর সঠিক নয় (01XXXXXXXXX)"); return false; }
    if (form.payment_number && !/^01[0-9]{9}$/.test(form.payment_number)) { toast.error("পেমেন্ট নম্বর সঠিক নয়"); return false; }
    if (form.commission_rate < 0 || form.commission_rate > 100) { toast.error("কমিশন ০-১০০ এর মধ্যে"); return false; }
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isEdit && editing) {
        await updateDistributor(editing.user_id, { ...form, password: undefined });
        toast.success("ডিস্ট্রিবিউটর আপডেট হয়েছে ✓");
      } else {
        await createDistributor(form);
        toast.success("নতুন ডিস্ট্রিবিউটর তৈরি হয়েছে ✓");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "সংরক্ষণ ব্যর্থ");
    } finally { setBusy(false); }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      toast.success("পাসওয়ার্ড কপি হয়েছে");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("কপি ব্যর্থ"); }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start bg-slate-900/70 backdrop-blur-md px-3 py-6 overflow-y-auto"
      role="dialog" aria-modal
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl mx-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-admin-pop">
        {/* Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_40%,white_0,transparent_40%),radial-gradient(circle_at_70%_60%,white_0,transparent_30%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/40">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="bn-display text-xl text-white leading-tight">
                  {isEdit ? "ডিস্ট্রিবিউটর সম্পাদনা" : "নতুন ডিস্ট্রিবিউটর যোগ করুন"}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {isEdit ? "তথ্য আপডেট করে সংরক্ষণ করুন" : "এজেন্ট অ্যাকাউন্ট তৈরি — তিনি ইমেইল/পাসওয়ার্ড দিয়ে লগইন করবেন"}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label="বন্ধ"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Progress */}
          <div className="relative mt-4">
            <div className="flex items-center justify-between text-[11px] text-white/80 mb-1.5">
              <span>প্রোফাইল সম্পূর্ণতা</span>
              <span className="font-bold tabular-nums">{completion}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-300 to-lime-200 transition-all duration-500"
                style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* ─── Personal Info ─── */}
          <Section icon={<UserIcon className="h-4 w-4" />} title="ব্যক্তিগত তথ্য" accent="indigo">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="পুরো নাম" required value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                icon={<UserIcon className="h-4 w-4" />} placeholder="মোঃ আব্দুল করিম" />
              <Field label="ফোন নম্বর" value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                icon={<PhoneIcon className="h-4 w-4" />} placeholder="01XXXXXXXXX" />
            </div>
          </Section>

          {/* ─── Login Account ─── */}
          <Section icon={<ShieldCheck className="h-4 w-4" />} title="লগইন অ্যাকাউন্ট" accent="violet">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={isEdit ? "ইমেইল (পরিবর্তনযোগ্য নয়)" : "ইমেইল"}
                required={!isEdit} type="email" value={form.email} disabled={isEdit}
                onChange={(v) => setForm({ ...form, email: v.toLowerCase() })}
                icon={<Mail className="h-4 w-4" />} placeholder="agent@example.com" />
              {!isEdit && (
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-violet-600" /> পাসওয়ার্ড <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPw ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 pr-24 text-sm font-mono outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button type="button" onClick={() => setShowPw((v) => !v)}
                        title={showPw ? "লুকান" : "দেখান"}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={copyPassword}
                        title="কপি করুন"
                        className="grid h-8 w-8 place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => setForm({ ...form, password: genPassword() })}
                        title="নতুন পাসওয়ার্ড"
                        className="grid h-8 w-8 place-items-center rounded-lg text-violet-600 hover:bg-violet-50">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    এটি কপি করে এজেন্টকে শেয়ার করুন — তিনি লগইনের পর পরিবর্তন করতে পারবেন।
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* ─── Payment ─── */}
          <Section icon={<Wallet className="h-4 w-4" />} title="পেমেন্ট তথ্য" accent="emerald">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">পেমেন্ট মাধ্যম</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const active = form.payment_method === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => setForm({ ...form, payment_method: opt.value })}
                        className={[
                          "relative rounded-xl px-3 py-2.5 text-sm font-bold transition-all border-2",
                          active
                            ? `text-white bg-gradient-to-br ${opt.gradient} border-transparent shadow-lg ring-4 ${opt.ring}`
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                        ].join(" ")}
                      >
                        {opt.label}
                        {active && <Check className="absolute top-1 right-1 h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label="পেমেন্ট নম্বর" value={form.payment_number}
                onChange={(v) => setForm({ ...form, payment_number: v })}
                icon={<PhoneIcon className="h-4 w-4" />} placeholder="01XXXXXXXXX" />
            </div>
          </Section>

          {/* ─── Location ─── */}
          <Section icon={<MapPin className="h-4 w-4" />} title="ঠিকানা ও এলাকা" accent="sky">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" /> জেলা
                </label>
                <select value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value, thana: "" })}
                  className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
                  <option value="">— জেলা নির্বাচন করুন —</option>
                  {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" /> থানা / উপজেলা
                </label>
                {form.district && (BD_THANAS[form.district]?.length ?? 0) > 0 ? (
                  <select value={form.thana}
                    onChange={(e) => setForm({ ...form, thana: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
                    <option value="">— থানা নির্বাচন করুন —</option>
                    {BD_THANAS[form.district].map((t) => <option key={t} value={t}>{t}</option>)}
                    <option value="__other__">অন্যান্য (নিজে লিখুন)</option>
                  </select>
                ) : (
                  <input value={form.thana}
                    onChange={(e) => setForm({ ...form, thana: e.target.value })}
                    placeholder={form.district ? "থানার নাম লিখুন" : "প্রথমে জেলা নির্বাচন করুন"}
                    disabled={!form.district}
                    className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-400" />
                )}
                {form.thana === "__other__" && (
                  <input autoFocus placeholder="থানার নাম লিখুন"
                    onChange={(e) => setForm({ ...form, thana: e.target.value })}
                    className="mt-2 w-full rounded-xl border-2 border-sky-200 bg-sky-50/40 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sky-600" /> গ্রাম / মহল্লা / বিস্তারিত ঠিকানা
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">ঐচ্ছিক</span>
              </label>
              <input value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="গ্রাম, মহল্লা, রাস্তা, বাড়ি নং…"
                className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
            </div>
          </Section>

          {/* ─── Commission & Notes ─── */}
          <Section icon={<Percent className="h-4 w-4" />} title="কমিশন ও অন্যান্য" accent="amber">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-amber-600" /> কমিশন রেট (%)
                </label>
                <div className="relative mt-1.5">
                  <input type="number" min={0} max={100} step={0.5} value={form.commission_rate}
                    onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
                    className="w-full rounded-xl border-2 border-amber-200 bg-amber-50/40 px-3 py-2.5 pr-8 text-sm font-bold text-amber-900 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 font-bold">%</span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {[3, 5, 7, 10].map((v) => (
                    <button key={v} type="button"
                      onClick={() => setForm({ ...form, commission_rate: v })}
                      className={[
                        "flex-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition",
                        form.commission_rate === v
                          ? "bg-amber-500 text-white"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                      ].join(" ")}>
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-600" /> নোট / মন্তব্য
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">প্রিসেট ক্লিক করুন</span>
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {NOTE_PRESETS.map((p) => (
                    <button key={p.label} type="button"
                      onClick={() => setForm({ ...form, notes: form.notes ? `${form.notes}\n${p.text}` : p.text })}
                      className="rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:from-indigo-100 hover:to-violet-100 hover:border-indigo-300 transition">
                      + {p.label}
                    </button>
                  ))}
                </div>
                <textarea value={form.notes} rows={3}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ইন্টারনাল রেফারেন্স, চুক্তির বিবরণ ইত্যাদি… অথবা উপরের প্রিসেট ক্লিক করুন।"
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 resize-none" />
                {form.notes && (
                  <button type="button" onClick={() => setForm({ ...form, notes: "" })}
                    className="mt-1 text-[11px] text-rose-600 hover:text-rose-700 font-bold">
                    × সাফ করুন
                  </button>
                )}
              </div>
            </div>
          </Section>
        </form>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-500">
            {isEdit ? "ইমেইল ছাড়া সব ফিল্ড আপডেট করা যাবে।" : "অ্যাকাউন্ট তৈরির পর এজেন্ট সরাসরি ডিস্ট্রিবিউটর প্যানেলে লগইন করতে পারবেন।"}
          </p>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} disabled={busy}
              className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              বাতিল
            </button>
            <button type="button" onClick={submit} disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-300 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> সংরক্ষণ হচ্ছে…</>
                : <><Sparkles className="h-4 w-4" /> {isEdit ? "আপডেট করুন" : "তৈরি করুন"}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─── */

function Section({
  icon, title, accent, children,
}: { icon: React.ReactNode; title: string; accent: "indigo" | "violet" | "emerald" | "sky" | "amber"; children: React.ReactNode }) {
  const ring: Record<typeof accent, string> = {
    indigo: "from-indigo-500 to-blue-600",
    violet: "from-violet-500 to-fuchsia-600",
    emerald: "from-emerald-500 to-teal-600",
    sky: "from-sky-500 to-cyan-600",
    amber: "from-amber-500 to-orange-600",
  };
  return (
    <section className="rounded-2xl bg-slate-50/60 ring-1 ring-slate-100 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${ring[accent]} text-white shadow`}>
          {icon}
        </div>
        <h4 className="text-sm font-extrabold text-slate-800 bn-display">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, disabled, required, icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean; required?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input type={type} value={value} disabled={disabled} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500" />
    </div>
  );
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "@" + Math.floor(Math.random() * 90 + 10);
}
