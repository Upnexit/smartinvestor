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

const TARGET_W = 1600;
const TARGET_H = 1600;

async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  // Only downscale if larger than target; never upscale. Preserves original quality.
  const scale = Math.min(TARGET_W / bitmap.width, TARGET_H / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  // High-quality WebP (0.95) — visually lossless, small file
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("resize failed")), "image/webp", 0.95)!
  );
}


function PackagesPage() {
  const [rows, setRows] = useState<Pkg[] | null>(null);
  const [edit, setEdit] = useState<Pkg | null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<Pkg | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [revenue, setRevenue] = useState<number | null>(null);


  const refresh = () => listPackages().then((r) => setRows(r as unknown as Pkg[])).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
  const refreshRevenue = async () => {
    const { data } = await supabase
      .from("user_packages")
      .select("package_id, status, packages!inner(price)")
      .in("status", ["active", "completed"] as never);
    const sum = (data ?? []).reduce((s: number, r: { packages: { price: number | null } | null }) => s + Number(r.packages?.price ?? 0), 0);
    setRevenue(sum);
  };
  useAdminAutoRefresh(() => { refresh(); refreshRevenue(); });
  useEffect(() => {
    const unsub = subscribeTable("packages", refresh);
    const ch = supabase.channel("admin-pkg-rev").on("postgres_changes", { event: "*", schema: "public", table: "user_packages" }, refreshRevenue).subscribe();
    refreshRevenue();
    return () => { unsub?.(); supabase.removeChannel(ch); };
  }, []);


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
    if (!file.type.startsWith("image/")) { toast.error("শুধু ছবি আপলোড করুন"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("সর্বোচ্চ ৫ MB"); return; }
    setUploading(true);
    try {
      const blob = await resizeImage(file).catch(() => file);
      const path = `pkg-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("package-images")
        .upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("package-images").createSignedUrl(path, 60 * 60 * 24 * 365);
      setEdit((e) => e ? { ...e, image_url: signed?.signedUrl ?? path } : e);
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "আপলোড ব্যর্থ");
    } finally { setUploading(false); }
  };


  const tiles = useMemo(() => {
    const total = rows?.length ?? 0;
    const active = rows?.filter((p) => p.active).length ?? 0;
    const priceSum = rows?.reduce((s, p) => s + Number(p.price || 0), 0) ?? 0;
    return [
      { label: "মোট প্যাকেজ", value: total.toLocaleString("bn-BD"),                        Icon: PackageIcon,  from: "from-fuchsia-500", to: "to-pink-600",    ring: "ring-fuchsia-200/60", shadow: "shadow-fuchsia-500/40" },
      { label: "অ্যাক্টিভ",    value: active.toLocaleString("bn-BD"),                       Icon: CheckCircle2, from: "from-emerald-500", to: "to-teal-600",    ring: "ring-emerald-200/60", shadow: "shadow-emerald-500/40" },
      { label: "মোট মূল্য",    value: "৳" + priceSum.toLocaleString("bn-BD"),               Icon: DollarSign,   from: "from-sky-500",     to: "to-indigo-600",  ring: "ring-sky-200/60",     shadow: "shadow-sky-500/40" },
      { label: "মোট আর্নিং",   value: revenue == null ? "…" : "৳" + revenue.toLocaleString("bn-BD"), Icon: TrendingUp, from: "from-amber-500", to: "to-orange-600", ring: "ring-amber-200/60", shadow: "shadow-amber-500/40" },
    ];
  }, [rows, revenue]);

  return (
    <>
      <AdminPageHeader accent="fuchsia" Icon={PackageIcon} title="প্যাকেজ ম্যানেজমেন্ট"
        subtitle="মূল্য, দৈনিক আয়, মেয়াদ পরিচালনা"
        action={<GradientButton accent="fuchsia" onClick={onAdd}><Plus className="h-4 w-4" /> নতুন প্যাকেজ</GradientButton>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white ring-1 shadow-xl animate-admin-pop", t.from, t.to, t.ring, t.shadow)}>
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">{t.label}</p>
                <p className="mt-1 bn-display text-2xl font-extrabold drop-shadow-sm truncate">{t.value}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                <t.Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>


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
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">প্যাকেজ ছবি</span>
                  <span className="text-[10px] font-semibold text-fuchsia-600">প্রস্তাবিত: {TARGET_W}×{TARGET_H}px · WebP/JPG/PNG · ≤5MB</span>
                </div>
                <label className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/30 transition",
                  uploading ? "opacity-70 cursor-wait" : "cursor-pointer hover:scale-[1.02]"
                )}>
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "আপলোড হচ্ছে…" : (edit.image_url ? "ছবি বদলান" : "ছবি আপলোড")}
                  <input type="file" className="hidden" accept="image/*" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
                </label>
                <p className="mt-1 text-[10px] text-slate-500">ছবি স্বয়ংক্রিয়ভাবে {TARGET_W}×{TARGET_H}px এ রিসাইজ ও WebP-তে কম্প্রেস হবে — দ্রুত লোড হবে।</p>
                {edit.image_url && <img src={edit.image_url} alt="" className="mt-2 h-24 w-24 rounded-lg object-cover ring-2 ring-fuchsia-200" />}
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
