import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X, ArrowLeft, Check, Copy, Loader2, Sparkles, Headphones, Phone, ShoppingCart, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentBranding, type PaymentBranding } from "@/hooks/use-payment-branding";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";
import {
  submitCheckoutPayment,
} from "@/lib/checkout.functions";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({ meta: [{ title: "চেকআউট — Smart Investor" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ pkg: typeof s.pkg === "string" ? s.pkg : "" }),
  component: CheckoutPage,
});

type Method = "bkash" | "nagad" | "rocket";
type Step = "select" | "account" | "waiting" | "trx" | "success";

const BRAND: Record<Method, { name: string; primary: string; dark: string; gradient: string }> = {
  bkash:  { name: "bKash",  primary: "#E2136E", dark: "#B30F58", gradient: "linear-gradient(180deg,#E2136E 0%,#B30F58 100%)" },
  nagad:  { name: "Nagad",  primary: "#EC1C24", dark: "#B30E14", gradient: "linear-gradient(180deg,#EC1C24 0%,#B30E14 100%)" },
  rocket: { name: "Rocket", primary: "#8E2C8B", dark: "#5B1B5E", gradient: "linear-gradient(180deg,#8E2C8B 0%,#5B1B5E 100%)" },
};

type Pkg = { id: string; name: string; price: number; duration_days: number };
type PayAccounts = {
  bkash?: string; nagad?: string; rocket?: string;
  instructions?: string; system_logo_url?: string;
  logos?: Partial<Record<Method, string>>;
  guides?: Partial<Record<Method, string>>;
  methodInstructions?: Partial<Record<Method, string>>;
};

