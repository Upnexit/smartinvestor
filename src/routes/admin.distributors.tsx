import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users2, Plus, Edit3, Trash2, Search, MapPin, Phone, Wallet, Award, UserCheck, Activity } from "lucide-react";
import { toast } from "sonner";
import {
  adminListDistributors, adminDeleteDistributor, adminUpdateDistributor,
} from "@/lib/distributor.functions";
import {
  AdminPageHeader, StatTile, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer, ConfirmDeleteModal,
} from "@/components/admin/AdminUI";
import { DistributorFormModal } from "@/components/admin/DistributorFormModal";
import { useAuthReady } from "@/hooks/use-auth-ready";

export const Route = createFileRoute("/admin/distributors")({
  head: () => ({ meta: [{ title: "ডিস্ট্রিবিউটর — অ্যাডমিন" }] }),
  component: AdminDistributorsPage,
});

type DRow = {
  user_id: string; full_name: string; email: string; phone: string | null;
  payment_method: string | null; payment_number: string | null;
  district: string | null; thana: string | null; address: string | null;
  commission_rate: number; balance: number; total_earned: number;
  status: string; notes: string | null; users_count: number;
};

function AdminDistributorsPage() {
  const list = useServerFn(adminListDistributors);
  const del = useServerFn(adminDeleteDistributor);
  const upd = useServerFn(adminUpdateDistributor);
  const { isReady, user } = useAuthReady();
  const [rows, setRows] = useState<DRow[] | null>(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: DRow | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<DRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!isReady || !user) return;
    try {
      const data = await list({ data: { q } });
      setRows(data as DRow[]);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "লোড ব্যর্থ";
      const friendly = /Unauthorized|authorization header|No session/i.test(raw)
        ? "সেশন লোড হচ্ছে — কিছুক্ষণ পর আবার চেষ্টা করুন"
        : /Missing Supabase/i.test(raw)
          ? "সার্ভার কনফিগারেশন সমস্যা — পুনরায় চেষ্টা করুন"
          : raw;
      toast.error(friendly);
      setRows([]);
    }
  }

  // Initial + auth-ready load
  useEffect(() => { if (isReady && user) refresh(); /* eslint-disable-next-line */ }, [isReady, user?.id]);
  // Debounced search
  useEffect(() => {
    if (!isReady || !user) return;
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [q]);

  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      active: r.filter(x => x.status === "active").length,
      users: r.reduce((a, x) => a + (x.users_count ?? 0), 0),
      paid: r.reduce((a, x) => a + Number(x.total_earned ?? 0), 0),
    };
  }, [rows]);

  async function toggleStatus(row: DRow) {
    try {
      await upd({ data: { userId: row.user_id, patch: { status: row.status === "active" ? "suspended" : "active" } } });
      toast.success("স্ট্যাটাস আপডেট");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  }

  async function performDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      await del({ data: { userId: confirm.user_id, deleteAuth: true } });
      toast.success("ডিলিট হয়েছে");
      setConfirm(null);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="ডিস্ট্রিবিউটর / এজেন্ট"
        subtitle="আঞ্চলিক ডিস্ট্রিবিউটর তৈরি ও পরিচালনা করুন"
        Icon={Users2} accent="indigo"
        action={
          <GradientButton accent="indigo" onClick={() => setModal({ open: true, editing: null })}>
            <Plus className="h-4 w-4" /> নতুন ডিস্ট্রিবিউটর
          </GradientButton>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="মোট ডিস্ট্রিবিউটর" value={stats.total} Icon={Users2} accent="indigo" />
        <StatTile label="সক্রিয়" value={stats.active} Icon={UserCheck} accent="emerald" />
        <StatTile label="ইউজার পরিচালনা" value={stats.users} Icon={Activity} accent="sky" />
        <StatTile label="মোট কমিশন" value={`৳${stats.paid.toLocaleString("bn-BD")}`} Icon={Award} accent="fuchsia" />
      </div>

      <AdminCard accent="indigo" className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম / ইমেইল / ফোন / জেলা..."
            className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/30 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
        </div>
      </AdminCard>

      {rows === null ? (
        <div className="grid gap-2">{[0,1,2].map(i => <Shimmer key={i} className="h-20" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState Icon={Users2} title="কোন ডিস্ট্রিবিউটর নেই" hint="উপরের বাটন থেকে নতুন তৈরি করুন" accent="indigo" />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <AdminCard key={r.user_id} accent="indigo" className="p-3" interactive>
              <div className="flex flex-wrap items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-bold shadow-lg shadow-indigo-500/30">
                  {(r.full_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="bn-display text-base text-slate-900 truncate">{r.full_name}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {r.status === "active" ? "সক্রিয়" : "সাসপেন্ড"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{r.email}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {r.phone}</span>}
                    {r.district && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.district}{r.thana ? `, ${r.thana}` : ""}</span>}
                    {r.payment_number && <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {r.payment_method} • {r.payment_number}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">ইউজার: {r.users_count}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">কমিশন: {r.commission_rate}%</span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700">ব্যালেন্স: ৳{Number(r.balance ?? 0).toLocaleString("bn-BD")}</span>
                    <span className="rounded-md bg-fuchsia-50 px-2 py-0.5 font-bold text-fuchsia-700">আয়: ৳{Number(r.total_earned ?? 0).toLocaleString("bn-BD")}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <SoftButton accent="indigo" onClick={() => setModal({ open: true, editing: r })}><Edit3 className="h-3 w-3" /> এডিট</SoftButton>
                  <SoftButton accent={r.status === "active" ? "rose" : "emerald"} onClick={() => toggleStatus(r)}>
                    {r.status === "active" ? "সাসপেন্ড" : "সক্রিয় করুন"}
                  </SoftButton>
                  <SoftButton accent="rose" onClick={() => setConfirm(r)}><Trash2 className="h-3 w-3" /> ডিলিট</SoftButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <DistributorFormModal
        open={modal.open}
        editing={modal.editing}
        onClose={() => setModal({ open: false, editing: null })}
        onSaved={refresh}
      />

      <ConfirmDeleteModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={performDelete}
        title="ডিস্ট্রিবিউটর ডিলিট করবেন?"
        body={<span>এই ডিস্ট্রিবিউটর ও তাদের অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে।</span>}
        busy={busy}
      />
    </div>
  );
}
