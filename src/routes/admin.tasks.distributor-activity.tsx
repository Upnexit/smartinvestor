import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft, Users2, Sparkles, CheckCircle2, Trash2, Filter, RefreshCw,
  Calendar as CalendarIcon, ExternalLink, Package as PackageIcon, Search, Activity,
} from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer, EmptyState, SoftButton } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import { listDistributorTaskActivity, type DistributorActivityRow } from "@/lib/admin-distributor-activity.functions";
import { cn } from "@/lib/utils";
import { todayBD } from "@/lib/bd-time";

export const Route = createFileRoute("/admin/tasks/distributor-activity")({
  head: () => ({ meta: [{ title: "ডিস্ট্রিবিউটর কার্যক্রম — Admin" }] }),
  component: DistributorActivityPage,
});

type Distributor = { user_id: string; full_name: string | null; email: string | null };
type ByDist = { user_id: string; name: string | null; email: string | null; generated: number; activated: number; deleted: number; totalAmount: number; lastAt: string };

const EVENT_META: Record<string, { label: string; color: string; Icon: typeof Sparkles }> = {
  distributor_task_generated: { label: "AI টাস্ক তৈরি", color: "from-fuchsia-500 to-purple-600", Icon: Sparkles },
  distributor_task_activated: { label: "টাস্ক Activate", color: "from-emerald-500 to-teal-600", Icon: CheckCircle2 },
  distributor_task_deleted: { label: "টাস্ক Delete", color: "from-rose-500 to-red-600", Icon: Trash2 },
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${format(d, "yyyy-MM-dd")} • ${fmtTime(iso)}`;
}

function DistributorActivityPage() {
  const listFn = useServerFn(listDistributorTaskActivity);
  const [date, setDate] = useState<string>(() => todayBD());
  const [distributorId, setDistributorId] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"summary" | "timeline">("summary");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DistributorActivityRow[]>([]);
  const [totals, setTotals] = useState({ generated: 0, activated: 0, deleted: 0, amount: 0 });
  const [byDistributor, setByDistributor] = useState<ByDist[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await listFn({ data: { date, distributorId, eventType } });
      setRows(res.rows);
      setTotals(res.totals);
      setByDistributor(res.byDistributor);
      setDistributors(res.distributors);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date, distributorId, eventType]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.distributor_name ?? "").toLowerCase().includes(q)
      || (r.distributor_email ?? "").toLowerCase().includes(q)
      || (r.package_name ?? "").toLowerCase().includes(q)
      || r.event_type.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link to="/admin/tasks" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-3.5 w-3.5" /> টাস্ক ম্যানেজমেন্ট
        </Link>
      </div>

      <AdminPageHeader accent="indigo" Icon={Activity}
        title="ডিস্ট্রিবিউটর টাস্ক কার্যক্রম"
        subtitle="কোন distributor কখন, কোন package-এ, কতটি task তৈরি/activate/delete করেছেন — সম্পূর্ণ analysis"
        action={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-xs outline-none" />
            </div>
            <SoftButton onClick={load}><RefreshCw className="h-3.5 w-3.5" /></SoftButton>
          </div>
        } />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="মোট Generated" value={totals.generated} accent="fuchsia" Icon={Sparkles} />
        <StatTile label="মোট Activated" value={totals.activated} accent="emerald" Icon={CheckCircle2} />
        <StatTile label="Deleted (replaced)" value={totals.deleted} accent="rose" Icon={Trash2} />
        <StatTile label="মোট Reward ৳" value={totals.amount} accent="indigo" Icon={Activity} />
      </div>

      <AdminCard accent="indigo" className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-indigo-500" />
          <select value={distributorId} onChange={(e) => setDistributorId(e.target.value)}
            className="rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
            <option value="">সব distributor</option>
            {distributors.map((d) => (
              <option key={d.user_id} value={d.user_id}>{d.full_name || d.email || d.user_id.slice(0, 8)}</option>
            ))}
          </select>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}
            className="rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400">
            <option value="">সব ইভেন্ট</option>
            <option value="distributor_task_generated">AI টাস্ক তৈরি</option>
            <option value="distributor_task_activated">টাস্ক Activate</option>
            <option value="distributor_task_deleted">টাস্ক Delete</option>
          </select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম / প্যাকেজ খুঁজুন…"
              className="w-full rounded-lg border border-indigo-200 bg-white pl-8 pr-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
          </div>
        </div>
      </AdminCard>

      <div className="flex gap-1.5">
        {(["summary", "timeline"] as const).map((v) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition",
              tab === v ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
            {v === "summary" ? "Distributor সারাংশ" : "সব ঘটনা (Timeline)"}
          </button>
        ))}
      </div>

      {loading ? <Shimmer className="h-40" /> : tab === "summary" ? (
        byDistributor.length === 0 ? (
          <EmptyState Icon={Users2} accent="indigo" title="এই তারিখে কোনো distributor কার্যক্রম নেই" />
        ) : (
          <div className="grid gap-2">
            {byDistributor.sort((a, b) => (b.generated + b.activated) - (a.generated + a.activated)).map((d) => (
              <AdminCard key={d.user_id} accent="indigo" className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow">
                    <Users2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="bn-display text-sm text-slate-900 truncate">{d.name || "—"}</p>
                    <p className="text-[11px] text-slate-500 truncate">{d.email || d.user_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-slate-400">শেষ কার্যক্রম: {fmtDateTime(d.lastAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-fuchsia-50 px-2 py-1 text-[11px] font-bold text-fuchsia-700 ring-1 ring-fuchsia-200">Gen {d.generated}</span>
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">Active {d.activated}</span>
                    <span className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200">Del {d.deleted}</span>
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200">৳{d.totalAmount}</span>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )
      ) : (
        filteredRows.length === 0 ? (
          <EmptyState Icon={Activity} accent="indigo" title="কোনো ঘটনা পাওয়া যায়নি" />
        ) : (
          <div className="grid gap-2">
            {filteredRows.map((r) => {
              const em = EVENT_META[r.event_type] ?? EVENT_META.distributor_task_generated;
              const m = (r.meta ?? {}) as { count?: number; total_amount?: number; per_reward?: number; date?: string; link_url?: string; action_type?: string; reward?: number; source?: string; action_types?: string[] };
              return (
                <AdminCard key={r.id} accent="indigo" className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow", em.color)}>
                      <em.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bn-display text-sm text-slate-900">{em.label}</span>
                        <span className="text-[10px] text-slate-400">{fmtDateTime(r.created_at)}</span>
                      </div>
                      <p className="text-[12px] text-slate-600 mt-0.5">
                        <b>{r.distributor_name || "—"}</b>
                        {r.package_name && <> • <PackageIcon className="inline h-3 w-3 -mt-0.5" /> {r.package_name}</>}
                        {m.date && <> • {m.date}</>}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {typeof m.count === "number" && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">{m.count}টি task</span>}
                        {typeof m.total_amount === "number" && <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700">৳{m.total_amount}</span>}
                        {typeof m.per_reward === "number" && <span className="rounded bg-fuchsia-100 px-1.5 py-0.5 font-bold text-fuchsia-700">প্রতি ৳{m.per_reward}</span>}
                        {typeof m.reward === "number" && <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700">৳{m.reward}</span>}
                        {m.action_type && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-bold uppercase text-sky-700">{m.action_type}</span>}
                        {m.action_types?.map((a) => <span key={a} className="rounded bg-sky-100 px-1.5 py-0.5 font-bold uppercase text-sky-700">{a}</span>)}
                        {m.source && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">📍 {m.source}</span>}
                      </div>
                      {m.link_url && (
                        <a href={m.link_url} target="_blank" rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline truncate max-w-full">
                          <ExternalLink className="h-3 w-3" /> {m.link_url}
                        </a>
                      )}
                    </div>
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )
      )}
    </>
  );
}
