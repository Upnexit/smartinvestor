import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine, Check, X, Loader2, User, Phone, Wallet,
  Clock, CheckCircle2, XCircle, ShieldAlert,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer } from "@/components/admin/AdminUI";
import { reviewWithdrawal } from "@/lib/admin-client";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/distributor/withdrawals")({
  ssr: false,
  head: () => ({ meta: [{ title: "উইথড্র রিকোয়েস্ট — Distributor" }] }),
  component: DistWithdrawalsPage,
});

type Filter = "pending" | "approved" | "rejected" | "all";
type Method = "bkash" | "nagad" | "rocket";
type Row = {
  id: string; user_id: string; amount: number; gross_amount: number | null; fee: number | null;
  balance_at_request: number | null; method: Method | null;
  account_number: string | null; status: "pending" | "approved" | "rejected" | "paid";
  note: string | null; rejection_reason?: string | null;
  created_at: string; reviewed_at: string | null;
  profiles?: { full_name: string | null; phone: string | null; user_code?: string | null } | null;
};

function DistWithdrawalsPage() {
  const navigate = useNavigate();
  const cachedAllowed = (() => {
    try { return sessionStorage.getItem("dist:canManageWithdrawals") === "1"; } catch { return false; }
  })();
  const [ready, setReady] = useState<"checking" | "ok" | "denied">(cachedAllowed ? "ok" : "checking");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [reject, setReject] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    supabase.from("withdrawals")
      .select("id,user_id,amount,gross_amount,fee,balance_at_request,method,account_number,status,note,rejection_reason,created_at,reviewed_at,profiles!withdrawals_user_id_profiles_fkey(full_name,phone,user_code)")
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { setRows([]); toast.error(error.message); return; }
        setRows((data ?? []) as unknown as Row[]);
      });
  };

  // Verify access in background; if cache said yes, we already render optimistically.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (!cancelled) setReady("denied"); return; }
      const { data } = await supabase.from("distributors")
        .select("can_manage_withdrawals,status")
        .eq("user_id", u.user.id).maybeSingle();
      if (cancelled) return;
      const allowed = !!data && (data as { can_manage_withdrawals?: boolean; status?: string }).can_manage_withdrawals
        && ((data as { status?: string }).status ?? "active") === "active";
      try { sessionStorage.setItem("dist:canManageWithdrawals", allowed ? "1" : "0"); } catch { /* ignore */ }
      setReady(allowed ? "ok" : "denied");
    })();
    return () => { cancelled = true; };
  }, []);

  // Start loading rows immediately if cache says access is granted — no waiting.
  useEffect(() => {
    if (!cachedAllowed) return;
    refresh();
    const ch = supabase.channel("dist-wd")
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
      toast.success("অ্যাপ্রুভ হয়েছে — ইউজারের ব্যালেন্স ডেবিট");
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

  if (ready === "checking") {
    return (
      <div className="grid place-items-center py-20 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (ready === "denied") {
    return (
      <div className="mx-auto max-w-md">
        <AdminCard className="text-center p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="bn-display mt-3 text-xl text-slate-900">অ্যাক্সেস নেই</h2>
          <p className="mt-1 text-sm text-slate-500">উইথড্র রিকোয়েস্ট ম্যানেজমেন্ট চালু নেই। অ্যাডমিনের সঙ্গে যোগাযোগ করুন।</p>
          <button onClick={() => navigate({ to: "/distributor" })} className="mt-4 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white">
            ড্যাশবোর্ডে ফিরুন
          </button>
        </AdminCard>
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader accent="emerald" Icon={ArrowDownToLine}
        title="উইথড্র রিকোয়েস্ট"
        subtitle="অ্যাপ্রুভ করলে ইউজারের ব্যালেন্স থেকে ডেবিট হবে"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => {
          const active = filter === f;
          const meta = {
            pending: { label: "পেন্ডিং", from: "from-amber-500", to: "to-orange-600", ring: "ring-amber-200/60", shadow: "shadow-amber-500/40" },
            approved: { label: "অ্যাপ্রুভড", from: "from-emerald-500", to: "to-teal-600", ring: "ring-emerald-200/60", shadow: "shadow-emerald-500/40" },
            rejected: { label: "রিজেক্টেড", from: "from-rose-500", to: "to-red-600", ring: "ring-rose-200/60", shadow: "shadow-rose-500/40" },
            all: { label: "সকল", from: "from-slate-600", to: "to-slate-800", ring: "ring-slate-200/60", shadow: "shadow-slate-500/40" },
          }[f];
          return (
            <button key={f} onClick={() => setFilter(f)} className={cn(
              "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-left text-white ring-1 shadow-xl transition-all hover:scale-[1.02]",
              meta.from, meta.to, meta.ring, meta.shadow,
              active && "ring-2 ring-white scale-[1.03]",
            )}>
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">{meta.label}</p>
                <p className="mt-1 bn-display text-3xl font-extrabold">{counts[f].toLocaleString("bn-BD")}</p>
              </div>
            </button>
          );
        })}
      </div>

      <AdminCard>
        {!filtered && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Shimmer key={i} className="h-24 rounded-xl" />)}
          </div>
        )}
        {filtered && filtered.length === 0 && (
          <EmptyState Icon={ArrowDownToLine} title="কোনো রিকোয়েস্ট নেই" hint="বর্তমান ফিল্টারে কিছু পাওয়া যায়নি।" />
        )}
        {filtered && filtered.length > 0 && (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const st = r.status;
              const statusMeta = {
                pending: { grad: "from-amber-500 to-orange-600", label: "পেন্ডিং", Icon: Clock },
                approved: { grad: "from-emerald-500 to-teal-600", label: "অ্যাপ্রুভড", Icon: CheckCircle2 },
                paid: { grad: "from-emerald-500 to-teal-600", label: "পেইড", Icon: CheckCircle2 },
                rejected: { grad: "from-rose-500 to-red-600", label: "রিজেক্টেড", Icon: XCircle },
              }[st];
              return (
                <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 hover:shadow-md transition">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{r.profiles?.full_name || "—"}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{r.profiles?.user_code || ""}</span>
                        <span className={cn("inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2 py-0.5 text-[10px] font-bold text-white shadow-sm", statusMeta.grad)}>
                          <statusMeta.Icon className="h-3 w-3" /> {statusMeta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {r.profiles?.phone || "—"}</span>
                        <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {(r.method || "—").toUpperCase()} • {r.account_number || "—"}</span>
                        <span>{new Date(r.created_at).toLocaleString("bn-BD")}</span>
                      </div>
                      {r.rejection_reason && (
                        <p className="mt-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200">কারণ: {r.rejection_reason}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="bn-display text-xl font-extrabold text-emerald-700">৳{Number(r.gross_amount ?? r.amount).toLocaleString("bn-BD")}</p>
                      <p className="text-[10px] text-slate-500">ফি ৳{Number(r.fee ?? 0).toLocaleString("bn-BD")} • পাবেন ৳{Number(r.amount).toLocaleString("bn-BD")}</p>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <SoftButton onClick={() => { setReject(r); setReason(""); }} accent="rose">
                        <X className="h-3.5 w-3.5" /> রিজেক্ট
                      </SoftButton>
                      <GradientButton accent="emerald" onClick={() => handleApprove(r.id)} disabled={busy === r.id} busy={busy === r.id}>
                        <Check className="h-3.5 w-3.5" /> অ্যাপ্রুভ
                      </GradientButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      {reject && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-3" role="dialog" aria-modal
          onClick={(e) => { if (e.target === e.currentTarget) setReject(null); }}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
            <div className="bg-gradient-to-br from-rose-500 to-red-600 px-5 py-3 text-white">
              <h3 className="bn-display text-lg">রিজেক্ট করুন</h3>
              <p className="text-xs text-white/80">কারণ লিখুন — ইউজার এটি দেখতে পাবেন</p>
            </div>
            <div className="p-5 space-y-3">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="উদাহরণ: অ্যাকাউন্ট নম্বর ভুল..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-100 resize-none" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReject(null)} disabled={busy === reject.id}
                  className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">বাতিল</button>
                <button type="button" onClick={handleReject} disabled={busy === reject.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-5 py-2 text-sm font-bold text-white shadow-lg disabled:opacity-60">
                  {busy === reject.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} নিশ্চিত
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
