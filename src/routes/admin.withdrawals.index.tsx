import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine, Check, X, Loader2, Eye, User, Phone, Wallet,
  Clock, CheckCircle2, XCircle, TrendingUp, Copy,
} from "lucide-react";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { reviewWithdrawal } from "@/lib/admin-client";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSearchHighlight } from "@/hooks/use-search-highlight";

type WithdrawSearch = { q?: string; highlight?: string; filter?: string };

export const Route = createFileRoute("/admin/withdrawals/")({
  validateSearch: (s: Record<string, unknown>): WithdrawSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    highlight: typeof s.highlight === "string" ? s.highlight : undefined,
    filter: typeof s.filter === "string" ? s.filter : undefined,
  }),
  head: () => ({ meta: [{ title: "উইথড্র — Admin" }] }),
  component: WithdrawalsPage,
});


type Filter = "pending" | "approved" | "rejected" | "all";
type Method = "bkash"|"nagad"|"rocket";
type Row = {
  id: string; user_id: string; amount: number; gross_amount: number | null; fee: number | null;
  balance_at_request: number | null; method: Method|null;
  account_number: string | null; status: "pending"|"approved"|"rejected"|"paid";
  note: string | null; rejection_reason?: string | null;
  created_at: string; reviewed_at: string | null;
  kind: "user" | "distributor";
  profiles?: { full_name: string | null; phone: string | null; user_code?: string | null } | null;
};

type HistoryItem = {
  id: string; amount: number; gross_amount: number | null; fee: number | null;
  balance_at_request: number | null; method: Method | null; account_number: string | null;
  status: "pending"|"approved"|"rejected"|"paid";
  note: string | null; rejection_reason: string | null;
  created_at: string; reviewed_at: string | null;
};
type DetailData = {
  profile: {
    id: string; full_name: string | null; phone: string | null; email: string | null;
    user_code: string | null; balance: number; locked_balance: number;
    total_earned: number; created_at: string; status: string | null;
  } | null;
  history: HistoryItem[];
  stats: {
    total_requests: number; approved_count: number; approved_total: number;
    rejected_count: number; pending_count: number;
  };
};

const METHOD: Record<string, string> = {
  bkash: "bg-gradient-to-br from-pink-500 to-rose-600",
  nagad: "bg-gradient-to-br from-orange-500 to-amber-600",
  rocket:"bg-gradient-to-br from-purple-500 to-violet-600",
};

const PRESET_REASONS = [
  "ভুল পেমেন্ট নম্বর দেওয়া হয়েছে",
  "অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই",
  "সন্দেহজনক কার্যকলাপ — যাচাই প্রয়োজন",
  "প্যাকেজ সক্রিয় নেই",
  "একই দিনে একাধিক রিকোয়েস্ট",
  "টাস্ক শর্ত পূরণ হয়নি",
  "KYC/প্রোফাইল তথ্য অসম্পূর্ণ",
  "প্রদত্ত নম্বরটি অন্য একাউন্টের সাথে মিলছে না",
];