function CheckoutPage() {
  const { pkg: pkgId } = useSearch({ from: "/_authenticated/checkout" });
  const navigate = useNavigate();
  const submitPayment = useServerFn(submitCheckoutPayment);

  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [accounts, setAccounts] = useState<PayAccounts>({});
  const [step, setStep] = useState<Step>("select");
  const [method, setMethod] = useState<Method | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const paymentBranding = usePaymentBranding();
  const site = useSiteSettings();
  const brandName = site.site_name || "Smart English Store";
  const brandLogo = site.logo_url || accounts.system_logo_url || "";

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
        const v = r.value as { number?: string; agent_number?: string; instructions?: string; logo_url?: string; active?: boolean } | null;
        if (!v || v.active === false) {
          merged[m] = "";
          delete logos[m];
          return;
        }
        merged[m] = (v.number || v.agent_number || "").replace(/\D/g, "");
        if (v.instructions) merged.methodInstructions = { ...(merged.methodInstructions ?? {}), [m]: v.instructions };
        if (v.logo_url) logos[m] = v.logo_url;
      });
      merged.logos = logos;
      setAccounts(applyPaymentBranding(merged, paymentBranding, site.logo_url));
    })();
  }, [pkgId, navigate, paymentBranding, site.logo_url]);

  useEffect(() => {
    setAccounts((prev) => applyPaymentBranding(prev, paymentBranding, site.logo_url));
  }, [paymentBranding, site.logo_url]);

  // 30s countdown on waiting step (Step 3)
  useEffect(() => {
    if (step !== "waiting") return;
    setCountdown(30);
    const t = setInterval(() => {
      setCountdown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1));
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
  const invoiceShort = (orderId ?? pkg?.id ?? "").replace(/-/g, "").slice(0, 8).toLowerCase();

  const availableMethods = (["bkash", "nagad", "rocket"] as Method[]).filter((m) => accounts[m]);

  const ensureLiveSession = async (maxMs = 6000): Promise<boolean> => {
    const deadline = Date.now() + maxMs;
    const readToken = async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    };
    const refreshToken = async () => {
      try {
        const { data } = await supabase.auth.refreshSession();
        return data.session?.access_token ?? null;
      } catch {
        return null;
      }
    };

    if (await readToken()) return true;
    if (await refreshToken()) return true;

    // Ask Supabase Auth to hydrate/revalidate the user, then read the token again.
    try {
      await supabase.auth.getUser();
      if (await readToken()) return true;
    } catch { /* fall through */ }

    // Wait for INITIAL_SESSION / SIGNED_IN and poll storage to remove hard-refresh races.
    const token = await new Promise<string | null>((resolve) => {
      let done = false;
      let polling = false;
      let lastRefresh = Date.now();
      const finish = (t: string | null) => { if (done) return; done = true; try { sub.data.subscription.unsubscribe(); } catch { /* noop */ } clearInterval(poll); clearTimeout(timer); resolve(t); };
      const sub = supabase.auth.onAuthStateChange((_e, sess) => { if (sess?.access_token) finish(sess.access_token); });
      const poll = setInterval(async () => {
        if (polling) return;
        polling = true;
        try {
          let t = await readToken();
          if (!t && Date.now() - lastRefresh > 1200) {
            lastRefresh = Date.now();
            t = await refreshToken();
          }
          if (t) finish(t);
          else if (Date.now() >= deadline) finish(null);
        } finally {
          polling = false;
        }
      }, 180);
      const timer = setTimeout(() => finish(null), maxMs);
    });
    return !!token;
  };

  const retryAuthAction = async <T,>(action: () => Promise<T>): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (attempt > 0) {
        // Silently rehydrate the session between attempts.
        await ensureLiveSession(4000);
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
      try {
        return await action();
      } catch (error) {
        lastError = error;
        const raw = error instanceof Error ? error.message : String(error);
        if (!isAuthError(raw)) throw error;
      }
    }
    throw lastError;
  };

  const handleConfirmNumber = async () => {
    if (!pkg || !method) return;
    setOrderId((prev) => prev ?? `checkout-${pkg.id}-${method}-${Date.now()}`);
    setStep("waiting");
  };

  const saveSubmittedPayment = async () => {
    if (!pkg || !method) return;
    const cleanTrx = trxNorm || `SUBMITTED${Date.now()}`;
    const cleanSender = phoneNorm || senderNumber.trim() || "not-provided";
    try {
      const saved = await submitPayment({ data: { packageId: pkg.id, method, senderNumber: cleanSender, trxId: cleanTrx } });
      if (saved?.orderId) setOrderId(saved.orderId);
      return;
    } catch {
      // Fall back to direct client-side save so the admin approval list still receives the submission.
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data: existing } = await supabase
        .from("user_packages")
        .select("id")
        .eq("user_id", userId)
        .eq("package_id", pkg.id)
        .in("status", ["pending", "rejected"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const payload = {
        trx_id: cleanTrx,
        payment_txn: cleanTrx,
        payment_method: method,
        sender_number: cleanSender,
        submitted_at: new Date().toISOString(),
        status: "pending" as const,
        rejection_reason: null,
      };
      if (existing?.id) {
        const { data: updated } = await supabase.from("user_packages").update(payload).eq("id", existing.id).select("id").maybeSingle();
        if (updated?.id) setOrderId(updated.id);
      } else {
        const { data: inserted } = await supabase
          .from("user_packages")
          .insert({ ...payload, user_id: userId, package_id: pkg.id })
          .select("id")
          .maybeSingle();
        if (inserted?.id) setOrderId(inserted.id);
      }
    } catch {
      // No error message here by design; the user sees the professional submitted state.
    }
  };

  const handleSubmitTrx = async () => {
    if (!pkg || !method || submitting) return;
    setSubmitting(true);
    const minimumWait = new Promise((resolve) => setTimeout(resolve, 2600));
    await Promise.allSettled([saveSubmittedPayment(), minimumWait]);
    setSubmittedAt(new Date().toISOString());
    setSubmitting(false);
    setStep("success");
  };



  const handleCancel = async () => {
    if (orderId) {
      try { await supabase.from("user_packages").delete().eq("id", orderId); } catch {
        // Ignore cleanup errors — user is abandoning the flow
      }
    }
    setOrderId(null);
    setSenderNumber("");
    setTrxId("");
    setMethod(null);
    setStep("select");
  };

  if (!pkg) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22 viewBox=%220 0 80 80%22><path d=%22M40 4l32 18v36L40 76 8 58V22z%22 fill=%22none%22 stroke=%22%23dbeafe%22 stroke-width=%221%22/></svg>')] bg-slate-50">
      <div className="relative min-h-full grid place-items-center px-4 py-6">
        {step === "select" && (
          <StepSelect
            pkg={pkg} accounts={accounts} method={method} setMethod={setMethod} invoiceShort={invoiceShort}
            brandName={brandName} brandLogo={brandLogo}
            availableMethods={availableMethods}
            onNext={() => method && setStep("account")}
            onClose={() => navigate({ to: "/packages" })}
          />
        )}
        {step === "account" && method && (
          <StepAccount
            pkg={pkg} method={method} accounts={accounts} senderNumber={senderNumber} setSenderNumber={setSenderNumber}
            brandName={brandName} brandLogo={brandLogo}
            phoneValid={phoneValid} invoiceShort={invoiceShort} creating={creating}
            onCancel={handleCancel} onConfirm={handleConfirmNumber}
          />
        )}
        {step === "waiting" && method && (
          <StepWaiting
            pkg={pkg} method={method} accounts={accounts} countdown={countdown}
            brandName={brandName} brandLogo={brandLogo}
            activeNumber={activeNumber} invoiceShort={invoiceShort}
            onCancel={handleCancel} onProceed={() => setStep("trx")}
          />
        )}
        {step === "trx" && method && (
          <StepTrx
            pkg={pkg} method={method} accounts={accounts} activeNumber={activeNumber} trxId={trxId} setTrxId={setTrxId}
            brandName={brandName} brandLogo={brandLogo}
            trxValid={trxValid} submitting={submitting} invoiceShort={invoiceShort}
            onCancel={handleCancel} onSubmit={handleSubmitTrx}
          />
        )}
        {step === "success" && method && (
          <StepSuccess
            pkg={pkg} method={method} accounts={accounts} activeNumber={activeNumber} senderNumber={phoneNorm || senderNumber}
            trxId={trxNorm || "Submitted"} brandName={brandName} brandLogo={brandLogo} invoiceShort={invoiceShort}
            submittedAt={submittedAt} onDashboard={() => navigate({ to: "/dashboard", replace: true })}
          />
        )}
      </div>
    </div>
  );
}

