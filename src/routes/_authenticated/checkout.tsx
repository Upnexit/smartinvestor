import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  X, ArrowLeft, Check, Copy, ShieldCheck, Loader2, Sparkles, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  createPendingCheckoutOrder,
  submitCheckoutPayment,
} from "@/lib/checkout.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "চেকআউট — Smart Investor" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ pkg: typeof s.pkg === "string" ? s.pkg : "" }),
  component: CheckoutPage,
});

type Method = "bkash" | "nagad" | "rocket";
type Step = "select" | "account" | "waiting" | "trx" | "success";

const BRAND: Record<Method, { name: string; primary: string; gradient: string; letter: string; from: string; to: string }> = {
  bkash:  { name: "bKash",  primary: "#E2136E", gradient: "linear-gradient(135deg,#E2136E 0%,#B30F58 100%)", letter: "b", from: "from-[#E2136E]", to: "to-[#B30F58]" },
  nagad:  { name: "Nagad",  primary: "#EC1C24", gradient: "linear-gradient(135deg,#EC1C24 0%,#F36F21 100%)", letter: "N", from: "from-[#EC1C24]", to: "to-[#F36F21]" },
  rocket: { name: "Rocket", primary: "#8E2C8B", gradient: "linear-gradient(135deg,#8E2C8B 0%,#5B1B5E 100%)", letter: "R", from: "from-[#8E2C8B]", to: "to-[#5B1B5E]" },
};

type Pkg = { id: string; name: string; price: number; duration_days: number };
type PayAccounts = {
  bkash?: string; nagad?: string; rocket?: string;
  instructions?: string; system_logo_url?: string;
  logos?: Partial<Record<Method, string>>;
  guides?: Partial<Record<Method, string>>;
};

function BrandBadge({ method, size = 44, logoUrl }: { method: Method; size?: number; logoUrl?: string }) {
  const b = BRAND[method];
  if (logoUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="grid place-items-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 overflow-hidden p-1"
      >
        <img src={logoUrl} alt={b.name} className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <div
      style={{ width: size, height: size, background: b.gradient }}
      className="grid place-items-center rounded-2xl text-white font-extrabold shadow-md ring-1 ring-white/30"
    >
      {method === "nagad" ? <span className="italic text-xl">N</span>
        : method === "bkash" ? <span className="text-xl">b<span className="text-amber-200">.</span></span>
        : <span className="text-xl">◆</span>}
    </div>
  );
}

function InlineCopy({ value, variant = "number", className }: { value: string; variant?: "number" | "amount"; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); toast.success("কপি হয়েছে"); setTimeout(() => setCopied(false), 1500); } catch {}
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-sm font-bold ring-1 transition",
        variant === "number" ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100",
        className,
      )}
    >
      {value}
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-70" />}
    </button>
  );
}

