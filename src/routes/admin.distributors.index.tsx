import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users2, Plus, Edit3, Trash2, Search, MapPin, Phone, Award, UserCheck, Activity, BadgeCheck, ShieldOff, ShieldCheck, Inbox, Eye, Check, X, Mail, FileText, Clock, Wallet, TrendingUp, HandCoins } from "lucide-react";
import { toast } from "sonner";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer, ConfirmDeleteModal,
} from "@/components/admin/AdminUI";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";
import { DistributorFormModal } from "@/components/admin/DistributorFormModal";
import { deleteDistributor, listDistributors, subscribeTable, updateDistributor } from "@/lib/admin-client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ---------- Vibrant fully-gradient stat tile ---------- */
function VibrantStat({
  label, value, accent, Icon, hint,
}: {
  label: string; value: React.ReactNode; hint?: string; accent: AccentKey;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const a = ACCENTS[accent];
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl p-4 text-white shadow-xl animate-admin-pop transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]",
      "bg-gradient-to-br", a.gradient, a.glow,
    )}>
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
      <span className="pointer-events-none absolute -left-4 -bottom-8 h-20 w-20 rounded-full bg-black/20 blur-2xl" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">{label}</p>
          <p className="mt-1 bn-display text-2xl sm:text-[1.6rem] drop-shadow-sm truncate">{value}</p>
          {hint && <p className="mt-1 text-[10px] text-white/85">{hint}</p>}
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/25 backdrop-blur-md ring-1 ring-white/40 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}


export const Route = createFileRoute("/admin/distributors/")({
  head: () => ({ meta: [{ title: "ডিস্ট্রিবিউটর — অ্যাডমিন" }] }),
  component: AdminDistributorsPage,
});

type DRow = {
  user_id: string; full_name: string; email: string; phone: string | null;
  payment_method: string | null; payment_number: string | null;
  district: string | null; thana: string | null; address: string | null;
  commission_rate: number; balance: number; locked_balance: number; total_earned: number;
  status: string; notes: string | null; users_count: number;
};


