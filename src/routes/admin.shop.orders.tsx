import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Search, Phone, MapPin, Trash2 } from "lucide-react";
import {
  AdminPageHeader, AdminCard, SoftButton, EmptyState, ConfirmDeleteModal, Shimmer, StatTile,
} from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/shop/orders")({
  head: () => ({ meta: [{ title: "সকল অর্ডার — Admin Shop" }] }),
  component: ShopOrdersPage,
});

type Order = {
  id: string;
  product_name: string;
  customer_name: string;
  phone: string;
  address: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  note: string | null;
  created_at: string;
};

const STATUSES: { key: string; label: string; cls: string }[] = [
  { key: "new", label: "নতুন", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  { key: "confirmed", label: "কনফার্মড", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  { key: "shipped", label: "পাঠানো হয়েছে", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { key: "completed", label: "সম্পন্ন", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { key: "cancelled", label: "বাতিল", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
];

const bn = (n: number) => Number(n || 0).toLocaleString("en-BD");

function ShopOrdersPage() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [del, setDel] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data, error } = await supabase
      .from("shop_orders").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows((data ?? []) as Order[]);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      (tab === "all" || r.status === tab) &&
      (!s || r.customer_name.toLowerCase().includes(s) || r.phone.includes(s) || r.product_name.toLowerCase().includes(s)));
  }, [rows, q, tab]);

  const totals = useMemo(() => {
    const o = rows ?? [];
    const done = o.filter((r) => r.status === "completed");
    return {
      count: o.length,
      revenue: done.reduce((a, r) => a + Number(r.total_amount || 0), 0),
      pending: o.filter((r) => r.status === "new").length,
    };
  }, [rows]);

  async function setStatus(o: Order, status: string) {
    const { error } = await supabase.from("shop_orders").update({ status }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ট্যাটাস আপডেট হয়েছে");
    refresh();
  }

  async function confirmDelete() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase.from("shop_orders").delete().eq("id", del.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setDel(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="সকল অর্ডার" subtitle="শপ থেকে আসা সকল অর্ডার ম্যানেজ করুন" accent="sky" Icon={ShoppingCart} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="মোট অর্ডার" value={bn(totals.count)} accent="sky" Icon={ShoppingCart} />
        <StatTile label="নতুন" value={bn(totals.pending)} accent="amber" Icon={ShoppingCart} />
        <StatTile label="ইনকাম" value={`৳${bn(totals.revenue)}`} accent="emerald" Icon={ShoppingCart} />
      </div>

      <AdminCard accent="slate">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম, ফোন বা পণ্য খুঁজুন..."
              className="w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[{ key: "all", label: "সব" }, ...STATUSES].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-bold ring-1 transition",
                  tab === t.key ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      {!filtered ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState Icon={ShoppingCart} title="কোনো অর্ডার নেই" hint="নতুন অর্ডার এলে এখানে দেখা যাবে" accent="sky" />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const st = STATUSES.find((s) => s.key === o.status);
            return (
              <AdminCard key={o.id} accent="sky">
                <div className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{o.product_name} × {bn(o.quantity)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{o.customer_name}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {o.phone}</span>
                        {o.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.address}</span>}
                      </div>
                      {o.note && <p className="mt-1 text-[11px] text-slate-400">নোট: {o.note}</p>}
                    </div>
                    <div className="text-right">
                      <p className="bn-display text-xl text-rose-600">৳{bn(o.total_amount)}</p>
                      <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", st?.cls)}>
                        {st?.label ?? o.status}
                      </span>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(o.created_at).toLocaleString("en-BD")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STATUSES.filter((s) => s.key !== o.status).map((s) => (
                      <SoftButton key={s.key} accent="slate" onClick={() => setStatus(o, s.key)}>{s.label}</SoftButton>
                    ))}
                    <SoftButton accent="rose" onClick={() => setDel(o)}><Trash2 className="h-3.5 w-3.5" /> ডিলিট</SoftButton>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy}
        title="অর্ডার ডিলিট?" body={<span>{del?.customer_name} এর অর্ডারটি মুছে যাবে।</span>}
      />
    </div>
  );
}
