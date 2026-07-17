import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, Search, Users2, Wallet, TrendingUp, CheckCircle2,
  ChevronDown, ChevronRight, Phone, Loader2, LayoutGrid, ListFilter,
} from "lucide-react";
import { AdminPageHeader, AdminCard, StatTile, Shimmer, EmptyState } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/withdrawals/distributor-approvals")({
  head: () => ({ meta: [{ title: "ডিস্ট্রিবিউটর অ্যাপ্রুভাল রিপোর্ট — Admin" }] }),
  component: DistributorApprovalsPage,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  gross_amount: number | null;
  fee: number | null;
  method: string | null;
  account_number: string | null;
  status: "approved" | "paid";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user_profile?: { full_name: string | null; phone: string | null; user_code: string | null } | null;
};

type DistInfo = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type Grouped = {
  distributor: DistInfo;
  rows: Row[];
  totalGross: number;
  totalSent: number;
  totalFee: number;
  count: number;
};

function DistributorApprovalsPage() {
  const [loading, setLoading] = useState(true);
  const [dists, setDists] = useState<Record<string, DistInfo>>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<"grouped" | "flat">("grouped");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1. Load distributors
      const { data: dRows } = await supabase.from("distributors")
        .select("user_id,full_name,phone,email");
      const distMap: Record<string, DistInfo> = {};
      (dRows ?? []).forEach((d) => { distMap[d.user_id] = d as DistInfo; });

      // 2. Load approved/paid withdrawals reviewed by anyone
      const { data: wRows } = await supabase.from("withdrawals")
        .select("id,user_id,amount,gross_amount,fee,method,account_number,status,reviewed_by,reviewed_at,created_at,profiles!withdrawals_user_id_profiles_fkey(full_name,phone,user_code)")
        .in("status", ["approved", "paid"])
        .not("reviewed_by", "is", null)
        .order("reviewed_at", { ascending: false })
        .limit(2000);

      if (cancelled) return;
      // Keep only those reviewed by a distributor
      const distIds = new Set(Object.keys(distMap));
      const filtered = ((wRows ?? []) as unknown as Row[])
        .filter((r) => r.reviewed_by && distIds.has(r.reviewed_by))
        .map((r) => ({ ...r, user_profile: (r as unknown as { profiles?: Row["user_profile"] }).profiles ?? null }));

      setDists(distMap);
      setRows(filtered);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const grouped = useMemo<Grouped[]>(() => {
    const map = new Map<string, Grouped>();
    for (const r of rows) {
      const did = r.reviewed_by!;
      const dist = dists[did];
      if (!dist) continue;
      const g = map.get(did) ?? { distributor: dist, rows: [], totalGross: 0, totalSent: 0, totalFee: 0, count: 0 };
      g.rows.push(r);
      g.totalGross += Number(r.gross_amount ?? r.amount);
      g.totalSent += Number(r.amount);
      g.totalFee += Number(r.fee ?? 0);
      g.count += 1;
      map.set(did, g);
    }
    let arr = Array.from(map.values()).sort((a, b) => b.totalGross - a.totalGross);
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((g) =>
        (g.distributor.full_name ?? "").toLowerCase().includes(q) ||
        (g.distributor.phone ?? "").toLowerCase().includes(q) ||
        (g.distributor.email ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
  }, [rows, dists, search]);

  const totals = useMemo(() => {
    let gross = 0, sent = 0, fee = 0, count = 0;
    grouped.forEach((g) => { gross += g.totalGross; sent += g.totalSent; fee += g.totalFee; count += g.count; });
    return { gross, sent, fee, count, distCount: grouped.length };
  }, [grouped]);

  return (
    <>
      <AdminPageHeader accent="emerald" Icon={ArrowDownToLine}
        title="ডিস্ট্রিবিউটর অ্যাপ্রুভাল রিপোর্ট"
        subtitle="প্রত্যেক ডিস্ট্রিবিউটর কতগুলো উইথড্র অ্যাপ্রুভ করেছে এবং মোট কত টাকা পাঠিয়েছে" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="ডিস্ট্রিবিউটর" value={totals.distCount.toLocaleString("bn-BD")} Icon={Users2} accent="indigo" />
        <StatTile label="মোট অ্যাপ্রুভাল" value={totals.count.toLocaleString("bn-BD")} Icon={CheckCircle2} accent="emerald" />
        <StatTile label="মোট রিকোয়েস্ট (গ্রস)" value={`৳${totals.gross.toLocaleString("bn-BD")}`} Icon={TrendingUp} accent="amber" />
        <StatTile label="মোট পাঠানো" value={`৳${totals.sent.toLocaleString("bn-BD")}`} Icon={Wallet} accent="sky" />
        <StatTile label="মোট ফি" value={`৳${totals.fee.toLocaleString("bn-BD")}`} Icon={TrendingUp} accent="fuchsia" />
      </div>

      <AdminCard>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={view === "grouped" ? "ডিস্ট্রিবিউটর নাম, ফোন বা ইমেল..." : "ইউজার/ডিস্ট্রিবিউটর নাম, ফোন, ইউজার কোড..."}
              className="w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 shadow-inner">
            <button type="button" onClick={() => setView("grouped")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                view === "grouped" ? "bg-white text-emerald-700 shadow" : "text-slate-500 hover:text-slate-700",
              )}>
              <LayoutGrid className="h-3.5 w-3.5" /> ডিস্ট্রিবিউটর অনুযায়ী
            </button>
            <button type="button" onClick={() => setView("flat")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                view === "flat" ? "bg-white text-emerald-700 shadow" : "text-slate-500 hover:text-slate-700",
              )}>
              <ListFilter className="h-3.5 w-3.5" /> সব একসাথে
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Shimmer key={i} className="h-20 rounded-xl" />)}
          </div>
        )}

        {!loading && view === "grouped" && grouped.length === 0 && (
          <EmptyState Icon={ArrowDownToLine} title="কোনো ডেটা নেই" hint="এখনও কোনো ডিস্ট্রিবিউটর উইথড্র অ্যাপ্রুভ করেনি।" />
        )}

        {!loading && view === "grouped" && grouped.length > 0 && (
          <ul className="space-y-2">
            {grouped.map((g) => {
              const isOpen = expanded === g.distributor.user_id;
              return (
                <li key={g.distributor.user_id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button type="button" onClick={() => setExpanded(isOpen ? null : g.distributor.user_id)}
                    className="w-full flex flex-wrap items-start gap-3 p-3 sm:p-4 text-left hover:bg-slate-50 transition">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{g.distributor.full_name || "—"}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{g.distributor.phone || "—"}</span>
                        <span>{g.distributor.email || ""}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">অ্যাপ্রুভ: {g.count.toLocaleString("bn-BD")}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">গ্রস ৳{g.totalGross.toLocaleString("bn-BD")}</span>
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">পাঠানো ৳{g.totalSent.toLocaleString("bn-BD")}</span>
                        <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700">ফি ৳{g.totalFee.toLocaleString("bn-BD")}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="bn-display text-lg font-extrabold text-emerald-700">৳{g.totalSent.toLocaleString("bn-BD")}</p>
                      <p className="text-[10px] text-slate-500">মোট পাঠানো</p>
                    </div>
                    <div className="shrink-0 self-center">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">অ্যাপ্রুভড উইথড্র লিস্ট</p>
                      <div className="space-y-2">
                        {g.rows.map((r) => (
                          <div key={r.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                            <div className="flex flex-wrap items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900 truncate">{r.user_profile?.full_name || "—"}</p>
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{r.user_profile?.user_code || ""}</span>
                                  <span className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                                    r.status === "paid" ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-sky-500 to-indigo-600",
                                  )}>
                                    <CheckCircle2 className="h-3 w-3" />{r.status === "paid" ? "পেইড" : "অ্যাপ্রুভড"}
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                                  <span>{r.user_profile?.phone || ""}</span>
                                  <span>{(r.method || "—").toUpperCase()} • {r.account_number || "—"}</span>
                                  <span>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleString("bn-BD") : ""}</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="bn-display text-base font-extrabold text-emerald-700">৳{Number(r.gross_amount ?? r.amount).toLocaleString("bn-BD")}</p>
                                <p className="text-[10px] text-slate-500">ফি ৳{Number(r.fee ?? 0).toLocaleString("bn-BD")} • পাঠানো ৳{Number(r.amount).toLocaleString("bn-BD")}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {loading && (
          <div className="mt-3 flex items-center justify-center text-xs text-slate-400">
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> লোড হচ্ছে...
          </div>
        )}
      </AdminCard>
    </>
  );
}