function CheckoutPage() {
  const { pkg: pkgId } = useSearch({ from: "/_authenticated/checkout" });
  const navigate = useNavigate();
  const createOrder = useServerFn(createPendingCheckoutOrder);
  const submitPayment = useServerFn(submitCheckoutPayment);

  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [accounts, setAccounts] = useState<PayAccounts>({});
  const [step, setStep] = useState<Step>("select");
  const [method, setMethod] = useState<Method | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Load package + payment accounts
  useEffect(() => {
    if (!pkgId) { navigate({ to: "/packages" }); return; }
    (async () => {
      const [{ data: p }, { data: s }, { data: perMethod }] = await Promise.all([
        supabase.from("packages").select("id,name,price,duration_days").eq("id", pkgId).maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "payment_accounts").maybeSingle(),
        supabase.from("site_settings").select("key,value").in("key", ["payment_bkash","payment_nagad","payment_rocket"]),
      ]);
      if (!p) { toast.error("প্যাকেজ পাওয়া যায়নি"); navigate({ to: "/packages" }); return; }
      setPkg(p as Pkg);
      const base = (s?.value as PayAccounts) ?? {};
      const logos: Partial<Record<Method, string>> = { ...(base.logos ?? {}) };
      const merged: PayAccounts = { ...base };
      (perMethod ?? []).forEach((r) => {
        const m = (r.key as string).replace("payment_", "") as Method;
        const v = r.value as { number?: string; logo_url?: string; active?: boolean } | null;
        if (!v || v.active === false) return;
        if (v.number && !merged[m]) merged[m] = v.number;
        if (v.logo_url) logos[m] = v.logo_url;
      });
      merged.logos = logos;
      setAccounts(merged);
    })();
  }, [pkgId, navigate]);

  // Countdown in waiting step
  useEffect(() => {
    if (step !== "waiting") return;
    setCountdown(30);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(t); setStep("trx"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  const phoneNorm = useMemo(() => {
    let n = senderNumber.replace(/\D/g, "");
    if (n.length === 13 && n.startsWith("880")) n = "0" + n.slice(3);
    return n;
  }, [senderNumber]);
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneNorm);
  const trxNorm = trxId.trim().toUpperCase();
  const trxValid = /^[A-Z0-9]{6,32}$/.test(trxNorm);

  const activeNumber = method ? (accounts[method] ?? "") : "";
  const invoiceShort = (orderId ?? pkg?.id ?? "").replace(/-/g, "").slice(0, 8).toUpperCase();

  const handleConfirmNumber = async () => {
    if (!pkg || !method || !phoneValid) return;
    setCreating(true);
    setOrderError(null);
    setStep("waiting");
    try {
      const r = await createOrder({ data: { packageId: pkg.id, method, senderNumber: phoneNorm } });
      setOrderId(r.orderId);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "অর্ডার তৈরি ব্যর্থ");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitTrx = async () => {
    if (!pkg || !method || !trxValid || !phoneValid) return;
    setSubmitting(true);
    const tId = toast.loading("পাঠানো হচ্ছে…");
    const start = Date.now();
    try {
      await submitPayment({ data: { packageId: pkg.id, method, senderNumber: phoneNorm, trxId: trxNorm } });
      const wait = Math.max(0, 700 - (Date.now() - start));
      await new Promise((r) => setTimeout(r, wait));
      toast.success("✓ Approval request গ্রহণ করা হয়েছে — অ্যাডমিন প্যানেলে পাঠানো হয়েছে", { id: tId });
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "সাবমিট ব্যর্থ", { id: tId });
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (orderId) {
      try { await supabase.from("user_packages").delete().eq("id", orderId); } catch {}
    }
    setOrderId(null);
    setStep("select");
  };

  if (!pkg) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="relative min-h-full px-4 py-6">
        <div className="mx-auto max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-amber-200/50 overflow-hidden">
          {step === "select" && (
            <StepSelect
              pkg={pkg} accounts={accounts} method={method} setMethod={setMethod} invoiceShort={invoiceShort}
              onNext={() => setStep("account")} onClose={() => navigate({ to: "/packages" })}
            />
          )}
          {step === "account" && method && (
            <StepAccount
              pkg={pkg} method={method} accounts={accounts} senderNumber={senderNumber} setSenderNumber={setSenderNumber}
              phoneValid={phoneValid} phoneNorm={phoneNorm} invoiceShort={invoiceShort}
              onBack={() => setStep("select")} onConfirm={handleConfirmNumber} creating={creating}
            />
          )}
          {step === "waiting" && method && (
            <StepWaiting
              pkg={pkg} method={method} accounts={accounts} countdown={countdown}
              activeNumber={activeNumber} orderError={orderError} creating={creating}
              onCancel={handleCancel} onNext={() => setStep("trx")} onRetry={handleConfirmNumber}
            />
          )}
          {step === "trx" && method && (
            <StepTrx
              pkg={pkg} method={method} accounts={accounts} activeNumber={activeNumber} trxId={trxId} setTrxId={setTrxId}
              trxNorm={trxNorm} trxValid={trxValid} submitting={submitting}
              onBack={() => setStep("waiting")} onSubmit={handleSubmitTrx}
            />
          )}
          {step === "success" && method && (
            <StepSuccess pkg={pkg} method={method} senderNumber={phoneNorm} trxId={trxNorm} invoiceShort={invoiceShort} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 1: select ---------------- */
function StepSelect({ pkg, accounts, method, setMethod, invoiceShort, onNext, onClose }: {
  pkg: Pkg; accounts: PayAccounts; method: Method | null;
  setMethod: (m: Method) => void; invoiceShort: string; onNext: () => void; onClose: () => void;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {accounts.system_logo_url
            ? <img src={accounts.system_logo_url} alt="logo" className="h-9 w-9 rounded-xl object-cover" />
            : <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white"><Sparkles className="h-5 w-5" /></div>}
          <h2 className="bn-display text-lg text-slate-900">পেমেন্ট মেথড নির্বাচন করুন</h2>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="বন্ধ করুন">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
        <p className="text-xs uppercase tracking-wider text-amber-700">ইনভয়েস</p>
        <div className="mt-1 flex items-end justify-between">
          <div>
            <p className="bn-display text-base text-slate-900">{pkg.name}</p>
            <p className="text-xs text-slate-500 font-mono">#{invoiceShort}</p>
          </div>
          <p className="bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 bg-clip-text text-3xl font-extrabold text-transparent">
            ৳{pkg.price}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {(["bkash", "nagad", "rocket"] as Method[]).map((m) => {
          const b = BRAND[m]; const sel = method === m;
          return (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "w-full flex items-center gap-3 rounded-2xl border-2 p-3 transition text-left",
                sel ? "border-slate-900 bg-slate-50 shadow-md" : "border-slate-200 hover:border-slate-300 bg-white",
              )}
            >
              <BrandBadge method={m} logoUrl={accounts.logos?.[m]} />
              <div className="flex-1">
                <p className="bn-display text-base text-slate-900">{b.name}</p>
                <p className="text-xs text-slate-500">Send Money</p>
              </div>
              <div className={cn(
                "h-5 w-5 rounded-full border-2 grid place-items-center transition",
                sel ? "border-slate-900" : "border-slate-300",
              )}>
                {sel && <div className="h-2.5 w-2.5 rounded-full bg-slate-900 animate-in zoom-in" />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!method}
        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-4 text-base font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
      >
        পরবর্তী ধাপ →
      </button>
    </div>
  );
}

/* ---------------- Step 2: account ---------------- */
function StepAccount({ pkg, method, senderNumber, setSenderNumber, phoneValid, phoneNorm, invoiceShort, onBack, onConfirm, creating }: {
  pkg: Pkg; method: Method; senderNumber: string; setSenderNumber: (v: string) => void;
  phoneValid: boolean; phoneNorm: string; invoiceShort: string;
  onBack: () => void; onConfirm: () => void; creating: boolean;
}) {
  const b = BRAND[method];
  return (
    <div>
      <div className="p-5 text-white" style={{ background: b.gradient }}>
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> পেছনে
        </button>
        <div className="flex items-center gap-3">
          <BrandBadge method={method} logoUrl={accounts.logos?.[method]} />
          <h2 className="bn-display text-xl">আপনার {b.name} নাম্বার দিন</h2>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">আপনার মোবাইল নাম্বার</label>
          <input
            type="tel" inputMode="numeric" maxLength={14}
            value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}
            placeholder="01XXXXXXXXX"
            className={cn(
              "mt-1.5 w-full rounded-xl border-2 px-4 py-3 font-mono text-lg outline-none transition",
              senderNumber.length === 0 ? "border-slate-200 focus:border-amber-400"
                : phoneValid ? "border-emerald-400 bg-emerald-50/40" : "border-rose-300 bg-rose-50/40",
            )}
            autoFocus
          />
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            {senderNumber.length === 0 ? (
              <span className="text-slate-500">বাংলাদেশী মোবাইল (যেমন: 01712345678)</span>
            ) : phoneValid ? (
              <><Check className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700 font-semibold">সঠিক নাম্বার</span></>
            ) : (
              <span className="text-rose-600">নাম্বারটি সঠিক নয়</span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-700">পরিমাণ</p>
            <InlineCopy value={String(pkg.price)} variant="amount" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-amber-700">ইনভয়েস</p>
            <InlineCopy value={invoiceShort} variant="number" />
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={!phoneValid || creating}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-4 text-base font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {creating ? "অপেক্ষা করুন…" : "নিশ্চিত করুন"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Step 3: waiting ---------------- */
function StepWaiting({ pkg, method, accounts, countdown, activeNumber, orderError, creating, onCancel, onNext, onRetry }: {
  pkg: Pkg; method: Method; accounts: PayAccounts; countdown: number; activeNumber: string;
  orderError: string | null; creating: boolean; onCancel: () => void; onNext: () => void; onRetry: () => void;
}) {
  const b = BRAND[method];
  const radius = 36; const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - countdown / 30);
  return (
    <div>
      <div className="p-5 text-white" style={{ background: b.gradient }}>
        <div className="flex items-center gap-3">
          <BrandBadge method={method} logoUrl={accounts.logos?.[method]} />
          <div className="flex-1">
            <p className="text-xs text-white/85">{b.name} মার্চেন্ট নাম্বার</p>
            <p className="font-mono text-xl font-bold">{activeNumber || "—"}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="bn-display text-base text-slate-900">পেমেন্ট পাঠান</h3>
        <ol className="space-y-2.5 text-sm">
          <Step n={1}>{b.name} অ্যাপ খুলুন</Step>
          <Step n={2}>"Send Money" সিলেক্ট করুন</Step>
          <Step n={3}>Merchant Number: <InlineCopy value={activeNumber} variant="number" /></Step>
          <Step n={4}>Amount: <InlineCopy value={String(pkg.price)} variant="amount" /></Step>
          <Step n={5}>Confirm করুন এবং TrxID সংগ্রহ করুন</Step>
          <Step n={6}>নিচের ধাপে TrxID জমা দিন</Step>
        </ol>

        {accounts.guides?.[method] && (
          <img src={accounts.guides[method]} alt="guide" className="mt-2 w-full rounded-xl shadow-md ring-1 ring-slate-200" />
        )}

        {orderError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs text-rose-700">
              <p>{orderError}</p>
              <button onClick={onRetry} className="mt-1 font-bold underline">আবার চেষ্টা করুন</button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="relative h-24 w-24">
            <svg className="-rotate-90 h-24 w-24" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} className="fill-none stroke-slate-200" strokeWidth="6" />
              <circle cx="40" cy="40" r={radius} className="fill-none transition-all" stroke={b.primary} strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="bn-display text-2xl text-slate-900">{countdown}s</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">অপেক্ষা করুন… {creating && "(অর্ডার তৈরি হচ্ছে)"}</p>
        </div>

        <button
          onClick={onNext}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-4 text-base font-bold text-white shadow-lg"
        >
          TrxID দিন →
        </button>
        <button onClick={onCancel} className="w-full rounded-xl py-2 text-sm font-semibold text-slate-500 hover:text-rose-600">
          বাতিল করুন
        </button>
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{n}</span>
      <span className="flex flex-wrap items-center gap-1.5 text-slate-700">{children}</span>
    </li>
  );
}

/* ---------------- Step 4: trx ---------------- */
function StepTrx({ pkg, method, activeNumber, trxId, setTrxId, trxNorm, trxValid, submitting, onBack, onSubmit }: {
  pkg: Pkg; method: Method; activeNumber: string;
  trxId: string; setTrxId: (v: string) => void; trxNorm: string; trxValid: boolean;
  submitting: boolean; onBack: () => void; onSubmit: () => void;
}) {
  const b = BRAND[method];
  return (
    <div>
      <div className="p-5 text-white" style={{ background: b.gradient }}>
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-white/90 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> পেছনে
        </button>
        <div className="flex items-center gap-3">
          <BrandBadge method={method} logoUrl={accounts.logos?.[method]} />
          <div className="flex-1">
            <p className="text-xs text-white/85">পাঠিয়েছেন → {activeNumber}</p>
            <p className="font-mono text-lg font-bold">৳{pkg.price}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <InlineCopy value={activeNumber} variant="number" />
          <InlineCopy value={String(pkg.price)} variant="amount" />
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700">আপনার Transaction ID দিন</label>
          <input
            value={trxId}
            onChange={(e) => setTrxId(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={32}
            className={cn(
              "mt-1.5 w-full rounded-xl border-2 px-4 py-4 font-mono text-2xl tracking-wider uppercase outline-none transition",
              trxId.length === 0 ? "border-slate-200 focus:border-amber-400"
                : trxValid ? "border-emerald-400 bg-emerald-50/40" : "border-rose-300 bg-rose-50/40",
            )}
            autoFocus
          />
          <p className="mt-1.5 text-xs text-slate-500">
            যেমন: <span className="font-mono">8N7HG2K9P</span> ({b.name} থেকে SMS-এ পাওয়া যাবে)
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">
            আপনার TrxID অ্যাডমিন ম্যানুয়ালি যাচাই করে কয়েক মিনিটের মধ্যে অ্যাপ্রুভ করবেন।
          </p>
        </div>

        <button
          onClick={onSubmit}
          disabled={!trxValid || submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-4 text-base font-bold text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> পাঠানো হচ্ছে…</> : "Submit & Request Approval"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Step 5: success ---------------- */
function StepSuccess({ pkg, method, senderNumber, trxId, invoiceShort }: {
  pkg: Pkg; method: Method; senderNumber: string; trxId: string; invoiceShort: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="p-6 text-center space-y-4">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg">
        <Check className="h-9 w-9" />
      </div>
      <h2 className="bn-display text-2xl text-slate-900">পেমেন্ট সফল!</h2>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-left space-y-2 text-sm">
        <Row k="প্যাকেজ" v={pkg.name} />
        <Row k="পরিমাণ" v={`৳${pkg.price}`} />
        <Row k="মেথড" v={BRAND[method].name} />
        <Row k="পাঠানো নাম্বার" v={senderNumber} mono />
        <Row k="TrxID" v={trxId} mono />
        <Row k="ইনভয়েস" v={`#${invoiceShort}`} mono />
        <Row k="সময়" v={new Date().toLocaleString("bn-BD")} />
      </div>

      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 py-4 text-base font-bold text-white shadow-lg"
      >
        ড্যাশবোর্ডে যান
      </button>
    </div>
  );
}
function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{k}</span>
      <span className={cn("font-semibold text-slate-900", mono && "font-mono text-xs")}>{v}</span>
    </div>
  );
}
