import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Award, Banknote, CalendarClock, CheckCircle2, Crown, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AdminCard, AdminPageHeader, GradientButton } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { submitDistributorPackageOrder } from "@/lib/distributor-package.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/distributor/package")({
  head: () => ({ meta: [
    { title: "Elite Partner Package — Distributor" },
    { name: "description", content: "ডিস্ট্রিবিউটর Elite Partner package ও payment আবেদন।" },
    { property: "og:title", content: "Elite Partner Package" },
    { property: "og:description", content: "ডিস্ট্রিবিউটরদের Elite Partner package।" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DistributorPackagePage,
});

type Method = "bkash" | "nagad" | "rocket";
type PackageRow = { id: string; name: string; price: number; monthly_salary: number; duration_label: string; description: string | null };
type OrderRow = { id: string; package_id: string; status: string; rejection_reason: string | null; created_at: string };
type PaymentConfig = { number?: string; agent_number?: string; active?: boolean; instructions?: string };

function DistributorPackagePage() {
  const submitOrder = useServerFn(submitDistributorPackageOrder);
  const [pkg, setPkg] = useState<PackageRow | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [accounts, setAccounts] = useState<Partial<Record<Method, PaymentConfig>>>({});
  const [method, setMethod] = useState<Method>("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: packages }, { data: orders }, { data: settings }] = await Promise.all([
      supabase.from("distributor_packages").select("id,name,price,monthly_salary,duration_label,description").eq("active", true).order("sort_order").limit(1),
      supabase.from("distributor_package_orders").select("id,package_id,status,rejection_reason,created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("site_settings").select("key,value").in("key", ["payment_bkash", "payment_nagad", "payment_rocket"]),
    ]);
    setPkg((packages?.[0] as PackageRow | undefined) ?? null);
    setOrder((orders?.[0] as OrderRow | undefined) ?? null);
    const next: Partial<Record<Method, PaymentConfig>> = {};
    (settings ?? []).forEach((row) => { next[row.key.replace("payment_", "") as Method] = row.value as PaymentConfig; });
    setAccounts(next);
    const first = (["bkash", "nagad", "rocket"] as Method[]).find((key) => next[key]?.active !== false && (next[key]?.number || next[key]?.agent_number));
    if (first) setMethod(first);
  };

  useEffect(() => { void load(); }, []);
  const available = useMemo(() => (["bkash", "nagad", "rocket"] as Method[]).filter((key) => accounts[key]?.active !== false && (accounts[key]?.number || accounts[key]?.agent_number)), [accounts]);
  const paymentNumber = accounts[method]?.number || accounts[method]?.agent_number || "";

  const submit = async () => {
    if (!pkg) return;
    setBusy(true);
    try {
      await submitOrder({ data: { packageId: pkg.id, method, senderNumber, trxId } });
      toast.success("পেমেন্ট আবেদন সফলভাবে জমা হয়েছে");
      setTrxId("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "আবেদন জমা হয়নি");
    } finally { setBusy(false); }
  };

  if (!pkg) return <div className="grid min-h-60 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>;
  const locked = order?.package_id === pkg.id && ["pending", "active"].includes(order.status);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="ডিস্ট্রিবিউটর প্যাকেজ" subtitle="Elite Partner হিসেবে আপনার ব্যবসায়িক সুবিধা সক্রিয় করুন" Icon={Crown} accent="purple" />
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-900 to-fuchsia-800 p-5 text-white shadow-xl sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-300">ELITE DISTRIBUTOR</p><h1 className="bn-display mt-1 text-3xl">{pkg.name}</h1><p className="mt-2 max-w-xl text-sm text-white/80">{pkg.description}</p></div>
          <span className="rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-900">PREMIUM</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric Icon={Banknote} label="প্যাকেজ মূল্য" value={`৳ ${Number(pkg.price).toLocaleString("bn-BD")}`} />
          <Metric Icon={Award} label="মাসিক বেতন" value={`৳ ${Number(pkg.monthly_salary).toLocaleString("bn-BD")}`} />
          <Metric Icon={CalendarClock} label="মেয়াদ" value={pkg.duration_label} />
        </div>
      </div>

      {locked ? (
        <AdminCard accent={order?.status === "active" ? "emerald" : "amber"} className="p-5 text-center">
          <CheckCircle2 className={cn("mx-auto h-10 w-10", order?.status === "active" ? "text-emerald-600" : "text-amber-500")} />
          <h2 className="bn-display mt-2 text-xl text-slate-900">{order?.status === "active" ? "Elite Partner সক্রিয়" : "আবেদন যাচাই চলছে"}</h2>
          <p className="mt-1 text-sm text-slate-600">{order?.status === "active" ? "আপনার প্যাকেজ অনুমোদিত ও সক্রিয় রয়েছে।" : "অ্যাডমিন পেমেন্ট যাচাই করে প্যাকেজটি সক্রিয় করবেন।"}</p>
        </AdminCard>
      ) : (
        <AdminCard accent="purple" className="p-5">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-600" /><h2 className="bn-display text-lg text-slate-900">Buy Package</h2></div>
          {order?.status === "rejected" && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">আগের আবেদন বাতিল: {order.rejection_reason || "পেমেন্ট তথ্য সঠিক ছিল না"}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {available.map((key) => <GradientButton key={key} accent={method === key ? "purple" : "slate"} onClick={() => setMethod(key)}>{key.toUpperCase()}</GradientButton>)}
          </div>
          <div className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">Send Money করুন: <b className="font-mono">{paymentNumber || "পেমেন্ট নম্বর সেট করা নেই"}</b><p className="mt-1 text-xs text-violet-700">পরিমাণ: ৳{Number(pkg.price).toLocaleString("bn-BD")}</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">যে নম্বর থেকে পাঠিয়েছেন<input value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} inputMode="numeric" placeholder="01XXXXXXXXX" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400" /></label>
            <label className="text-xs font-bold text-slate-600">Transaction ID<input value={trxId} onChange={(e) => setTrxId(e.target.value)} placeholder="TrxID" className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-violet-400" /></label>
          </div>
          <GradientButton accent="purple" className="mt-4 w-full" busy={busy} disabled={!paymentNumber || busy} onClick={submit}><Crown className="h-4 w-4" /> ৳{Number(pkg.price).toLocaleString("bn-BD")} দিয়ে কিনুন</GradientButton>
        </AdminCard>
      )}
    </div>
  );
}

function Metric({ Icon, label, value }: { Icon: typeof Banknote; label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur"><Icon className="h-5 w-5 text-amber-300" /><p className="mt-2 text-[11px] text-white/65">{label}</p><p className="bn-display mt-0.5 text-lg">{value}</p></div>;
}