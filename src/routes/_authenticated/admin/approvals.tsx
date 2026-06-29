import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  adminApprovePackage,
  adminRejectPackage,
  checkIsAdmin,
} from "@/lib/checkout.functions";

export const Route = createFileRoute("/_authenticated/admin/approvals")({
  head: () => ({ meta: [{ title: "অ্যাপ্রুভাল — Admin" }] }),
  beforeLoad: async () => {
    try {
      const r = await checkIsAdmin();
      if (!r.isAdmin) throw redirect({ to: "/dashboard" });
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminApprovals,
});

type Filter = "all" | "pending" | "active" | "rejected";

type Row = {
  id: string;
  status: "pending" | "active" | "rejected" | "expired";
  payment_method: "bkash" | "nagad" | "rocket" | null;
  sender_number: string | null;
  trx_id: string | null;
  submitted_at: string | null;
  created_at: string;
  rejection_reason: string | null;
  user_id: string;
  package_id: string;
  packages: { name: string; price: number } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};

const METHOD_COLOR: Record<string, string> = {
  bkash: "bg-pink-100 text-pink-700 ring-pink-200",
  nagad: "bg-orange-100 text-orange-700 ring-orange-200",
  rocket: "bg-purple-100 text-purple-700 ring-purple-200",
};

function AdminApprovals() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const approve = useServerFn(adminApprovePackage);
  const reject = useServerFn(adminRejectPackage);

  const load = async () => {
    const { data } = await supabase
      .from("user_packages")
      .select("id,status,payment_method,sender_number,trx_id,submitted_at,created_at,rejection_reason,user_id,package_id,packages(name,price),profiles!user_packages_user_id_fkey(full_name,phone)")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-approvals")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages" }, () => load())
      .subscribe();
    const poll = setInterval(load, 10000);
    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    active: rows.filter((r) => r.status === "active").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);

  const filtered = useMemo(() => filter === "all" ? rows : rows.filter((r) => r.status === filter), [rows, filter]);

  const handleApprove = async (id: string) => {
    setBusy(id);
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "active" } : r));
    try {
      await approve({ data: { orderId: id } });
      toast.success("অ্যাপ্রুভ করা হয়েছে");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ");
      load();
    } finally { setBusy(null); }
  };

  const handleReject = async () => {
    if (!rejectId || rejectReason.trim().length < 3) { toast.error("কারণ লিখুন (৩+ অক্ষর)"); return; }
    setBusy(rejectId);
    try {
      await reject({ data: { orderId: rejectId, reason: rejectReason.trim() } });
      toast.success("রিজেক্ট করা হয়েছে");
      setRejectId(null); setRejectReason("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="bn-display text-2xl text-slate-900">পেমেন্ট অ্যাপ্রুভাল</h1>
          <p className="text-xs text-slate-500">রিয়েল-টাইম আপডেট • প্রতি ১০s পোলিং</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["pending", "active", "rejected", "all"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition",
              filter === f ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
            )}>
            {f === "pending" ? "Pending" : f === "active" ? "Approved" : f === "rejected" ? "Rejected" : "All"}
            <span className={cn("ml-2 text-xs", filter === f ? "text-white/80" : "text-slate-400")}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          কোনো অর্ডার নেই
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="bn-display text-base text-slate-900 truncate">{r.profiles?.full_name ?? "—"}</p>
                    <span className="text-xs font-mono text-slate-500">{r.profiles?.phone ?? ""}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {r.packages?.name} • <span className="font-bold text-amber-700">৳{r.packages?.price}</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {r.payment_method && (
                      <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold ring-1", METHOD_COLOR[r.payment_method])}>
                        {r.payment_method.toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-600">{r.sender_number ?? "—"}</span>
                  </div>
                  {r.trx_id && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">TrxID</p>
                      <p className="font-mono text-lg font-bold text-slate-900">{r.trx_id}</p>
                    </div>
                  )}
                  {r.rejection_reason && (
                    <p className="mt-1 text-xs text-rose-600">কারণ: {r.rejection_reason}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {new Date(r.submitted_at ?? r.created_at).toLocaleString("bn-BD")}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  r.status === "pending" && "bg-amber-100 text-amber-700",
                  r.status === "active" && "bg-emerald-100 text-emerald-700",
                  r.status === "rejected" && "bg-rose-100 text-rose-700",
                  r.status === "expired" && "bg-slate-100 text-slate-600",
                )}>{r.status}</span>
              </div>

              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleApprove(r.id)} disabled={busy === r.id || !r.trx_id}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => { setRejectId(r.id); setRejectReason(""); }}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 flex items-center justify-center gap-1.5">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <h3 className="bn-display text-lg text-slate-900">রিজেক্ট করার কারণ</h3>
            </div>
            <textarea
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4}
              placeholder="ভুল TrxID / পেমেন্ট পাওয়া যায়নি / ..."
              className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-rose-400"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setRejectId(null)} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">বাতিল</button>
              <button onClick={handleReject} disabled={rejectReason.trim().length < 3 || busy === rejectId}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40">
                রিজেক্ট করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
