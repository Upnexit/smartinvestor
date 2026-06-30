import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownToLine, Check, X, Loader2 } from "lucide-react";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { reviewWithdrawal } from "@/lib/admin-client";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/withdrawals")({
  head: () => ({ meta: [{ title: "উইথড্র — Admin" }] }),
  component: WithdrawalsPage,
});

type Filter = "pending" | "approved" | "rejected" | "all";
type Row = {
  id: string; user_id: string; amount: number; method: "bkash"|"nagad"|"rocket"|null;
  account_number: string | null; status: "pending"|"approved"|"rejected"|"paid";
  note: string | null; created_at: string; reviewed_at: string | null;
  profiles?: { full_name: string | null; phone: string | null } | null;
};

const METHOD: Record<string, string> = {
  bkash: "bg-gradient-to-br from-pink-500 to-rose-600",
  nagad: "bg-gradient-to-br from-orange-500 to-amber-600",
  rocket:"bg-gradient-to-br from-purple-500 to-violet-600",
};

function WithdrawalsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [reject, setReject] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);



  const refresh = () => {
    supabase.from("withdrawals")
      .select("id,user_id,amount,method,account_number,status,note,created_at,reviewed_at,profiles!withdrawals_user_id_fkey(full_name,phone)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  };
  useAdminAutoRefresh(refresh);

  useEffect(() => {
    const ch = supabase.channel("admin-wd")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      await reviewWithdrawal(id, "approve");
      toast.success("অ্যাপ্রুভ হয়েছে — ব্যালেন্স ডেবিট");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  const handleReject = async () => {
    if (!reject) return;
    if (reason.trim().length < 3) { toast.error("কারণ লিখুন (৩+ অক্ষর)"); return; }
    setBusy(reject.id);
    try {
      await reviewWithdrawal(reject.id, "reject", reason.trim());
      toast.success("রিজেক্ট হয়েছে");
      setReject(null); setReason(""); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  return (
    <>
      <AdminPageHeader accent="emerald" Icon={ArrowDownToLine}
        title="উইথড্র রিকোয়েস্ট"
        subtitle="অ্যাপ্রুভ করলে ইউজারের ব্যালেন্স থেকে ডেবিট হবে"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(["pending","approved","rejected","all"] as Filter[]).map((f) => {
          const active = filter === f;
          const map = { pending: "from-amber-500 to-orange-600", approved: "from-emerald-500 to-teal-600", rejected: "from-rose-500 to-red-600", all: "from-slate-600 to-slate-800" };
          return (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition-all",
              active ? cn("bg-gradient-to-br text-white ring-transparent shadow-md scale-[1.03]", map[f]) : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
            )}>
              {f === "pending" ? "পেন্ডিং" : f === "approved" ? "অ্যাপ্রুভড" : f === "rejected" ? "রিজেক্টেড" : "সকল"}
              <span className={cn("rounded-md px-1.5 text-[10px]", active ? "bg-white/20" : "bg-slate-100 text-slate-500")}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {!filtered ? <Shimmer className="h-40" /> : filtered.length === 0 ? (
        <EmptyState Icon={ArrowDownToLine} title="কোনো রিকোয়েস্ট নেই" accent="emerald" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <AdminCard key={r.id} accent="emerald" interactive className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="bn-display text-base text-slate-900 truncate">{r.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs font-mono text-slate-500">{r.profiles?.phone ?? ""}</p>
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                  r.status === "approved" || r.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                  r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                  {r.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className={cn("bn-display text-2xl bg-gradient-to-br bg-clip-text text-transparent from-emerald-600 to-teal-700")}>৳{Number(r.amount).toLocaleString("bn-BD")}</p>
                <div className="flex items-center gap-1.5">
                  {r.method && <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-md", METHOD[r.method])}>{r.method}</span>}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-mono truncate">{r.account_number}</p>
              {r.note && <p className="mt-1 text-xs text-rose-600">নোট: {r.note}</p>}
              <p className="mt-1 text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString("bn-BD")}</p>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <GradientButton accent="emerald" className="flex-1" busy={busy === r.id} onClick={() => handleApprove(r.id)}>
                    <Check className="h-4 w-4" /> অ্যাপ্রুভ
                  </GradientButton>
                  <GradientButton accent="rose" className="flex-1" onClick={() => { setReject(r); setReason(""); }}>
                    <X className="h-4 w-4" /> রিজেক্ট
                  </GradientButton>
                </div>
              )}
            </AdminCard>
          ))}
        </div>
      )}

      {reject && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <h3 className="bn-display text-lg text-slate-900">রিজেক্ট কারণ</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} autoFocus
              placeholder="অপর্যাপ্ত ব্যালেন্স / ভুল নম্বর / ..."
              className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-rose-400" />
            <div className="mt-3 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setReject(null)}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" busy={busy === reject.id} onClick={handleReject}>রিজেক্ট করুন</GradientButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

void Loader2;
