import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine, Wallet, Clock, CheckCircle2, XCircle, Loader2,
  AlertCircle, Smartphone, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({ meta: [{ title: "উইথড্র — Smart Investor" }] }),
  component: WithdrawPage,
});

type Method = "bkash" | "nagad" | "rocket";

type WD = {
  id: string;
  amount: number;
  method: Method;
  account_number: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const BRAND: Record<Method, { name: string; from: string; to: string }> = {
  bkash:  { name: "bKash",  from: "from-pink-500",    to: "to-rose-600" },
  nagad:  { name: "Nagad",  from: "from-orange-500",  to: "to-red-600" },
  rocket: { name: "Rocket", from: "from-purple-500",  to: "to-fuchsia-700" },
};

const MIN_WITHDRAW = 200;

function WithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [locked, setLocked] = useState(0);
  const [method, setMethod] = useState<Method>("bkash");
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<WD[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [logos, setLogos] = useState<Record<Method, string>>({ bkash: "", nagad: "", rocket: "" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: p }, { data: w }, { data: pay }] = await Promise.all([
        supabase.from("profiles").select("balance,locked_balance,payment_method,payment_number")
          .eq("id", u.user.id).maybeSingle(),
        supabase.from("withdrawals").select("*").eq("user_id", u.user.id)
          .order("created_at", { ascending: false }).limit(20),
        supabase.from("site_settings").select("key,value").in("key", ["payment_bkash","payment_nagad","payment_rocket"]),
      ]);
      if (p) {
        setBalance(Number(p.balance) || 0);
        setLocked(Number(p.locked_balance) || 0);
        if (p.payment_method) setMethod(p.payment_method as Method);
        if (p.payment_number) setAccountNumber(p.payment_number);
      }
      setHistory((w ?? []) as WD[]);
      const next: Record<Method, string> = { bkash: "", nagad: "", rocket: "" };
      (pay ?? []).forEach((r) => {
        const m = (r.key as string).replace("payment_", "") as Method;
        const v = r.value as { logo_url?: string } | null;
        if (m in next && v?.logo_url) next[m] = v.logo_url;
      });
      setLogos(next);
    })();
  }, []);

  const available = Math.max(0, balance - locked);
  const numAmount = Number(amount) || 0;
  const phoneNorm = accountNumber.replace(/\D/g, "");
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneNorm);
  const amountValid = numAmount >= MIN_WITHDRAW && numAmount <= available;
  const fee = useMemo(() => Math.round(numAmount * 0.02), [numAmount]);
  const willReceive = Math.max(0, numAmount - fee);

  async function handleSubmit() {
    if (!userId || !phoneValid || !amountValid) return;
    setSubmitting(true);
    const tId = toast.loading("রিকোয়েস্ট পাঠানো হচ্ছে…");
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: userId,
        amount: numAmount,
        method,
        account_number: phoneNorm,
      });
      if (error) throw error;
      toast.success("উইথড্র রিকোয়েস্ট গৃহীত — অ্যাডমিন রিভিউ করবেন", { id: tId });
      setAmount("");
      const { data: w } = await supabase.from("withdrawals").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(20);
      setHistory((w ?? []) as WD[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "রিকোয়েস্ট ব্যর্থ", { id: tId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">WITHDRAW</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">উইথড্র করুন 💸</h1>
        <p className="mt-1 text-sm text-slate-600">২ ঘন্টার মধ্যে আপনার একাউন্টে পাঠানো হবে।</p>
      </div>

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/85">তোলার মতো ব্যালেন্স</p>
            <p className="bn-display mt-1 text-4xl">৳ {available.toFixed(2)}</p>
            <p className="mt-1 text-xs text-white/85">মোট: ৳ {balance.toFixed(2)} · লকড: ৳ {locked.toFixed(2)}</p>
          </div>
          <Wallet className="h-10 w-10 opacity-80" />
        </div>
      </div>

      {locked > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">৳{locked.toFixed(2)} লকড আছে</p>
            <p className="mt-0.5 text-xs">প্যাকেজ ক্রয় করে এই বোনাস আনলক করুন।</p>
          </div>
          <Link to="/packages" className="ml-auto rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap">প্যাকেজ</Link>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-soft">
        <div>
          <label className="text-sm font-semibold text-slate-700">পেমেন্ট মেথড</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["bkash", "nagad", "rocket"] as Method[]).map((m) => {
              const b = BRAND[m]; const sel = method === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border-2 p-3 text-center transition",
                    sel ? cn("bg-gradient-to-br text-white border-transparent shadow-md", b.from, b.to)
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300",
                  )}
                >
                  <Smartphone className={cn("mx-auto h-5 w-5", sel ? "text-white" : "text-slate-500")} />
                  <p className="mt-1 text-xs font-bold">{b.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">আপনার {BRAND[method].name} নাম্বার</label>
          <input
            type="tel" inputMode="numeric" maxLength={14}
            value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
            className={cn(
              "mt-1.5 w-full rounded-xl border-2 px-4 py-3 font-mono text-base outline-none transition",
              accountNumber.length === 0 ? "border-slate-200 focus:border-emerald-400"
                : phoneValid ? "border-emerald-400 bg-emerald-50/40"
                : "border-rose-300 bg-rose-50/40",
            )}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">পরিমাণ (৳)</label>
          <input
            type="number" min={MIN_WITHDRAW} inputMode="numeric"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder={`সর্বনিম্ন ${MIN_WITHDRAW}`}
            className={cn(
              "mt-1.5 w-full rounded-xl border-2 px-4 py-3 font-mono text-base outline-none transition",
              !amount ? "border-slate-200 focus:border-emerald-400"
                : amountValid ? "border-emerald-400 bg-emerald-50/40"
                : "border-rose-300 bg-rose-50/40",
            )}
          />
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">সর্বনিম্ন: ৳{MIN_WITHDRAW}</span>
            <button onClick={() => setAmount(String(Math.floor(available)))} className="font-semibold text-emerald-600 hover:underline">
              সর্বোচ্চ: ৳{available.toFixed(0)}
            </button>
          </div>
        </div>

        {numAmount > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
            <div className="flex justify-between text-slate-600"><span>পরিমাণ</span><span className="font-mono">৳{numAmount.toFixed(2)}</span></div>
            <div className="flex justify-between text-slate-600"><span>সার্ভিস চার্জ (২%)</span><span className="font-mono">- ৳{fee.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-emerald-700"><span>আপনি পাবেন</span><span className="font-mono">৳{willReceive.toFixed(2)}</span></div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !phoneValid || !amountValid}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
          {submitting ? "পাঠানো হচ্ছে…" : "উইথড্র রিকোয়েস্ট পাঠান"}
        </button>

        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>নিরাপদ ও বিশ্বস্ত — সাধারণত ২ ঘন্টার মধ্যে অ্যাপ্রুভ হয়।</span>
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="bn-display text-lg text-slate-900">উইথড্র হিস্টোরি</h2>
        <div className="mt-3 space-y-2">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              এখনো কোনো উইথড্র রিকোয়েস্ট নেই
            </div>
          ) : (
            history.map((w) => {
              const b = BRAND[w.method];
              return (
                <div key={w.id} className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-center gap-3">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white text-xs font-bold", b.from, b.to)}>
                    {b.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="bn-display text-sm text-slate-900">৳{Number(w.amount).toFixed(2)} · {b.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{w.account_number} · {new Date(w.created_at).toLocaleString("bn-BD")}</p>
                    {w.rejection_reason && <p className="text-[11px] text-rose-600 mt-0.5">কারণ: {w.rejection_reason}</p>}
                  </div>
                  <StatusBadge status={w.status} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> অনুমোদিত
    </span>
  );
  if (status === "rejected") return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold text-rose-700">
      <XCircle className="h-3 w-3" /> বাতিল
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
      <Clock className="h-3 w-3" /> অপেক্ষমান
    </span>
  );
}
