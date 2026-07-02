import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users2, Plus, Edit3, Trash2, Search, MapPin, Phone, Award, UserCheck, Activity, BadgeCheck, ShieldOff, ShieldCheck, Inbox, Eye, Check, X, Mail, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  AdminPageHeader, StatTile, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer, ConfirmDeleteModal,
} from "@/components/admin/AdminUI";
import { DistributorFormModal } from "@/components/admin/DistributorFormModal";
import { deleteDistributor, listDistributors, subscribeTable, updateDistributor } from "@/lib/admin-client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

type AppRow = {
  id: string; full_name: string; father_name: string | null; phone: string; email: string;
  district: string; thana: string; address: string;
  payment_method: string; payment_number: string;
  experience: string | null; status: "pending"|"approved"|"rejected";
  rejection_reason: string | null; created_at: string;
};

const REJECT_PRESETS = [
  "তথ্য অসম্পূর্ণ / যাচাইযোগ্য নয়",
  "প্রদত্ত এলাকায় ইতিমধ্যে এজেন্ট রয়েছেন",
  "সন্দেহজনক তথ্য",
  "ফোন নম্বরে যোগাযোগ সম্ভব হয়নি",
  "যোগ্যতা পূরণ হয়নি",
  "ডুপ্লিকেট আবেদন",
];

function AdminDistributorsPage() {
  const [rows, setRows] = useState<DRow[] | null>(null);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ open: boolean; editing: DRow | null; prefill?: Partial<DRow> | null; applicationId?: string | null; initialBalance?: number }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<DRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"list"|"applications">("list");
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [appDetail, setAppDetail] = useState<AppRow | null>(null);
  const [rejectApp, setRejectApp] = useState<AppRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const refresh = () => {
    listDistributors(q)
      .then((data) => setRows(data as DRow[]))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "ডিস্ট্রিবিউটর লোড ব্যর্থ");
        setRows([]);
      });
  };

  const loadApps = () => {
    supabase.from("distributor_applications")
      .select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setApps((data ?? []) as AppRow[]));
  };

  useAdminAutoRefresh(refresh);

  useEffect(() => {
    const offDistributors = subscribeTable("distributors", refresh);
    const offProfiles = subscribeTable("profiles", refresh);
    const offApps = subscribeTable("distributor_applications", loadApps);
    loadApps();
    return () => { offDistributors(); offProfiles(); offApps(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Debounced search
  useEffect(() => {
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
      await updateDistributor(row.user_id, { ...row, status: row.status === "active" ? "suspended" : "active" });
      toast.success("স্ট্যাটাস আপডেট");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  }

  async function performDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      await deleteDistributor(confirm.user_id);
      toast.success("ডিলিট হয়েছে");
      setConfirm(null);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  }

  const pendingCount = (apps ?? []).filter((a) => a.status === "pending").length;

  function approveApp(a: AppRow) {
    setModal({
      open: true, editing: null, applicationId: a.id, initialBalance: 25000,
      prefill: {
        full_name: a.full_name, email: a.email, phone: a.phone,
        payment_method: a.payment_method, payment_number: a.payment_number,
        district: a.district, thana: a.thana, address: a.address,
        notes: a.experience,
      },
    });
  }

  async function submitReject() {
    if (!rejectApp) return;
    if (rejectReason.trim().length < 3) { toast.error("কারণ নির্বাচন করুন বা লিখুন"); return; }
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("distributor_applications").update({
        status: "rejected", rejection_reason: rejectReason.trim(),
        reviewed_by: u.user?.id, reviewed_at: new Date().toISOString(),
      }).eq("id", rejectApp.id);
      if (error) throw error;
      toast.success("আবেদন বাতিল হয়েছে");
      setRejectApp(null); setRejectReason(""); loadApps();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
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

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
        <button onClick={() => setTab("list")} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold transition",
          tab === "list" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <Users2 className="inline h-4 w-4 mr-1.5" /> সকল ডিস্ট্রিবিউটর
        </button>
        <button onClick={() => setTab("applications")} className={cn("relative flex-1 rounded-xl px-3 py-2 text-sm font-bold transition",
          tab === "applications" ? "bg-white text-fuchsia-700 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          <Inbox className="inline h-4 w-4 mr-1.5" /> নতুন আবেদন
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-md">{pendingCount.toLocaleString("bn-BD")}</span>
          )}
        </button>
      </div>

      {tab === "list" && (
        <AdminCard accent="indigo" className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম / ইমেইল / ফোন / জেলা..."
              className="w-full rounded-xl border-2 border-indigo-200 bg-indigo-50/30 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          </div>
        </AdminCard>
      )}

      {tab === "list" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map(i => <Shimmer key={i} className="h-52" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState Icon={Users2} title="কোন ডিস্ট্রিবিউটর নেই" hint="উপরের বাটন থেকে নতুন তৈরি করুন" accent="indigo" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const suspended = r.status !== "active";
            return (
              <AdminCard key={r.user_id} accent="indigo" interactive className="p-4 relative overflow-hidden ring-2 ring-indigo-300/70 shadow-indigo-200/40">
                <div className="absolute -top-px right-3 z-10">
                  <div className="inline-flex items-center gap-1 rounded-b-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/40">
                    <BadgeCheck className="h-3 w-3" /> ডিস্ট্রিবিউটর
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white font-bold shadow-lg ring-2 ring-white ${suspended ? "from-rose-500 to-red-600" : "from-indigo-500 to-violet-600"}`}>
                    {(r.full_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="bn-display text-base text-slate-900 truncate">{r.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{r.email}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
                      {r.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{r.phone}</span>}
                      {r.district && <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{r.district}{r.thana ? `, ${r.thana}` : ""}</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-sky-50 p-2 text-center">
                    <p className="text-[10px] text-sky-600 font-semibold">ইউজার</p>
                    <p className="text-sm font-bold text-sky-700">{r.users_count}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-center">
                    <p className="text-[10px] text-emerald-600 font-semibold">কমিশন</p>
                    <p className="text-sm font-bold text-emerald-700">{r.commission_rate}%</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2 text-center">
                    <p className="text-[10px] text-amber-600 font-semibold">ব্যালেন্স</p>
                    <p className="text-sm font-bold text-amber-700">৳{Number(r.balance ?? 0).toFixed(0)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button onClick={() => setModal({ open: true, editing: r })} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-500/30 hover:scale-[1.02] transition">
                    <Edit3 className="h-3.5 w-3.5" /> এডিট
                  </button>
                  <button onClick={() => toggleStatus(r)} className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white shadow-md hover:scale-[1.02] transition ${suspended ? "bg-gradient-to-br from-lime-500 to-emerald-600 shadow-emerald-500/30" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30"}`}>
                    {suspended ? <><ShieldCheck className="h-3.5 w-3.5" /> চালু</> : <><ShieldOff className="h-3.5 w-3.5" /> সাসপেন্ড</>}
                  </button>
                  <SoftButton onClick={() => setConfirm(r)} accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200 !text-[11px] justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </SoftButton>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 text-center">
                  মোট আয়: <b className="text-fuchsia-700">৳{Number(r.total_earned ?? 0).toLocaleString("bn-BD")}</b>
                </div>
              </AdminCard>
            );
          })}
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
        body={<span>এই ডিস্ট্রিবিউটর রোল ও এজেন্ট প্রোফাইল মুছে যাবে; সংযুক্ত ইউজারগুলো আনঅ্যাসাইন হবে।</span>}
        busy={busy}
      />
    </div>
  );
}
