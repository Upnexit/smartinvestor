import { useState, useEffect } from "react";
import { X, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminCreateDistributor, adminUpdateDistributor } from "@/lib/distributor.functions";
import { BD_DISTRICTS } from "@/lib/bd-districts";
import { GradientButton, SoftButton } from "./AdminUI";

type DistributorRow = {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  payment_method: string | null;
  payment_number: string | null;
  district: string | null;
  thana: string | null;
  address: string | null;
  commission_rate: number;
  status: string;
  notes: string | null;
};

export function DistributorFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean; onClose: () => void; onSaved: () => void;
  editing?: DistributorRow | null;
}) {
  const create = useServerFn(adminCreateDistributor);
  const update = useServerFn(adminUpdateDistributor);
  const isEdit = !!editing;

  const [form, setForm] = useState({
    full_name: "", email: "", password: "",
    phone: "", payment_method: "bkash", payment_number: "",
    district: "", thana: "", address: "",
    commission_rate: 5, notes: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
    } else if (open) {
      setForm({
        full_name: "", email: "", password: genPassword(),
        phone: "", payment_method: "bkash", payment_number: "",
        district: "", thana: "", address: "",
        commission_rate: 5, notes: "",
      });
    }
  }, [editing, open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || form.full_name.length < 2) return toast.error("নাম দিন");
    if (!isEdit && (!form.email || !form.password || form.password.length < 6))
      return toast.error("ইমেইল ও পাসওয়ার্ড দিন (৬+ অক্ষর)");
    setBusy(true);
    try {
      if (isEdit && editing) {
        await update({ data: { userId: editing.user_id, patch: { ...form, password: undefined } } });
        toast.success("আপডেট হয়েছে");
      } else {
        await create({ data: form });
        toast.success("ডিস্ট্রিবিউটর তৈরি হয়েছে");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সংরক্ষণ ব্যর্থ");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-3 py-6 overflow-y-auto" role="dialog" aria-modal>
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl animate-admin-pop">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="bn-display text-lg text-slate-900">
            {isEdit ? "ডিস্ট্রিবিউটর সম্পাদনা" : "নতুন ডিস্ট্রিবিউটর তৈরি করুন"}
          </h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="পুরো নাম *" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="ফোন নম্বর" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="01XXXXXXXXX" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={isEdit ? "ইমেইল (পরিবর্তনযোগ্য নয়)" : "ইমেইল *"} value={form.email}
              onChange={(v) => setForm({ ...form, email: v })} disabled={isEdit} type="email" />
            {!isEdit && (
              <div>
                <label className="text-xs font-bold text-slate-600">পাসওয়ার্ড *</label>
                <div className="relative mt-1">
                  <input type={showPw ? "text" : "password"} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 pr-20 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-9 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center text-slate-500 hover:bg-slate-100 rounded">
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" onClick={() => setForm({ ...form, password: genPassword() })}
                    className="absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center text-indigo-600 hover:bg-indigo-50 rounded">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600">পেমেন্ট মেথড</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
              </select>
            </div>
            <Field label="পেমেন্ট নম্বর" value={form.payment_number} onChange={(v) => setForm({ ...form, payment_number: v })} placeholder="01XXXXXXXXX" />
            <div>
              <label className="text-xs font-bold text-slate-600">কমিশন (%)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600">জেলা</label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400">
                <option value="">— জেলা নির্বাচন —</option>
                {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Field label="থানা / উপজেলা" value={form.thana} onChange={(v) => setForm({ ...form, thana: v })} />
          </div>

          <Field label="ঠিকানা" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />

          <div>
            <label className="text-xs font-bold text-slate-600">নোট</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <SoftButton onClick={onClose}>বাতিল</SoftButton>
            <GradientButton accent="indigo" type="submit" busy={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? "আপডেট" : "তৈরি করুন")}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500" />
    </div>
  );
}

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s + "@" + Math.floor(Math.random() * 90 + 10);
}