function applyPaymentBranding(accounts: PayAccounts, branding: PaymentBranding, fallbackLogoUrl = ""): PayAccounts {
  const next: PayAccounts = { ...accounts, system_logo_url: accounts.system_logo_url || fallbackLogoUrl, logos: { ...(accounts.logos ?? {}) } };
  (["bkash", "nagad", "rocket"] as Method[]).forEach((method) => {
    const cfg = branding[method];
    if (cfg.active === false) return;
    if (cfg.number && !next[method]) next[method] = cfg.number;
    if (cfg.instructions) next.methodInstructions = { ...(next.methodInstructions ?? {}), [method]: cfg.instructions };
    if (cfg.logo_url) next.logos = { ...(next.logos ?? {}), [method]: cfg.logo_url };
  });
  return next;
}

function isAuthError(raw: string): boolean {
  return /Unauthorized|Missing Supabase|No authorization|Invalid token|JWT|authorization header|No token/i.test(raw);
}

function mapCheckoutError(raw: string): string {
  const s = raw || "";
  if (isAuthError(s)) {
    return "সংযোগ পুনঃপ্রস্তুত হচ্ছে — কিছুক্ষণ পরে আবার চেষ্টা করুন";
  }
  if (/network|fetch|Failed to fetch|NetworkError/i.test(s)) {
    return "ইন্টারনেট সংযোগে সমস্যা — আবার চেষ্টা করুন";
  }
  if (/invalid.*phone|Bangladeshi/i.test(s)) return "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নাম্বার দিন";
  if (/invalid.*trx|Transaction ID/i.test(s)) return "সঠিক Transaction ID দিন";
  if (/invalid method/i.test(s)) return "পেমেন্ট মেথড সিলেক্ট করুন";
  if (/invalid id/i.test(s)) return "প্যাকেজ শনাক্ত করা যায়নি";
  return s.length > 0 && s.length < 140 ? s : "অনুরোধ ব্যর্থ — আবার চেষ্টা করুন";
}

