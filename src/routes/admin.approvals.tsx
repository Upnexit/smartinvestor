import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, ShieldCheck, Copy, Image as ImgIcon } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { reviewOrder, signedUrl } from "@/lib/admin-client";
import { cn } from "@/lib/utils";
import { useSearchHighlight } from "@/hooks/use-search-highlight";

type ApprovalsSearch = { q?: string; highlight?: string; filter?: string };

export const Route = createFileRoute("/admin/approvals")({
  validateSearch: (s: Record<string, unknown>): ApprovalsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    highlight: typeof s.highlight === "string" ? s.highlight : undefined,
    filter: typeof s.filter === "string" ? s.filter : undefined,
  }),
  head: () => ({ meta: [{ title: "পেমেন্ট অ্যাপ্রুভাল — Admin" }] }),
  component: ApprovalsPage,
});


type Status = "pending" | "active" | "rejected" | "all";
type Row = {
  id: string; status: "pending"|"active"|"rejected"|"expired";
  payment_method: "bkash"|"nagad"|"rocket"|null;
  sender_number: string | null; trx_id: string | null; created_at: string;
  rejection_reason: string | null; user_id: string; package_id: string;
  screenshot_url: string | null;
  packages: { name: string; price: number } | null;
  profiles: { full_name: string | null; phone: string | null } | null;
};
const METHOD: Record<string, string> = {
  bkash: "from-pink-500 to-rose-600", nagad: "from-orange-500 to-amber-600", rocket: "from-purple-500 to-violet-600",
};

