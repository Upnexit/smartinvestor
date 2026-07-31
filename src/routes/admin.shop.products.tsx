import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Package, Plus, Pencil, Trash2, X, Save, Search, Eye, EyeOff, Star } from "lucide-react";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, ConfirmDeleteModal, Shimmer,
} from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/shop/products")({
  head: () => ({ meta: [{ title: "সকল পণ্য — Admin Shop" }] }),
  component: ShopProductsPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  tag_label: string | null;
  tag_gradient: string;
  category: string | null;
  stock: number;
  rating: number;
  active: boolean;
  featured: boolean;
  sort_order: number;
};

const EMPTY: Omit<Product, "id"> = {
  name: "", description: "", price: 0, old_price: null, image_url: "",
  tag_label: "", tag_gradient: "from-amber-500 to-orange-600", category: "",
  stock: 0, rating: 4.9, active: true, featured: false, sort_order: 0,
};

const GRADIENTS = [
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-slate-700 to-slate-900",
  "from-fuchsia-500 to-purple-600",
];

const bn = (n: number) => Number(n || 0).toLocaleString("en-BD");

const TARGET = 1600;
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(TARGET / bitmap.width, TARGET / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("resize failed")), "image/webp", 0.95)!
  );
}

function ShopProductsPage() {
  const [rows, setRows] = useState<Product[] | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<(Omit<Product, "id"> & { id?: string }) | null>(null);
  const [del, setDel] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("শুধু ছবি আপলোড করুন"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("সর্বোচ্চ ৫ MB"); return; }
    setUploading(true);
    try {
      const blob = await resizeImage(file).catch(() => file);
      const path = `shop-${Date.now()}.webp`;
      const { error } = await supabase.storage.from("package-images")
        .upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("package-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      setForm((f) => f ? { ...f, image_url: signed?.signedUrl ?? path } : f);
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "আপলোড ব্যর্থ");
    } finally { setUploading(false); }
  };

  const refresh = async () => {
    const { data, error } = await supabase
      .from("shop_products").select("*").order("sort_order", { ascending: true });
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows((data ?? []) as Product[]);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(s) || (r.category ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  async function save() {
    if (!form) return;
    if (!form.name.trim()) { toast.error("পণ্যের নাম দিন"); return; }
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || null,
      price: Number(form.price) || 0,
      old_price: form.old_price === null || form.old_price === undefined || `${form.old_price}` === "" ? null : Number(form.old_price),
      image_url: form.image_url || null,
      tag_label: form.tag_label || null,
      tag_gradient: form.tag_gradient,
      category: form.category || null,
      stock: Number(form.stock) || 0,
      rating: Number(form.rating) || 0,
      active: form.active,
      featured: form.featured,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = form.id
      ? await supabase.from("shop_products").update(payload).eq("id", form.id)
      : await supabase.from("shop_products").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "পণ্য আপডেট হয়েছে" : "নতুন পণ্য যোগ হয়েছে");
    setForm(null);
    refresh();
  }

  async function toggleActive(p: Product) {
    const { error } = await supabase.from("shop_products").update({ active: !p.active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase.from("shop_products").delete().eq("id", del.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("পণ্য ডিলিট হয়েছে");
    setDel(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="সকল পণ্য"
        subtitle="শপের পণ্য যোগ, এডিট, স্টক ও দাম পরিবর্তন করুন"
        accent="fuchsia"
        Icon={Package}
        action={
          <GradientButton accent="fuchsia" onClick={() => setForm({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> নতুন পণ্য
          </GradientButton>
        }
      />

      <AdminCard accent="slate">
        <div className="flex items-center gap-2 p-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="পণ্যের নাম বা ক্যাটাগরি খুঁজুন..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </AdminCard>

      {!filtered ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-52" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState Icon={Package} title="কোনো পণ্য নেই" hint="উপরের বাটন থেকে নতুন পণ্য যোগ করুন" accent="fuchsia" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <AdminCard key={p.id} accent={p.active ? "emerald" : "slate"}>
              <div className="flex gap-3 p-3">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    : <div className="grid h-full w-full place-items-center text-slate-300"><Package className="h-8 w-8" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{p.name}</p>
                    {p.featured && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="bn-display text-lg text-rose-600">৳{bn(p.price)}</span>
                    {p.old_price ? <span className="text-xs text-slate-400 line-through">৳{bn(p.old_price)}</span> : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    স্টক: {bn(p.stock)} • {p.category || "—"} • ক্রম {bn(p.sort_order)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SoftButton accent="sky" onClick={() => setForm({ ...p })}><Pencil className="h-3.5 w-3.5" /> এডিট</SoftButton>
                    <SoftButton accent={p.active ? "amber" : "emerald"} onClick={() => toggleActive(p)}>
                      {p.active ? <><EyeOff className="h-3.5 w-3.5" /> লুকান</> : <><Eye className="h-3.5 w-3.5" /> দেখান</>}
                    </SoftButton>
                    <SoftButton accent="rose" onClick={() => setDel(p)}><Trash2 className="h-3.5 w-3.5" /> ডিলিট</SoftButton>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal>
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <h3 className="bn-display text-lg text-slate-900">{form.id ? "পণ্য এডিট" : "নতুন পণ্য"}</h3>
              <button onClick={() => setForm(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 space-y-3">
              <Field label="পণ্যের নাম">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="বিবরণ">
                <textarea rows={2} className={inputCls} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="দাম (৳)">
                  <input type="number" className={inputCls} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </Field>
                <Field label="আগের দাম (৳)">
                  <input type="number" className={inputCls} value={form.old_price ?? ""} onChange={(e) => setForm({ ...form, old_price: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="স্টক">
                  <input type="number" className={inputCls} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
                </Field>
                <Field label="রেটিং">
                  <input type="number" step="0.1" className={inputCls} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </Field>
                <Field label="ক্যাটাগরি">
                  <input className={inputCls} value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </Field>
                <Field label="সাজানোর ক্রম">
                  <input type="number" className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="ছবির লিংক (URL)">
                <input className={inputCls} value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              </Field>
              <Field label="ব্যাজ লেবেল (যেমন BEST SELLER)">
                <input className={inputCls} value={form.tag_label ?? ""} onChange={(e) => setForm({ ...form, tag_label: e.target.value })} />
              </Field>
              <Field label="ব্যাজ রঙ">
                <div className="flex flex-wrap gap-2">
                  {GRADIENTS.map((g) => (
                    <button key={g} type="button" onClick={() => setForm({ ...form, tag_gradient: g })}
                      className={cn("h-7 w-12 rounded-lg bg-gradient-to-r ring-2", g, form.tag_gradient === g ? "ring-slate-900" : "ring-transparent")} />
                  ))}
                </div>
              </Field>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> সক্রিয়
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> ফিচার্ড
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setForm(null)}>বাতিল</SoftButton>
              <GradientButton accent="fuchsia" className="flex-1" busy={busy} onClick={save}>
                <Save className="h-4 w-4" /> সেভ
              </GradientButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        busy={busy}
        title="পণ্য ডিলিট?"
        body={<span>"{del?.name}" পণ্যটি স্থায়ীভাবে মুছে যাবে।</span>}
      />
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-fuchsia-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}