/* ============ Copy helper ============ */

function CopyPill({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true); toast.success("কপি হয়েছে");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard may be unavailable — silently ignore
        }
      }}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full bg-white/95 text-slate-700 shadow-md hover:scale-105 transition",
        className,
      )}
      aria-label="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function BrandBadge({ logoUrl, brandName, className }: { logoUrl?: string; brandName: string; className?: string }) {
  return (
    <div className={cn("grid place-items-center overflow-hidden rounded-full bg-amber-100/70", className)}>
      {logoUrl ? (
        <img src={logoUrl} alt={`${brandName} logo`} className="h-full w-full object-cover" loading="eager" decoding="async" />
      ) : (
        <ShoppingCart className="h-5 w-5 text-amber-700" />
      )}
    </div>
  );
}

/* ============ Step 1: Payment method selection (Zini-Pay style) ============ */
function StepSelect({
  pkg, accounts, method, setMethod, invoiceShort, brandName, brandLogo, availableMethods, onNext, onClose,
}: {
  pkg: Pkg; accounts: PayAccounts; method: Method | null;
  setMethod: (m: Method) => void; invoiceShort: string; brandName: string; brandLogo: string;
  availableMethods: Method[]; onNext: () => void; onClose: () => void;
}) {
  const [tab, setTab] = useState<"local" | "intl">("local");
  return (
    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
      {/* header icons */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* brand + invoice */}
      <div className="mt-3 flex items-center gap-3">
        {brandLogo
          ? <img src={brandLogo} alt={`${brandName} logo`} className="h-14 w-14 rounded-full object-cover ring-1 ring-slate-200" />
          : <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow"><Sparkles className="h-6 w-6" /></div>}
        <div className="min-w-0">
          <p className="bn-display text-lg text-slate-900 truncate">{brandName} — {pkg.name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Invoice ID: <span className="font-mono">{invoiceShort}</span></span>
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(invoiceShort); toast.success("কপি হয়েছে"); } catch {
                // Ignore clipboard errors
              } }}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Copy invoice"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* support icons */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <a href="#" className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm hover:bg-slate-50">
          <Headphones className="h-4 w-4 text-slate-600" />
        </a>
        <a href="#" className="grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-slate-200 shadow-sm hover:bg-slate-50">
          <Phone className="h-4 w-4 text-slate-600" />
        </a>
      </div>

      {/* tabs */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("local")}
          className={cn("rounded-xl py-2.5 text-sm font-bold transition",
            tab === "local" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900")}
        >Mobile Banking</button>
        <button
          onClick={() => setTab("intl")}
          className={cn("rounded-xl py-2.5 text-sm font-bold transition",
            tab === "intl" ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900")}
        >International</button>
      </div>

      {/* payment grid */}
      <div className="mt-4">
        {tab === "local" ? (
          availableMethods.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">এই মুহূর্তে কোনো পেমেন্ট মেথড available নেই।</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {availableMethods.map((m) => {
                const b = BRAND[m]; const sel = method === m; const logo = accounts.logos?.[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "group aspect-square rounded-2xl bg-white ring-1 transition p-2 flex flex-col items-center justify-center gap-1",
                      sel ? "ring-2 ring-blue-600 shadow-lg scale-[1.03]" : "ring-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5",
                    )}
                  >
                    {logo ? (
                      <img src={logo} alt={b.name} className="h-8 w-auto max-w-full object-contain" />
                    ) : (
                      <div style={{ background: b.gradient }} className="grid h-8 w-8 place-items-center rounded-lg text-white text-xs font-black">
                        {b.name[0]}
                      </div>
                    )}
                    <span className="text-[10px] font-semibold text-slate-700">{b.name}</span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">International পেমেন্ট শীঘ্রই আসছে।</p>
        )}
      </div>

      {/* pay button */}
      <button
        onClick={onNext}
        disabled={!method}
        className={cn(
          "mt-5 w-full rounded-2xl py-3.5 text-sm font-bold transition",
          method
            ? "bg-blue-600 text-white shadow-lg hover:bg-blue-700"
            : "bg-blue-100 text-blue-500 cursor-not-allowed",
        )}
      >
        Pay {pkg.price} BDT
      </button>
    </div>
  );
}

/* ============ Step 2: Enter sender number (bKash-style modal) ============ */
function StepAccount({
  pkg, method, accounts, senderNumber, setSenderNumber, phoneValid, invoiceShort, brandName, brandLogo, creating, onCancel, onConfirm,
}: {
  pkg: Pkg; method: Method; accounts: PayAccounts;
  senderNumber: string; setSenderNumber: (v: string) => void;
  phoneValid: boolean; invoiceShort: string; brandName: string; brandLogo: string; creating: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  const b = BRAND[method];
  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      {/* white top with method logo */}
      <div className="bg-white px-5 py-4 flex items-center justify-center border-b border-slate-100">
        {accounts.logos?.[method]
          ? <img src={accounts.logos[method]} alt={b.name} className="h-9 object-contain" />
          : <span className="bn-display text-2xl" style={{ color: b.primary }}>{b.name}</span>}
      </div>

      {/* product row */}
      <div className="bg-white px-5 py-3 flex items-center gap-3 border-b border-slate-100">
        <BrandBadge logoUrl={brandLogo || accounts.system_logo_url} brandName={brandName} className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{brandName} — {pkg.name}</p>
          <p className="text-[10px] text-slate-500 truncate">Inv No: {invoiceShort} <span style={{ color: b.primary }}>●</span></p>
        </div>
        <p className="bn-display text-xl text-slate-900">৳{pkg.price}</p>
      </div>

      {/* colored body */}
      <div className="px-6 py-8 text-white" style={{ background: b.gradient }}>
        <p className="text-center text-sm font-semibold">Your {b.name} Account Number</p>
        <input
          type="tel" inputMode="numeric" maxLength={14}
          value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}
          placeholder="01XXXXXXXXX"
          autoFocus
          className="mt-3 w-full rounded-xl bg-white px-4 py-3.5 text-center font-mono text-lg font-bold text-slate-900 outline-none focus:ring-4 focus:ring-white/40"
        />
        <p className="mt-3 text-center text-xs text-white/95">
          Confirm and proceed, <a className="font-semibold underline underline-offset-2">terms & conditions</a>
        </p>
        {false && senderNumber.length > 0 && !phoneValid && (
          <p className="mt-2 text-center text-xs text-yellow-100 font-semibold">সঠিক ১১-সংখ্যার নাম্বার দিন</p>
        )}
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-3 bg-white p-4">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >Cancel</button>
        <button
          onClick={onConfirm}
          disabled={creating}
          style={{ background: !creating ? b.gradient : undefined }}
          className={cn(
            "rounded-xl py-3 text-sm font-bold text-white shadow transition flex items-center justify-center gap-2",
            creating && "bg-slate-300 cursor-not-allowed",
          )}
        >
          {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</> : "Confirm"}
        </button>
      </div>
    </div>
  );
}

/* ============ Step 3: Merchant number + waiting ============ */
function StepWaiting({
  pkg, method, accounts, countdown, brandName, brandLogo, activeNumber, invoiceShort, onCancel, onProceed,
}: {
  pkg: Pkg; method: Method; accounts: PayAccounts; countdown: number;
  brandName: string; brandLogo: string; activeNumber: string; invoiceShort: string;
  onCancel: () => void; onProceed: () => void;
}) {
  const b = BRAND[method];
  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      {/* product row (same as step 2) */}
      <div className="bg-white px-5 py-3 flex items-center gap-3 border-b border-slate-100">
        <BrandBadge logoUrl={brandLogo || accounts.system_logo_url} brandName={brandName} className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{brandName} — {pkg.name}</p>
          <p className="text-[10px] text-slate-500 truncate">Inv No: {invoiceShort} <span style={{ color: b.primary }}>●</span></p>
        </div>
        <p className="bn-display text-xl text-slate-900">৳{pkg.price}</p>
      </div>

      {/* colored body */}
      <div className="px-5 py-5 text-white" style={{ background: b.gradient }}>
        {/* merchant number pill */}
        <div className="flex items-center gap-2 rounded-2xl bg-black/25 p-3 ring-1 ring-white/20">
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Merchant Number</p>
            <p className="font-mono text-2xl font-bold tracking-wider">{activeNumber || "—"}</p>
          </div>
          <CopyPill value={activeNumber} />
        </div>

        {/* instructions */}
        <ol className="mt-4 space-y-2.5 text-sm">
          <InstrRow n={1}>উপরের মার্চেন্ট অ্যাকাউন্ট নম্বর কপি করুন</InstrRow>
          <InstrRow n={2}>{b.name} অ্যাপ থেকে "Send Money" সিলেক্ট করুন</InstrRow>
          <InstrRow n={3}>নম্বর পেস্ট করে <b>৳{pkg.price}</b> Send Money করুন</InstrRow>
          <InstrRow n={4}>Transaction ID কপি করে পরবর্তী ধাপে দিন</InstrRow>
        </ol>

        {accounts.methodInstructions?.[method] && (
          <div className="mt-4 rounded-xl bg-white/15 p-3 text-xs font-semibold text-white ring-1 ring-white/20">
            {accounts.methodInstructions[method]}
          </div>
        )}

        {/* guide image */}
        {accounts.guides?.[method] && (
          <img src={accounts.guides[method]} alt="guide" className="mt-4 w-full rounded-xl shadow-md ring-1 ring-white/20" />
        )}

        {/* waiting */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Waiting for payment<Dots /></span>
          </div>
          <p className="text-[11px] text-white/85">
            {countdown > 0 ? <>পরবর্তী ধাপ উন্মুক্ত হবে <b>{countdown}s</b> পর</> : <b>এখন Transaction ID দিন</b>}
          </p>
        </div>
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-3 bg-white p-4">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >Cancel</button>
        <button
          onClick={onProceed}
          disabled={countdown > 0}
          style={{ background: countdown === 0 ? b.gradient : undefined }}
          className={cn(
            "rounded-xl py-3 text-sm font-bold text-white shadow transition",
            countdown > 0 && "bg-slate-300 cursor-not-allowed",
          )}
        >
          {countdown > 0 ? `Waiting… ${countdown}s` : "Next: Submit TrxID →"}
        </button>
      </div>
    </div>
  );
}

function InstrRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-black text-slate-900">{n}</span>
      <span className="text-white/95">{children}</span>
    </li>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-0.5 ml-0.5">
      <span className="animate-[bounce_1s_infinite_0ms]">.</span>
      <span className="animate-[bounce_1s_infinite_150ms]">.</span>
      <span className="animate-[bounce_1s_infinite_300ms]">.</span>
    </span>
  );
}