function ApprovalsPage() {
  const { q: qFromUrl, highlight, filter: filterFromUrl } = Route.useSearch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Status>((filterFromUrl as Status) || (highlight ? "all" : "pending"));
  const [q, setQ] = useState(qFromUrl ?? "");
  const [reject, setReject] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => { if (qFromUrl !== undefined) setQ(qFromUrl); }, [qFromUrl]);




  const refresh = () => supabase.from("user_packages")
    .select("id,status,payment_method,sender_number,trx_id,created_at,rejection_reason,user_id,package_id,screenshot_url,packages(name,price),profiles!user_packages_user_id_profiles_fkey(full_name,phone)")
    .order("created_at",{ascending:false}).limit(200)
    .then(({data, error}) => {
      if (error) { setRows([]); toast.error(error.message); return; }
      setRows((data ?? []) as unknown as Row[]);
    }, (e: unknown) => { setRows([]); toast.error(e instanceof Error ? e.message : "লোড ব্যর্থ"); });
  const adminReady = useAdminAutoRefresh(refresh);
  useEffect(() => {
    if (!adminReady) return;
    const ch = supabase.channel("admin-up").on("postgres_changes",{event:"*",schema:"public",table:"user_packages"}, () => {
      refresh(); toast.info("নতুন আপডেট");
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminReady]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    let r = rows;
    if (filter !== "all") r = r.filter((x) => x.status === filter);
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter((x) =>
        (x.trx_id ?? "").toLowerCase().includes(s) ||
        (x.sender_number ?? "").toLowerCase().includes(s) ||
        (x.profiles?.full_name ?? "").toLowerCase().includes(s) ||
        (x.profiles?.phone ?? "").toLowerCase().includes(s)
      );
    }
    return r;
  }, [rows, filter, q]);

  const { setRowRef } = useSearchHighlight(highlight, adminReady && !!rows);


  const onApprove = async (id: string) => {
    setBusy(id);
    try { await reviewOrder(id, "approve"); toast.success("অ্যাপ্রুভড"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };
  const onReject = async () => {
    if (!reject || reason.trim().length < 3) { toast.error("কারণ লিখুন"); return; }
    setBusy(reject.id);
    try { await reviewOrder(reject.id, "reject", reason.trim()); toast.success("রিজেক্টেড"); setReject(null); setReason(""); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };
  const openShot = async (path: string) => {
    if (path.startsWith("http")) { setShot(path); return; }
    try { const url = await signedUrl("payment-screenshots", path); setShot(url); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  };

  return (
    <>
      <AdminPageHeader accent="amber" Icon={ShieldCheck} title="পেমেন্ট অ্যাপ্রুভাল"
        subtitle="ম্যানুয়াল TrxID যাচাই করে অ্যাপ্রুভ করুন" />
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="TrxID দিয়ে খুঁজুন"
          className="flex-1 min-w-[180px] rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-amber-400" />
        <div className="flex gap-1.5 overflow-x-auto">
          {(["pending","active","rejected","all"] as Status[]).map((f)=>{
            const a = f==="pending"?"from-amber-500 to-orange-600":f==="active"?"from-emerald-500 to-teal-600":f==="rejected"?"from-rose-500 to-red-600":"from-slate-600 to-slate-800";
            const lbl = f==="pending"?"পেন্ডিং":f==="active"?"অ্যাপ্রুভড":f==="rejected"?"রিজেক্টেড":"সকল";
            return (
              <button key={f} onClick={()=>setFilter(f)} className={cn(
                "shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                filter===f ? cn("bg-gradient-to-br text-white shadow-md scale-[1.03]", a) : "bg-white text-slate-600 ring-1 ring-slate-200",
              )}>{lbl}</button>
            );
          })}
        </div>
      </div>

      {!adminReady || !filtered ? <Shimmer className="h-32" /> : filtered.length === 0 ? (
        <EmptyState Icon={ShieldCheck} title="কোনো সাবমিশন নেই" accent="amber" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} ref={setRowRef(r.id)}>
            <AdminCard accent="amber" interactive className="p-4">

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="bn-display text-base text-slate-900 truncate">{r.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500 font-mono">{r.profiles?.phone ?? ""}</p>
                  <p className="text-xs text-slate-700 mt-1">{r.packages?.name} • <span className="bn-display text-emerald-700">৳{r.packages?.price}</span></p>
                </div>
                {r.payment_method && <span className={cn("rounded-md bg-gradient-to-br px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow", METHOD[r.payment_method])}>{r.payment_method}</span>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-amber-50 px-2 py-1 text-xs font-mono text-amber-900 ring-1 ring-amber-200">{r.trx_id ?? "—"}</code>
                {r.trx_id && (
                  <button onClick={() => { navigator.clipboard.writeText(r.trx_id!); toast.success("কপি"); }}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600"><Copy className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">প্রেরক: <span className="font-mono">{r.sender_number ?? "—"}</span></p>
              {r.screenshot_url && (
                <button onClick={() => openShot(r.screenshot_url!)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
                  <ImgIcon className="h-3.5 w-3.5" /> স্ক্রিনশট দেখুন
                </button>
              )}
              {r.rejection_reason && <p className="mt-1 text-[11px] text-rose-600">কারণ: {r.rejection_reason}</p>}
              <p className="mt-1 text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString("bn-BD")}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <GradientButton accent="emerald" className="flex-1" busy={busy===r.id} onClick={() => onApprove(r.id)}><Check className="h-4 w-4" /> অ্যাপ্রুভ</GradientButton>
                  <GradientButton accent="rose" className="flex-1" onClick={() => { setReject(r); setReason(""); }}><X className="h-4 w-4" /> রিজেক্ট</GradientButton>
                </div>
              )}
              <div className="mt-2 text-right">
                <Link to="/admin/users/$id" params={{ id: r.user_id }} className="text-[11px] font-bold text-sky-700 hover:underline">ইউজার দেখুন →</Link>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {reject && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <h3 className="bn-display text-lg">রিজেক্ট কারণ</h3>
            <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={4} autoFocus
              className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-rose-400"
              placeholder="ভুল TrxID / টাকা পাইনি / ..." />
            <div className="mt-3 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setReject(null)}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" busy={busy===reject.id} onClick={onReject}>রিজেক্ট</GradientButton>
            </div>
          </div>
        </div>
      )}

      {shot && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={() => setShot(null)}>
          <img src={shot} alt="screenshot" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
        </div>
      )}
    </>
  );
}
