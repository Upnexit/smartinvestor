import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Package as PackageIcon, Pencil, Trash2, X, Save, Upload, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, ConfirmDeleteModal, Shimmer } from "@/components/admin/AdminUI";
import { listPackages, savePackage, togglePackage, deletePackage, subscribeTable } from "@/lib/admin-client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/packages")({
  head: () => ({ meta: [{ title: "প্যাকেজ — Admin" }] }),
  component: PackagesPage,
});


type Pkg = {
  id: string; name: string; price: number; daily_income: number; duration_days: number;
  image_url: string | null; active: boolean; description: string | null;
};

function PackagesPage() {
  const [rows, setRows] = useState<Pkg[] | null>(null);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Pkg | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => listPackages().then((r) => setRows(r as unknown as Pkg[])).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
  useAdminAutoRefresh(refresh);
  useEffect(() => subscribeTable("packages", refresh), []);

  const onAdd = () => { setEdit({ id: "", name: "", price: 0, daily_income: 0, duration_days: 30, image_url: null, active: true, description: null }); setOpen(true); };
  const onEdit = (p: Pkg) => { setEdit({ ...p }); setOpen(true); };

  const handleSave = async () => {
    if (!edit) return;
    setBusy(true);
    try {
      await savePackage(edit.id || null, {
        name: edit.name, price: edit.price, daily_income: edit.daily_income,
        duration_days: edit.duration_days, image_url: edit.image_url, active: edit.active,
        description: edit.description,
      });
      toast.success("সেভ হয়েছে");
      setOpen(false); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  const handleToggle = async (p: Pkg) => {
    try { await togglePackage(p.id, !p.active); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  };

  const handleDelete = async () => {
    if (!del) return;
    setBusy(true);
    try { await deletePackage(del.id); toast.success("ডিলিট হয়েছে"); setDel(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  const uploadImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `pkg-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("package-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: signed } = await supabase.storage.from("package-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    setEdit((e) => e ? { ...e, image_url: signed?.signedUrl ?? path } : e);
  };

  return (
    <>
      <AdminPageHeader accent="fuchsia" Icon={PackageIcon} title="প্যাকেজ ম্যানেজমেন্ট"
        subtitle="মূল্য, দৈনিক আয়, মেয়াদ পরিচালনা"
        action={<GradientButton accent="fuchsia" onClick={onAdd}><Plus className="h-4 w-4" /> নতুন প্যাকেজ</GradientButton>}
      />

      {!rows ? <Shimmer className="h-40" /> : rows.length === 0 ? (
        <EmptyState Icon={PackageIcon} title="কোনো প্যাকেজ নেই" accent="fuchsia"
          action={<GradientButton accent="fuchsia" onClick={onAdd}><Plus className="h-4 w-4" /> নতুন তৈরি করুন</GradientButton>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <AdminCard key={p.id} accent="fuchsia" interactive className="p-4">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-32 w-full rounded-xl object-cover" />
              ) : (
                <div className="h-32 w-full rounded-xl bg-gradient-to-br from-fuchsia-100 to-pink-200 grid place-items-center text-fuchsia-600"><PackageIcon className="h-10 w-10" /></div>
              )}
              <p className="bn-display mt-3 text-lg text-slate-900">{p.name}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="bn-display text-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 bg-clip-text text-transparent">৳{Number(p.price).toLocaleString("bn-BD")}</span>
                <span className="text-[11px] text-slate-500">/ {p.duration_days} দিন</span>
              </div>
              <p className="text-xs text-emerald-600 font-bold mt-0.5">দৈনিক ৳{p.daily_income}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button onClick={() => handleToggle(p)} className={cn(
                  "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold text-white shadow-md transition-all",
                  p.active ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                           : "bg-gradient-to-br from-slate-400 to-slate-600 shadow-slate-500/30",
                )}>
                  {p.active ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                </button>
                <div className="flex gap-1">
                  <SoftButton onClick={() => onEdit(p)}><Pencil className="h-3.5 w-3.5" /></SoftButton>
                  <SoftButton accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => setDel(p)}><Trash2 className="h-3.5 w-3.5" /></SoftButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {open && edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg">{edit.id ? "প্যাকেজ এডিট" : "নতুন প্যাকেজ"}</h3>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-3">
              <Field label="নাম" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="মূল্য (৳)" type="number" value={String(edit.price)} onChange={(v) => setEdit({ ...edit, price: Number(v) })} />
                <Field label="দৈনিক আয় (৳)" type="number" value={String(edit.daily_income)} onChange={(v) => setEdit({ ...edit, daily_income: Number(v) })} />
              </div>
              <Field label="মেয়াদ (দিন)" type="number" value={String(edit.duration_days)} onChange={(v) => setEdit({ ...edit, duration_days: Number(v) })} />
              <Field label="বিবরণ" value={edit.description ?? ""} onChange={(v) => setEdit({ ...edit, description: v })} />
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">ছবি</span>
                <label className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 px-3 py-2 text-xs font-bold text-white cursor-pointer shadow-md shadow-pink-500/30 hover:scale-[1.02] transition">
                  <Upload className="h-3.5 w-3.5" /> ছবি আপলোড
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                </label>
                {edit.image_url && <img src={edit.image_url} alt="" className="mt-2 h-20 rounded-lg object-cover" />}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />
                <span className="text-sm">অ্যাক্টিভ</span>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setOpen(false)}>বাতিল</SoftButton>
              <GradientButton accent="fuchsia" className="flex-1" busy={busy} onClick={handleSave}><Save className="h-4 w-4" /> সেভ</GradientButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal open={!!del} onClose={() => setDel(null)} busy={busy} onConfirm={handleDelete}
        title="প্যাকেজ ডিলিট করবেন?" body={<>{del?.name} সম্পূর্ণ মুছে যাবে।</>} />
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-300/40" />
    </label>
  );
}
