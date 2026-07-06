import { useState } from "react";
import { toast } from "sonner";
import { LockKeyhole, Pencil, Save, X } from "lucide-react";
import { GradientButton } from "@/components/admin/AdminUI";
import { updateUser } from "@/lib/admin-client";

export type UserEditInitial = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  balance: number | string | null;
  locked_balance: number | string | null;
  payment_method?: string | null;
  payment_number?: string | null;
  status?: string | null;
};

export function UserEditDrawer({
  userId, initial, onClose, onSaved,
}: { userId: string; initial: UserEditInitial; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: initial.full_name ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    balance: String(initial.balance ?? 0),
    locked_balance: String(initial.locked_balance ?? 0),
    payment_method: initial.payment_method ?? "bkash",
    payment_number: initial.payment_number ?? "",
    status: initial.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  const balancePreview = Math.max(Number(form.balance) || 0, 0);
  const lockedPreview = Math.max(Number(form.locked_balance) || 0, 0);

  const save = async () => {
    setSaving(true);
    try {
      await updateUser(userId, {
        ...form,
        balance: balancePreview,
        locked_balance: lockedPreview,
      });
      toast.success("সেভ হয়েছে ✓");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 animate-in fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in slide-in-from-bottom-4">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-3xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"><Pencil className="h-4 w-4" /></div>
            <div>
              <p className="bn-display text-base">ইউজার এডিট</p>
          <p className="text-[11px] text-white/85">লকড ব্যালেন্স সংরক্ষিত থাকবে, উইথড্র-এ কাটবে না</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 hover:bg-white/25"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 grid gap-3 sm:grid-cols-2">
          <Field label="পূর্ণ নাম"      value={form.full_name}      onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
          <Field label="ফোন"             value={form.phone}          onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Field label="ইমেইল"           value={form.email}          onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <SelectField label="স্ট্যাটাস" value={form.status}         onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={["active","suspended","banned"]} />
          <Field label="উইথড্রযোগ্য ব্যালেন্স (৳)" value={form.balance}        onChange={(v) => setForm((f) => ({ ...f, balance: v }))} type="number" min="0" />
          <Field label="লকড ব্যালেন্স (শুধু সংরক্ষিত)" value={form.locked_balance} onChange={(v) => setForm((f) => ({ ...f, locked_balance: v }))} type="number" min="0" />
          <SelectField label="পেমেন্ট মেথড" value={form.payment_method} onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))} options={["bkash","nagad","rocket"]} />
          <Field label="পেমেন্ট নম্বর"   value={form.payment_number} onChange={(v) => setForm((f) => ({ ...f, payment_number: v }))} />
        </div>

        <div className="mx-4 mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            লকড ব্যালেন্স ৳{lockedPreview.toLocaleString("bn-BD")} আলাদা সংরক্ষিত থাকবে; ইউজারের উইথড্রযোগ্য ব্যালেন্স থাকবে ৳{balancePreview.toLocaleString("bn-BD")}।
          </p>
        </div>

        <div className="sticky bottom-0 flex gap-2 rounded-b-3xl border-t border-slate-100 bg-white p-3">
          <button onClick={onClose} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">বাতিল</button>
          <GradientButton accent="emerald" onClick={save} busy={saving} className="flex-1 justify-center">
            <Save className="h-4 w-4" /> সেভ করুন
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", min }: { label: string; value: string; onChange: (v: string) => void; type?: string; min?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} min={min} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300/40" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300/40">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
