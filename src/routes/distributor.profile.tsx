import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User as UserIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader, AdminCard, GradientButton } from "@/components/admin/AdminUI";
import { BD_DISTRICTS } from "@/lib/bd-districts";
import { getMyDistributorBundle, updateMyDistributorProfile } from "@/lib/admin-client";

export const Route = createFileRoute("/distributor/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [form, setForm] = useState({ full_name: "", phone: "", payment_method: "bkash", payment_number: "", district: "", thana: "", address: "" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await getMyDistributorBundle() as { profile: Record<string, string | null> | null };
        const p = r.profile;
        if (p) {
          setEmail(p.email ?? "");
          setForm({
            full_name: p.full_name ?? "", phone: p.phone ?? "",
            payment_method: p.payment_method ?? "bkash", payment_number: p.payment_number ?? "",
            district: p.district ?? "", thana: p.thana ?? "", address: p.address ?? "",
          });
        }
      } catch { /* ignore */ }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateMyDistributorProfile(form);
      toast.success("প্রোফাইল আপডেট হয়েছে");
    } catch (err) { toast.error(err instanceof Error ? err.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="আমার প্রোফাইল" subtitle="যোগাযোগ ও পেমেন্ট তথ্য আপডেট করুন" Icon={UserIcon} accent="purple" />
      <AdminCard accent="purple" className="p-5">
        <form onSubmit={save} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="পুরো নাম" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
            <Field label="ইমেইল (পরিবর্তনযোগ্য নয়)" value={email} disabled />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="ফোন নম্বর" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <div>
              <label className="text-xs font-bold text-slate-600">পেমেন্ট মেথড</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400">
                <option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="rocket">Rocket</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="পেমেন্ট নম্বর" value={form.payment_number} onChange={(v) => setForm({ ...form, payment_number: v })} />
            <div>
              <label className="text-xs font-bold text-slate-600">জেলা</label>
              <select value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400">
                <option value="">— নির্বাচন —</option>
                {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="থানা / উপজেলা" value={form.thana} onChange={(v) => setForm({ ...form, thana: v })} />
            <Field label="ঠিকানা" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          </div>
          <div className="flex justify-end pt-2">
            <GradientButton accent="purple" type="submit" busy={busy}><Save className="h-4 w-4" /> সংরক্ষণ</GradientButton>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-600">{label}</label>
      <input value={value} onChange={(e) => onChange?.(e.target.value)} disabled={disabled}
        className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50 disabled:text-slate-500" />
    </div>
  );
}