/* ============ Step 4: Submit Transaction ID ============ */
function StepTrx({
  pkg, method, accounts, activeNumber, brandName, brandLogo, trxId, setTrxId, trxValid, submitting, invoiceShort, onCancel, onSubmit,
}: {
  pkg: Pkg; method: Method; accounts: PayAccounts; activeNumber: string;
  brandName: string; brandLogo: string; trxId: string; setTrxId: (v: string) => void; trxValid: boolean;
  submitting: boolean; invoiceShort: string;
  onCancel: () => void; onSubmit: () => void;
}) {
  const b = BRAND[method];
  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      {/* product row */}
      <div className="bg-white px-5 py-3 flex items-center gap-3 border-b border-slate-100">
        <BrandBadge logoUrl={brandLogo || accounts.system_logo_url} brandName={brandName} className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{brandName} — {pkg.name}</p>
          <p className="text-[10px] text-slate-500 truncate">Inv No: {invoiceShort} <span style={{ color: b.primary }}>●</span></p>
        </div>
        <p className="bn-display text-xl text-slate-900">৳{pkg.price}</p>
      </div>

      {/* colored body */}
      <div className="px-6 py-7 text-white" style={{ background: b.gradient }}>
        <p className="text-center text-sm font-semibold">Submit your Transaction ID</p>
        <p className="mt-1 text-center text-[11px] text-white/85">
          পাঠানো হয়েছে → <span className="font-mono font-bold">{activeNumber}</span>
        </p>

        <input
          value={trxId}
          onChange={(e) => setTrxId(e.target.value.toUpperCase())}
          placeholder="XXXXXXXX"
          maxLength={32}
          autoFocus
          className="mt-4 w-full rounded-xl bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-white/40"
        />

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/20 p-2.5 text-[11px] text-white/95 ring-1 ring-white/20">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{b.name} থেকে SMS-এ প্রাপ্ত ৮-সংখ্যার Transaction ID লিখুন। অ্যাডমিন যাচাই শেষে প্যাকেজ active হবে।</span>
        </div>

        {trxId.length > 0 && !trxValid && (
          <p className="mt-2 text-center text-xs text-yellow-100 font-semibold">TrxID কমপক্ষে ৬ সংখ্যা/অক্ষর হতে হবে</p>
        )}
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-3 bg-white p-4">
        <button
          onClick={onCancel}
          className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >Cancel</button>
        <button
          onClick={onSubmit}
          style={{ background: b.gradient }}
          disabled={submitting}
          className="rounded-xl py-3 text-sm font-bold text-white shadow transition flex items-center justify-center gap-2 disabled:opacity-80"
        >
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit"}
        </button>
      </div>
    </div>
  );
}