function WithdrawalsPage() {
  const { highlight, filter: filterFromUrl } = Route.useSearch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>(
    (filterFromUrl as Filter) || (highlight ? "all" : "pending")
  );
  const [reject, setReject] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);


  const refresh = () => {
    supabase.from("withdrawals")
      .select("id,user_id,amount,gross_amount,fee,balance_at_request,method,account_number,status,note,rejection_reason,created_at,reviewed_at,profiles!withdrawals_user_id_profiles_fkey(full_name,phone,user_code)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { setRows([]); toast.error(error.message); return; }
        setRows((data ?? []) as unknown as Row[]);
      }, (e: unknown) => { setRows([]); toast.error(e instanceof Error ? e.message : "লোড ব্যর্থ"); });
  };
  const adminReady = useAdminAutoRefresh(refresh);

  useEffect(() => {
    if (!adminReady) return;
    const ch = supabase.channel("admin-wd")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminReady]);

  // Load detail data when a row is opened
  useEffect(() => {
    if (!detail || !adminReady) { setDetailData(null); return; }
    let cancelled = false;
    (async () => {
      setDetailData(null);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data, error } = await (supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)(
        "admin_user_withdraw_history",
        { _actor: u.user.id, _user_id: detail.user_id },
      );
      if (cancelled) return;
      if (error) { toast.error("বিস্তারিত লোড ব্যর্থ"); return; }
      setDetailData(data as DetailData);
    })();
    return () => { cancelled = true; };
  }, [detail, adminReady]);

  const counts = useMemo(() => ({
    pending: rows?.filter((r) => r.status === "pending").length ?? 0,
    approved: rows?.filter((r) => r.status === "approved" || r.status === "paid").length ?? 0,
    rejected: rows?.filter((r) => r.status === "rejected").length ?? 0,
    all: rows?.length ?? 0,
  }), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    if (filter === "all") return rows;
    if (filter === "approved") return rows.filter((r) => r.status === "approved" || r.status === "paid");
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const { setRowRef } = useSearchHighlight(highlight, adminReady && !!rows);


  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      await reviewWithdrawal(id, "approve");
      toast.success("অ্যাপ্রুভ হয়েছে — ব্যালেন্স ডেবিট");
      refresh();
      setDetail(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  const handleReject = async () => {
    if (!reject) return;
    if (reason.trim().length < 3) { toast.error("কারণ নির্বাচন বা লিখুন (৩+ অক্ষর)"); return; }
    setBusy(reject.id);
    try {
      await reviewWithdrawal(reject.id, "reject", reason.trim());
      toast.success("রিজেক্ট হয়েছে");
      setReject(null); setReason(""); refresh();
      setDetail(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  return (
    <>
      <AdminPageHeader accent="emerald" Icon={ArrowDownToLine}
        title="উইথড্র রিকোয়েস্ট"
        subtitle="অ্যাপ্রুভ করলে ইউজারের ব্যালেন্স থেকে ডেবিট হবে"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending","approved","rejected","all"] as Filter[]).map((f) => {
          const active = filter === f;
          const meta = {
            pending:  { label: "পেন্ডিং",   from: "from-amber-500",   to: "to-orange-600", ring: "ring-amber-200/60",   shadow: "shadow-amber-500/40" },
            approved: { label: "অ্যাপ্রুভড", from: "from-emerald-500", to: "to-teal-600",   ring: "ring-emerald-200/60", shadow: "shadow-emerald-500/40" },
            rejected: { label: "রিজেক্টেড", from: "from-rose-500",    to: "to-red-600",    ring: "ring-rose-200/60",    shadow: "shadow-rose-500/40" },
            all:      { label: "সকল",       from: "from-slate-600",   to: "to-slate-800",  ring: "ring-slate-200/60",   shadow: "shadow-slate-500/40" },
          }[f];
          return (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white ring-1 shadow-xl transition-all animate-admin-pop hover:scale-[1.02] hover:-translate-y-0.5",
              meta.from, meta.to, meta.ring, meta.shadow,
              active && "ring-2 ring-white scale-[1.03]",
            )}>
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_60%)]" />
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">{meta.label}</p>
                <p className="mt-1 bn-display text-3xl font-extrabold drop-shadow-sm">{counts[f].toLocaleString("bn-BD")}</p>
                {active && <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/90">● নির্বাচিত</p>}
              </div>
            </button>
          );
        })}
      </div>

      {!adminReady || !filtered ? <Shimmer className="h-40" /> : filtered.length === 0 ? (
        <EmptyState Icon={ArrowDownToLine} title="কোনো রিকোয়েস্ট নেই" accent="emerald" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.id} ref={setRowRef(r.id)}>
            <AdminCard accent="emerald" interactive className="p-4 flex flex-col">

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="bn-display text-base text-slate-900 truncate">{r.profiles?.full_name ?? "—"}</p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {r.profiles?.user_code ? `${r.profiles.user_code} · ` : ""}{r.profiles?.phone ?? ""}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>

              <div className="mt-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="bn-display text-2xl bg-gradient-to-br bg-clip-text text-transparent from-emerald-600 to-teal-700 leading-none">৳{Number(r.amount).toLocaleString("bn-BD")}</p>
                  <p className="mt-1 text-[11px] text-slate-500 font-mono truncate">{r.account_number}</p>
                </div>
                {r.method && <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md", METHOD[r.method])}>{r.method}</span>}
              </div>

              {(r.rejection_reason || r.note) && (
                <p className="mt-2 text-xs text-rose-600 line-clamp-2">কারণ: {r.rejection_reason ?? r.note}</p>
              )}
              <p className="mt-2 text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString("bn-BD")}</p>
              <p className="mt-1 text-[10px] font-bold text-indigo-700 font-mono">
                Withdraw সময় Balance: {r.balance_at_request != null ? `৳${Number(r.balance_at_request).toLocaleString("bn-BD")}` : "—"}
              </p>

              <div className="mt-3 flex gap-2">
                <SoftButton className="flex-1" onClick={() => setDetail(r)}>
                  <Eye className="h-4 w-4" /> বিস্তারিত
                </SoftButton>
                {r.status === "pending" && (
                  <>
                    <GradientButton accent="emerald" className="flex-1" busy={busy === r.id} onClick={() => handleApprove(r.id)}>
                      <Check className="h-4 w-4" /> অ্যাপ্রুভ
                    </GradientButton>
                    <GradientButton accent="rose" className="flex-1" onClick={() => { setReject(r); setReason(""); }}>
                      <X className="h-4 w-4" /> রিজেক্ট
                    </GradientButton>
                  </>
                )}
              </div>
            </AdminCard>
            </div>

          ))}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-admin-pop">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 backdrop-blur px-5 py-3">
              <div className="min-w-0">
                <h3 className="bn-display text-lg text-slate-900 truncate">উইথড্র বিস্তারিত</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">ID: {detail.id.slice(0,8)}…</p>
              </div>
              <button onClick={() => setDetail(null)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current request */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">এই রিকোয়েস্ট</p>
                <div className="mt-1 flex items-end justify-between">
                  <p className="bn-display text-3xl font-extrabold">৳{Number(detail.amount).toLocaleString("bn-BD")}</p>
                  {detail.method && <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold uppercase text-white/95 bg-white/20 backdrop-blur")}>{detail.method}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/90 font-mono">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{detail.account_number}</span>
                  <button onClick={() => detail.account_number && navigator.clipboard.writeText(detail.account_number).then(() => toast.success("কপি হয়েছে"))} className="ml-auto rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"><Copy className="h-3 w-3" /></button>
                </div>
                <p className="mt-2 text-[11px] text-white/80">{new Date(detail.created_at).toLocaleString("bn-BD")}</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg bg-white/15 px-2 py-1 backdrop-blur">
                    <p className="text-white/75">মোট (Gross)</p>
                    <p className="font-mono font-bold">৳{Number(detail.gross_amount ?? detail.amount).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-white/15 px-2 py-1 backdrop-blur">
                    <p className="text-white/75">চার্জ (২%)</p>
                    <p className="font-mono font-bold">৳{Number(detail.fee ?? 0).toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-white/15 px-2 py-1 backdrop-blur">
                    <p className="text-white/75">তখনকার ব্যালেন্স</p>
                    <p className="font-mono font-bold">{detail.balance_at_request != null ? `৳${Number(detail.balance_at_request).toFixed(2)}` : "—"}</p>
                  </div>
                </div>
              </div>

              {/* User info */}
              {!detailData ? <Shimmer className="h-24" /> : detailData.profile && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"><User className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="bn-display text-base text-slate-900 truncate">{detailData.profile.full_name ?? "—"}</p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">{detailData.profile.user_code} · {detailData.profile.email ?? ""}</p>
                      </div>
                      <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                        detailData.profile.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                        {detailData.profile.status ?? "—"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <p className="text-[10px] text-slate-500">ব্যালেন্স</p>
                        <p className="bn-display text-sm text-emerald-700">৳{Number(detailData.profile.balance).toLocaleString("bn-BD")}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <p className="text-[10px] text-slate-500">লকড</p>
                        <p className="bn-display text-sm text-amber-700">৳{Number(detailData.profile.locked_balance).toLocaleString("bn-BD")}</p>
                      </div>
                      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <p className="text-[10px] text-slate-500">মোট আয়</p>
                        <p className="bn-display text-sm text-violet-700">৳{Number(detailData.profile.total_earned).toLocaleString("bn-BD")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <StatTile Icon={TrendingUp} label="মোট" value={detailData.stats.total_requests} color="slate" />
                    <StatTile Icon={Clock} label="পেন্ডিং" value={detailData.stats.pending_count} color="amber" />
                    <StatTile Icon={CheckCircle2} label="অ্যাপ্রুভড" value={detailData.stats.approved_count} color="emerald" />
                    <StatTile Icon={XCircle} label="রিজেক্টেড" value={detailData.stats.rejected_count} color="rose" />
                  </div>
                  <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs text-emerald-800">এখন পর্যন্ত মোট উত্তোলিত: <span className="font-bold font-mono">৳{Number(detailData.stats.approved_total).toLocaleString("bn-BD")}</span></p>
                  </div>

                  {/* History */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">পূর্বের রিকোয়েস্ট ({detailData.history.length})</p>
                    {detailData.history.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">এটিই প্রথম উইথড্র রিকোয়েস্ট</div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {detailData.history.map((h) => {
                          const gross = Number(h.gross_amount ?? h.amount ?? 0);
                          const fee = Number(h.fee ?? 0);
                          const net = Number(h.amount ?? Math.max(gross - fee, 0));
                          const requestBalance = h.balance_at_request != null ? Number(h.balance_at_request) : null;
                          return (
                            <div key={h.id} className={cn("rounded-xl bg-white ring-1 ring-slate-200 p-2.5",
                              h.id === detail.id && "ring-2 ring-emerald-400 bg-emerald-50")}>
                              <div className="flex items-start gap-3">
                                <StatusPill status={h.status} compact />
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                                    <p className="text-sm font-bold text-slate-900 font-mono">৳{net.toLocaleString("bn-BD")} <span className="text-[10px] text-slate-500 uppercase">{h.method ?? "—"}</span></p>
                                    <p className="text-[10px] font-bold text-indigo-700 font-mono">Balance: {requestBalance != null ? `৳${requestBalance.toLocaleString("bn-BD")}` : "—"}</p>
                                  </div>
                                  <p className="text-[10px] text-slate-500">{new Date(h.created_at).toLocaleString("bn-BD")}{h.reviewed_at ? ` · রিভিউ ${new Date(h.reviewed_at).toLocaleDateString("bn-BD")}` : ""}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">রিকোয়েস্ট ৳{gross.toLocaleString("bn-BD")} · ফি ৳{fee.toLocaleString("bn-BD")}</p>
                                  {h.account_number && <p className="text-[10px] text-slate-500 font-mono">{h.account_number}</p>}
                                  {h.rejection_reason && <p className="text-[10px] text-rose-600">✕ {h.rejection_reason}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              {detail.status === "pending" && (
                <div className="flex gap-2 pt-1">
                  <GradientButton accent="emerald" className="flex-1" busy={busy === detail.id} onClick={() => handleApprove(detail.id)}>
                    <Check className="h-4 w-4" /> অ্যাপ্রুভ
                  </GradientButton>
                  <GradientButton accent="rose" className="flex-1" onClick={() => { setReject(detail); setReason(""); }}>
                    <X className="h-4 w-4" /> রিজেক্ট
                  </GradientButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal — with prebuilt reasons */}
      {reject && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="bn-display text-lg text-slate-900">রিজেক্ট কারণ</h3>
                <p className="text-xs text-slate-500">দ্রুত নির্বাচন করতে নিচের অপশনে ক্লিক করুন</p>
              </div>
              <button onClick={() => { setReject(null); setReason(""); }} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_REASONS.map((r) => {
                const active = reason === r;
                return (
                  <button key={r} onClick={() => setReason(r)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition",
                      active
                        ? "bg-gradient-to-r from-rose-500 to-red-600 border-transparent text-white shadow-md"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-300 hover:bg-rose-50",
                    )}>
                    {r}
                  </button>
                );
              })}
            </div>

            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
              placeholder="অথবা কাস্টম কারণ লিখুন…"
              className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-rose-400" />

            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => { setReject(null); setReason(""); }}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" busy={busy === reject.id} onClick={handleReject}>
                <X className="h-4 w-4" /> রিজেক্ট নিশ্চিত করুন
              </GradientButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusPill({ status, compact }: { status: "pending"|"approved"|"rejected"|"paid"; compact?: boolean }) {
  const map = {
    pending:  { label: "পেন্ডিং",   cls: "bg-amber-100 text-amber-700",     Icon: Clock },
    approved: { label: "অ্যাপ্রুভড", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    paid:     { label: "পেইড",      cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    rejected: { label: "রিজেক্টেড", cls: "bg-rose-100 text-rose-700",       Icon: XCircle },
  }[status];
  const { label, cls, Icon } = map;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap", cls)}>
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}

function StatTile({ Icon, label, value, color }: {
  Icon: typeof Clock; label: string; value: number;
  color: "slate"|"amber"|"emerald"|"rose";
}) {
  const c = {
    slate:   "from-slate-500 to-slate-700",
    amber:   "from-amber-500 to-orange-600",
    emerald: "from-emerald-500 to-teal-600",
    rose:    "from-rose-500 to-red-600",
  }[color];
  return (
    <div className={cn("rounded-xl bg-gradient-to-br p-2.5 text-white text-center shadow-md", c)}>
      <Icon className="mx-auto h-3.5 w-3.5 opacity-80" />
      <p className="bn-display mt-0.5 text-lg leading-none font-extrabold">{value.toLocaleString("bn-BD")}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/85">{label}</p>
    </div>
  );
}

void Loader2;