type AppRow = {
  id: string; full_name: string; father_name: string | null; phone: string; email: string;
  password: string | null;
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
  const [modal, setModal] = useState<{ open: boolean; editing: DRow | null; prefill?: Partial<DRow> | null; applicationId?: string | null; initialBalance?: number; initialPassword?: string | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<DRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"list"|"applications">("list");
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [appDetail, setAppDetail] = useState<AppRow | null>(null);
  const [rejectApp, setRejectApp] = useState<AppRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [paidOut, setPaidOut] = useState<number>(0);


  const refresh = () => {
    listDistributors(q)
      .then(async (data) => {
        const list = data as DRow[];
        setRows(list);
        // Compute total paid out (approved withdrawals) across users referred by any distributor
        const ids = list.map((r) => r.user_id).filter(Boolean);
        if (ids.length === 0) { setPaidOut(0); return; }
        const { data: profs } = await supabase.from("profiles").select("id").in("distributor_id", ids);
        const userIds = (profs ?? []).map((p) => p.id);
        if (userIds.length === 0) { setPaidOut(0); return; }
        const { data: ws } = await supabase.from("withdrawals").select("amount, status").in("user_id", userIds);
        const total = (ws ?? []).filter((w) => w.status === "approved" || w.status === "paid").reduce((a, w) => a + Number(w.amount ?? 0), 0);
        setPaidOut(total);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "ডিস্ট্রিবিউটর লোড ব্যর্থ");
        setRows([]);
      });
  };

  const loadApps = () => {
    supabase.from("distributor_applications")
      .select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { setApps([]); return; }
        setApps((data ?? []) as AppRow[]);
      }, () => setApps([]));
  };

  const adminReady = useAdminAutoRefresh(refresh);

  useEffect(() => {
    if (!adminReady) return;
    const offDistributors = subscribeTable("distributors", refresh);
    const offProfiles = subscribeTable("profiles", refresh);
    const offApps = subscribeTable("distributor_applications", loadApps);
    const offW = subscribeTable("withdrawals", refresh);
    loadApps();
    return () => { offDistributors(); offProfiles(); offApps(); offW(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, adminReady]);

  // Debounced search
  useEffect(() => {
    if (!adminReady) return;
    const t = setTimeout(refresh, 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [q, adminReady]);

  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      active: r.filter(x => x.status === "active").length,
      users: r.reduce((a, x) => a + (x.users_count ?? 0), 0),
      commission: r.reduce((a, x) => a + Number(x.total_earned ?? 0), 0),
    };
  }, [rows]);

  const filteredApps = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!apps) return null;
    if (!s) return apps;
    return apps.filter((a) =>
      [a.full_name, a.email, a.phone, a.district, a.thana, a.payment_number].some((f) => (f ?? "").toLowerCase().includes(s)),
    );
  }, [apps, q]);


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
      initialPassword: a.password,
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <VibrantStat label="মোট ডিস্ট্রিবিউটর" value={stats.total.toLocaleString("bn-BD")} Icon={Users2} accent="indigo" />
        <VibrantStat label="সক্রিয় ডিস্ট্রিবিউটর" value={stats.active.toLocaleString("bn-BD")} Icon={UserCheck} accent="emerald" />
        <VibrantStat label="ইউজার পরিচালনা" value={stats.users.toLocaleString("bn-BD")} Icon={Activity} accent="sky" hint="ডিস্ট্রিবিউটরের রেফার্ড ইউজার" />
        <VibrantStat label="মোট কমিশন" value={`৳${stats.commission.toLocaleString("bn-BD")}`} Icon={Award} accent="fuchsia" hint="এজেন্টদের অর্জিত আয়" />
        <VibrantStat label="মোট পরিশোধ" value={`৳${paidOut.toLocaleString("bn-BD")}`} Icon={HandCoins} accent="amber" hint="ইউজারদের প্রদত্ত টাকা" />
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

      {/* Unified search — active on both tabs */}
      <AdminCard accent={tab === "list" ? "indigo" : "fuchsia"} className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "list" ? "ডিস্ট্রিবিউটর খুঁজুন — নাম / ইমেইল / ফোন / জেলা..." : "আবেদন খুঁজুন — নাম / ইমেইল / ফোন / জেলা..."}
            className={cn("w-full rounded-xl border-2 pl-9 pr-9 py-2.5 text-sm outline-none focus:bg-white focus:ring-4",
              tab === "list" ? "border-indigo-200 bg-indigo-50/30 focus:border-indigo-400 focus:ring-indigo-100"
                             : "border-fuchsia-200 bg-fuchsia-50/30 focus:border-fuchsia-400 focus:ring-fuchsia-100")} />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full bg-slate-200 hover:bg-slate-300">
              <X className="h-3 w-3 text-slate-600" />
            </button>
          )}
        </div>
      </AdminCard>


      {tab === "list" && (
        !adminReady || rows === null ? (
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
                  <div className="mt-2 rounded-lg bg-rose-50 ring-1 ring-rose-200 px-2 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">🔒 লকড ব্যালেন্স</span>
                    <span className="text-sm font-bold text-rose-700">৳{Number(r.locked_balance ?? 0).toLocaleString("bn-BD")}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    <Link to="/admin/distributors/$id" params={{ id: r.user_id }} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md shadow-sky-500/30 hover:scale-[1.02] transition">
                      <Eye className="h-3.5 w-3.5" /> ডিটেইল
                    </Link>
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
        )
      )}

      {tab === "applications" && (
        filteredApps === null ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0,1,2].map(i => <Shimmer key={i} className="h-56" />)}
          </div>
        ) : filteredApps.length === 0 ? (
          <EmptyState Icon={Inbox} title={q ? "কোনো ফলাফল নেই" : "কোনো আবেদন নেই"} hint={q ? "অন্য কীওয়ার্ড দিয়ে চেষ্টা করুন" : "নতুন আবেদন এলে এখানে দেখাবে"} accent="fuchsia" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredApps.map((a) => {

              const badge = a.status === "pending" ? { c: "from-amber-500 to-orange-600", t: "পেন্ডিং" }
                : a.status === "approved" ? { c: "from-emerald-500 to-teal-600", t: "অ্যাপ্রুভড" }
                : { c: "from-rose-500 to-red-600", t: "রিজেক্টেড" };
              return (
                <AdminCard key={a.id} accent="fuchsia" interactive className="p-4 relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <span className={cn("rounded-full bg-gradient-to-br px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-md", badge.c)}>{badge.t}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white font-bold shadow-lg ring-2 ring-white">
                      {(a.full_name?.[0] ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="bn-display text-base text-slate-900 truncate">{a.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{a.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                    <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-400" /> {a.phone}</p>
                    <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-400" /> {a.district}, {a.thana}</p>
                    <p className="flex items-center gap-1.5"><Wallet className="inline h-3 w-3 text-slate-400" />
                      <span className="uppercase font-bold">{a.payment_method}</span> · {a.payment_number}</p>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">{new Date(a.created_at).toLocaleString("bn-BD")}</p>
                  {a.rejection_reason && <p className="mt-1 text-[11px] text-rose-600">✕ {a.rejection_reason}</p>}
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <button onClick={() => setAppDetail(a)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md">
                      <Eye className="h-3.5 w-3.5" /> বিস্তারিত
                    </button>
                    {a.status === "pending" ? (
                      <>
                        <button onClick={() => approveApp(a)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md">
                          <Check className="h-3.5 w-3.5" /> অ্যাপ্রুভ
                        </button>
                        <button onClick={() => { setRejectApp(a); setRejectReason(""); }} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md">
                          <X className="h-3.5 w-3.5" /> রিজেক্ট
                        </button>
                      </>
                    ) : <span className="col-span-2" />}
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )
      )}

      <DistributorFormModal
        open={modal.open}
        editing={modal.editing}
        prefill={modal.prefill ?? null}
        applicationId={modal.applicationId ?? null}
        initialBalance={modal.initialBalance ?? 0}
        initialPassword={modal.initialPassword ?? null}
        onClose={() => setModal({ open: false, editing: null })}
        onSaved={() => { refresh(); loadApps(); }}
      />

      {/* Application detail modal */}
      {appDetail && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
              <h3 className="bn-display text-lg text-slate-900">আবেদন বিস্তারিত</h3>
              <button onClick={() => setAppDetail(null)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 p-4 text-white shadow-lg">
                <p className="bn-display text-xl">{appDetail.full_name}</p>
                {appDetail.father_name && <p className="text-xs text-white/85">পিতা: {appDetail.father_name}</p>}
                <p className="text-[11px] text-white/85 mt-1">{new Date(appDetail.created_at).toLocaleString("bn-BD")}</p>
              </div>
              <DetailRow icon={<Mail className="h-4 w-4" />} label="ইমেইল" value={appDetail.email} />
              <DetailRow icon={<Phone className="h-4 w-4" />} label="ফোন" value={appDetail.phone} />
              <DetailRow icon={<MapPin className="h-4 w-4" />} label="ঠিকানা" value={`${appDetail.district}, ${appDetail.thana} — ${appDetail.address}`} />
              <DetailRow icon={<Wallet className="h-4 w-4" />} label="পেমেন্ট" value={`${appDetail.payment_method.toUpperCase()} · ${appDetail.payment_number}`} />
              {appDetail.experience && <DetailRow icon={<FileText className="h-4 w-4" />} label="অভিজ্ঞতা" value={appDetail.experience} />}
              {appDetail.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <GradientButton accent="emerald" className="flex-1" onClick={() => { const a = appDetail; setAppDetail(null); approveApp(a); }}>
                    <Check className="h-4 w-4" /> অ্যাপ্রুভ (৳২৫,০০০ ব্যালেন্স সহ)
                  </GradientButton>
                  <GradientButton accent="rose" className="flex-1" onClick={() => { setRejectApp(appDetail); setRejectReason(""); setAppDetail(null); }}>
                    <X className="h-4 w-4" /> রিজেক্ট
                  </GradientButton>
                </div>
              )}
              {appDetail.status !== "pending" && (
                <div className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5" /> স্ট্যাটাস: <b>{appDetail.status}</b>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectApp && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg text-slate-900">আবেদন বাতিল</h3>
              <button onClick={() => { setRejectApp(null); setRejectReason(""); }} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-slate-500">দ্রুত নির্বাচন করতে chip-এ ক্লিক করুন</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REJECT_PRESETS.map((r) => {
                const active = rejectReason === r;
                return (
                  <button key={r} onClick={() => setRejectReason(r)} className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    active ? "bg-gradient-to-r from-rose-500 to-red-600 border-transparent text-white shadow-md"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-300 hover:bg-rose-50",
                  )}>{r}</button>
                );
              })}
            </div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="কাস্টম কারণ..."
              className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-rose-400" />
            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => { setRejectApp(null); setRejectReason(""); }}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" onClick={submitReject}>
                <X className="h-4 w-4" /> নিশ্চিত করুন
              </GradientButton>
            </div>
          </div>
        </div>
      )}

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

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
      <div className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-sm text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}