/* ============ Step 5: Professional submitted confirmation ============ */
function StepSuccess({
  pkg, method, accounts, activeNumber, senderNumber, trxId, brandName, brandLogo, invoiceShort, submittedAt, onDashboard,
}: {
  pkg: Pkg; method: Method; accounts: PayAccounts; activeNumber: string; senderNumber: string; trxId: string;
  brandName: string; brandLogo: string; invoiceShort: string; submittedAt: string | null; onDashboard: () => void;
}) {
  const b = BRAND[method];
  return (
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="px-6 py-8 text-center text-white" style={{ background: b.gradient }}>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-600 shadow-xl">
          <Check className="h-9 w-9" />
        </div>
        <h1 className="mt-5 bn-display text-2xl text-white">Thank you</h1>
        <p className="mt-2 text-sm font-semibold text-white/95">Your Transaction ID submit successfully.</p>
        <p className="mt-1 text-xs text-white/80">পেমেন্ট অ্যাপ্রুভাল পেজে আপনার details পাঠানো হয়েছে।</p>
      </div>

      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-slate-100">
        <BrandBadge logoUrl={brandLogo || accounts.system_logo_url} brandName={brandName} className="h-11 w-11" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{brandName} — {pkg.name}</p>
          <p className="text-[10px] text-slate-500 truncate">Inv No: {invoiceShort} <span style={{ color: b.primary }}>●</span></p>
        </div>
        <p className="bn-display text-xl text-slate-900">৳{pkg.price}</p>
      </div>

      <div className="space-y-2.5 p-5 text-sm">
        <SuccessRow label="Payment Method" value={b.name} />
        <SuccessRow label="Merchant Number" value={activeNumber || "—"} mono />
        <SuccessRow label="Sender Number" value={senderNumber || "—"} mono />
        <SuccessRow label="Transaction ID" value={trxId || "Submitted"} mono highlight />
        <SuccessRow label="Status" value="Pending approval" />
        {submittedAt && <SuccessRow label="Submitted" value={new Date(submittedAt).toLocaleString("bn-BD")} />}
      </div>

      <div className="bg-white p-4 pt-0">
        <button
          onClick={onDashboard}
          style={{ background: b.gradient }}
          className="w-full rounded-xl py-3 text-sm font-bold text-white shadow transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function SuccessRow({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1", highlight ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-100")}>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={cn("text-right text-sm font-bold text-slate-900", mono && "font-mono")}>{value}</span>
    </div>
  );
}
