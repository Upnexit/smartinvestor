import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  X, ArrowLeft, Check, Copy, Loader2, ShoppingBag, ShieldCheck, Truck,
  MapPin, Minus, Plus, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentBranding } from "@/hooks/use-payment-branding";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { BD_DISTRICTS } from "@/lib/bd-districts";
import { BD_THANAS } from "@/lib/bd-thanas";
import { cn } from "@/lib/utils";

export type OrderProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

export type OrderLine = { product: OrderProduct; qty: number };

type MobileMethod = "bkash" | "nagad" | "rocket";
type Method = "cod" | MobileMethod;
type Step = "details" | "method" | "account" | "waiting" | "trx" | "success";

const BRAND: Record<MobileMethod, { name: string; bn: string; primary: string; gradient: string }> = {
  bkash: { name: "bKash", bn: "বিকাশ", primary: "#E2136E", gradient: "linear-gradient(180deg,#E2136E 0%,#B30F58 100%)" },
  nagad: { name: "Nagad", bn: "নগদ", primary: "#EC1C24", gradient: "linear-gradient(180deg,#EC1C24 0%,#B30E14 100%)" },
  rocket: { name: "Rocket", bn: "রকেট", primary: "#8E2C8B", gradient: "linear-gradient(180deg,#8E2C8B 0%,#5B1B5E 100%)" },
};

const MOBILE: MobileMethod[] = ["bkash", "nagad", "rocket"];
const bn = (n: number) => Number(n || 0).toLocaleString("en-BD");
const ip = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400";

function normPhone(v: string) {
  let n = v.replace(/\D/g, "");
  if (n.length === 13 && n.startsWith("880")) n = "0" + n.slice(3);
  return n;
}

export function OrderDrawer({
  lines: initialLines, onClose, onDone,
}: {
  lines: OrderLine[];
  onClose: () => void;
  onDone: () => void;
}) {
  const branding = usePaymentBranding();
  const site = useSiteSettings();
  const brandName = site.site_name || "Smart Click BD";

  const [lines, setLines] = useState<OrderLine[]>(initialLines);
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<Method | null>(null);
  const [sender, setSender] = useState("");
  const [trx, setTrx] = useState("");
  const [countdown, setCountdown] = useState(20);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Partial<Record<MobileMethod, string>>>({});
  const [logos, setLogos] = useState<Partial<Record<MobileMethod, string>>>({});
  const [instructions, setInstructions] = useState<Partial<Record<MobileMethod, string>>>({});
  const [invoice] = useState(() => Math.random().toString(16).slice(2, 10));

  // prefill profile + payment accounts
  useEffect(() => {
    (async () => {
      const { data: me } = await supabase.auth.getUser();
      if (me.user) {
        const { data: p } = await supabase.from("profiles")
          .select("full_name, phone").eq("id", me.user.id).maybeSingle();
        if (p) {
          setName((p.full_name as string) ?? "");
          setPhone((p.phone as string) ?? "");
        }
      }
      const [{ data: base }, { data: perMethod }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "payment_accounts").maybeSingle(),
        supabase.from("site_settings").select("key,value").in("key", ["payment_bkash", "payment_nagad", "payment_rocket"]),
      ]);
      const acc: Partial<Record<MobileMethod, string>> = {};
      const lg: Partial<Record<MobileMethod, string>> = {};
      const ins: Partial<Record<MobileMethod, string>> = {};
      const b = (base?.value ?? {}) as Record<string, string> & { logos?: Record<string, string> };
      MOBILE.forEach((m) => { if (b[m]) acc[m] = String(b[m]); });
      Object.entries(b.logos ?? {}).forEach(([k, v]) => { lg[k as MobileMethod] = String(v); });
      (perMethod ?? []).forEach((r) => {
        const m = String(r.key).replace("payment_", "") as MobileMethod;
        const v = r.value as { number?: string; agent_number?: string; active?: boolean; logo_url?: string; instructions?: string } | null;
        if (!v || v.active === false) { delete acc[m]; delete lg[m]; return; }
        const num = (v.number || v.agent_number || "").replace(/\D/g, "");
        if (num) acc[m] = num;
        if (v.logo_url) lg[m] = v.logo_url;
        if (v.instructions) ins[m] = v.instructions;
      });
      setAccounts(acc); setLogos(lg); setInstructions(ins);
    })();
  }, []);

  // merge live branding (logo/number updates)
  useEffect(() => {
    setAccounts((prev) => {
      const next = { ...prev };
      MOBILE.forEach((m) => {
        const c = branding[m];
        if (!c) return;
        if (c.active === false) { delete next[m]; return; }
        const num = (c.number || c.agent_number || "").replace(/\D/g, "");
        if (num) next[m] = num;
      });
      return next;
    });
    setLogos((prev) => {
      const next = { ...prev };
      MOBILE.forEach((m) => { if (branding[m]?.logo_url) next[m] = branding[m].logo_url as string; });
      return next;
    });
  }, [branding]);

  useEffect(() => {
    if (step !== "waiting") return;
    setCountdown(20);
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const total = lines.reduce((s, l) => s + l.qty * Number(l.product.price), 0);
  const phoneNorm = normPhone(phone);
  const phoneValid = /^01[3-9]\d{8}$/.test(phoneNorm);
  const senderNorm = normPhone(sender);
  const senderValid = /^01[3-9]\d{8}$/.test(senderNorm);
  const trxNorm = trx.trim().toUpperCase();
  const trxValid = /^[A-Z0-9]{6,32}$/.test(trxNorm);
  const detailsOk = name.trim().length >= 2 && phoneValid && !!district && !!thana && address.trim().length >= 5 && lines.length > 0;
  const activeNumber = method && method !== "cod" ? (accounts[method] ?? "") : "";
  const availableMobile = MOBILE.filter((m) => accounts[m]);
  const thanaList = useMemo(() => BD_THANAS[district] ?? [], [district]);

  function setQty(id: string, qty: number) {
    setLines((c) => qty <= 0 ? c.filter((l) => l.product.id !== id) : c.map((l) => l.product.id === id ? { ...l, qty } : l));
  }

  async function placeOrder() {
    if (busy) return;
    setBusy(true);
    try {
      const { data: me } = await supabase.auth.getUser();
      const fullAddress = `${address.trim()}, ${thana}, ${district}`;
      const rows = lines.map((l) => ({
        user_id: me.user?.id ?? null,
        product_id: l.product.id,
        product_name: l.product.name,
        customer_name: name.trim(),
        phone: phoneNorm,
        address: fullAddress,
        quantity: l.qty,
        unit_price: Number(l.product.price),
        total_amount: Number(l.product.price) * l.qty,
        status: "new",
        payment_status: "unpaid",
        payment_method: method ?? "cod",
        sender_number: method === "cod" || !method ? null : senderNorm,
        trx_id: method === "cod" || !method ? null : trxNorm,
        note: note.trim() || null,
      }));
      const { error } = await supabase.from("shop_orders").insert(rows);
      if (error) throw error;
      setStep("success");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "অর্ডার জমা দেওয়া যায়নি");
    } finally {
      setBusy(false);
    }
  }

  const b = method && method !== "cod" ? BRAND[method] : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:max-h-none sm:rounded-l-3xl sm:rounded-tr-none sm:animate-slide-in-right">
        {/* header */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          {step !== "details" && step !== "success" && (
            <button
              onClick={() => setStep(step === "method" ? "details" : step === "account" ? "method" : step === "waiting" ? "account" : "waiting")}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            ><ArrowLeft className="h-5 w-5" /></button>
          )}
          <div className="min-w-0 flex-1">
            <p className="bn-display text-lg text-slate-900">
              {step === "details" ? "অর্ডার তথ্য" : step === "method" ? "পেমেন্ট মাধ্যম" : step === "success" ? "অর্ডার সম্পন্ন" : "পেমেন্ট করুন"}
            </p>
            <p className="text-[11px] text-slate-500">Invoice: <span className="font-mono">{invoice}</span> • ৳{bn(total)}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {/* steps indicator */}
        {step !== "success" && (
          <div className="flex items-center gap-1.5 px-4 pt-3">
            {["তথ্য", "মাধ্যম", "পেমেন্ট"].map((s, i) => {
              const idx = step === "details" ? 0 : step === "method" ? 1 : 2;
              return (
                <div key={s} className="flex flex-1 items-center gap-1.5">
                  <span className={cn("h-1.5 flex-1 rounded-full", i <= idx ? "bg-fuchsia-600" : "bg-slate-200")} />
                  <span className={cn("text-[10px] font-bold", i <= idx ? "text-fuchsia-600" : "text-slate-400")}>{s}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {step === "details" && (
            <div className="space-y-3">
              {/* items */}
              <div className="space-y-2">
                {lines.map((l) => (
                  <div key={l.product.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2.5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {l.product.image_url
                        ? <img src={l.product.image_url} alt={l.product.name} className="h-full w-full object-cover" />
                        : <div className="grid h-full w-full place-items-center text-slate-300"><ShoppingBag className="h-5 w-5" /></div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900">{l.product.name}</p>
                      <p className="text-xs text-rose-600">৳{bn(l.product.price)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button onClick={() => setQty(l.product.id, l.qty - 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-6 text-center text-sm font-bold">{bn(l.qty)}</span>
                        <button onClick={() => setQty(l.product.id, l.qty + 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 hover:bg-slate-200"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <p className="bn-display shrink-0 text-sm text-slate-900">৳{bn(l.qty * Number(l.product.price))}</p>
                  </div>
                ))}
              </div>

              <Field label="আপনার নাম *">
                <input className={ip} value={name} onChange={(e) => setName(e.target.value)} placeholder="পূর্ণ নাম" maxLength={120} />
              </Field>
              <Field label="মোবাইল নম্বর *">
                <input className={ip} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="numeric" maxLength={14} />
                {phone && !phoneValid && <p className="mt-1 text-[11px] text-rose-600">সঠিক ১১ ডিজিটের নম্বর দিন</p>}
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="জেলা *">
                  <select className={ip} value={district} onChange={(e) => { setDistrict(e.target.value); setThana(""); }}>
                    <option value="">নির্বাচন করুন</option>
                    {BD_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="থানা / উপজেলা *">
                  <select className={ip} value={thana} disabled={!district} onChange={(e) => setThana(e.target.value)}>
                    <option value="">{district ? "নির্বাচন করুন" : "আগে জেলা দিন"}</option>
                    {thanaList.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="বিস্তারিত ঠিকানা *">
                <textarea rows={2} className={ip} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="গ্রাম/বাসা, রোড, ল্যান্ডমার্ক" maxLength={500} />
              </Field>
              <Field label="নোট (ঐচ্ছিক)">
                <input className={ip} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ডেলিভারি সংক্রান্ত নির্দেশনা" maxLength={300} />
              </Field>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600">
                <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> ডেলিভারি: {district || "—"}{thana ? `, ${thana}` : ""}</span>
              </div>
            </div>
          )}

          {step === "method" && (
            <div className="space-y-3">
              <button
                onClick={() => setMethod("cod")}
                className={cn("flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                  method === "cod" ? "border-transparent ring-2 ring-emerald-500" : "border-slate-200 hover:border-slate-300")}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white"><Truck className="h-5 w-5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900">ক্যাশ অন ডেলিভারি</span>
                  <span className="block text-[11px] text-slate-500">পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</span>
                </span>
              </button>

              <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">মোবাইল ব্যাংকিং</p>
              {availableMobile.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">এই মুহূর্তে মোবাইল ব্যাংকিং available নেই।</p>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {availableMobile.map((m) => {
                    const br = BRAND[m]; const sel = method === m;
                    return (
                      <button key={m} onClick={() => setMethod(m)}
                        className={cn("flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl bg-white p-2 ring-1 transition",
                          sel ? "scale-[1.03] shadow-lg ring-2 ring-blue-600" : "shadow-sm ring-slate-200 hover:-translate-y-0.5 hover:shadow-md")}>
                        {logos[m]
                          ? <img src={logos[m]} alt={br.name} className="h-8 w-auto max-w-full object-contain" />
                          : <span style={{ background: br.gradient }} className="grid h-8 w-8 place-items-center rounded-lg text-xs font-black text-white">{br.name[0]}</span>}
                        <span className="text-[10px] font-semibold text-slate-700">{br.bn}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">পণ্য</span><span className="font-semibold">{bn(lines.length)} টি</span></div>
                <div className="mt-1 flex items-center justify-between"><span className="text-slate-500">সর্বমোট</span><span className="bn-display text-xl text-rose-600">৳{bn(total)}</span></div>
              </div>
            </div>
          )}

          {step === "account" && b && (
            <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-center border-b border-slate-100 bg-white px-5 py-4">
                {logos[method as MobileMethod]
                  ? <img src={logos[method as MobileMethod]} alt={b.name} className="h-9 object-contain" />
                  : <span className="bn-display text-2xl" style={{ color: b.primary }}>{b.name}</span>}
              </div>
              <div className="px-6 py-8 text-white" style={{ background: b.gradient }}>
                <p className="text-center text-sm font-semibold">Your {b.name} Account Number</p>
                <input
                  type="tel" inputMode="numeric" maxLength={14} value={sender} autoFocus
                  onChange={(e) => setSender(e.target.value)} placeholder="01XXXXXXXXX"
                  className="mt-3 w-full rounded-xl bg-white px-4 py-3.5 text-center font-mono text-lg font-bold text-slate-900 outline-none focus:ring-4 focus:ring-white/40"
                />
                <div className="mt-3 rounded-xl bg-white/15 px-3 py-2 ring-1 ring-white/25">
                  <p className="text-center text-[12px] font-semibold leading-snug">
                    📱 আপনি যে {b.bn} নাম্বার থেকে টাকা পাঠাবেন সেই নাম্বারটি দিন
                  </p>
                </div>
                {sender.length > 0 && !senderValid && (
                  <p className="mt-2 text-center text-xs font-semibold text-yellow-100">সঠিক ১১-সংখ্যার নাম্বার দিন</p>
                )}
              </div>
            </div>
          )}

          {step === "waiting" && b && (
            <div className="overflow-hidden rounded-2xl px-5 py-5 text-white shadow-sm" style={{ background: b.gradient }}>
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-black uppercase tracking-wide text-slate-900 shadow-md">
                  {b.bn} — পেমেন্ট করুন
                </span>
              </div>
              <p className="mt-4 text-center text-[12px] font-bold text-white/95">নিচের নাম্বারে পেমেন্ট সম্পূর্ণ করুন</p>
              <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/25 p-3 ring-1 ring-white/20">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{b.name} Number</p>
                  <p className="font-mono text-2xl font-bold tracking-wider">{activeNumber || "—"}</p>
                </div>
                <CopyPill value={activeNumber} />
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-yellow-300 px-2.5 py-1.5 shadow ring-1 ring-yellow-400/60">
                <div className="leading-tight">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Amount</p>
                  <p className="bn-display text-base font-black leading-none text-slate-900">৳{bn(total)}</p>
                </div>
                <CopyPill value={String(total)} className="!h-7 !w-7 !bg-white !text-slate-900" />
              </div>

              <ol className="mt-4 space-y-2.5 text-sm">
                {parseInstructions(instructions[method as MobileMethod], total, b.bn).map((line, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-black text-slate-900">{i + 1}</span>
                    <span className="text-white/95">{line}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-col items-center gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…</span>
                <p className="text-[11px] text-white/85">
                  {countdown > 0 ? <>পরবর্তী ধাপ উন্মুক্ত হবে <b>{countdown}s</b> পর</> : <b>এখন Transaction ID দিন</b>}
                </p>
              </div>
            </div>
          )}

          {step === "trx" && b && (
            <div className="overflow-hidden rounded-2xl px-6 py-7 text-white shadow-sm" style={{ background: b.gradient }}>
              <p className="text-center text-sm font-semibold">Submit your Transaction ID</p>
              <p className="mt-1 text-center text-[11px] text-white/85">পাঠানো হয়েছে → <span className="font-mono font-bold">{activeNumber}</span></p>
              <input
                value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={32} autoFocus
                className="mt-4 w-full rounded-xl bg-white px-4 py-4 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-white/40"
              />
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-black/20 p-2.5 text-[11px] ring-1 ring-white/20">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{b.bn} থেকে SMS-এ প্রাপ্ত Transaction ID লিখুন। অ্যাডমিন যাচাই শেষে অর্ডার কনফার্ম হবে।</span>
              </div>
              {trx.length > 0 && !trxValid && (
                <p className="mt-2 text-center text-xs font-semibold text-yellow-100">TrxID কমপক্ষে ৬ সংখ্যা/অক্ষর হতে হবে</p>
              )}
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-9 w-9" />
              </div>
              <div>
                <h3 className="bn-display text-xl text-slate-900">অর্ডার সফল হয়েছে!</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {method === "cod"
                    ? "আমাদের টিম ফোনে যোগাযোগ করে ডেলিভারি নিশ্চিত করবে।"
                    : "পেমেন্ট যাচাইয়ের পর অর্ডারটি কনফার্ম করা হবে।"}
                </p>
              </div>
              <div className="space-y-2 text-left text-sm">
                <Row label="Invoice" value={invoice} mono />
                <Row label="পেমেন্ট" value={method === "cod" ? "ক্যাশ অন ডেলিভারি" : BRAND[method as MobileMethod].bn} />
                {method !== "cod" && <Row label="Sender" value={senderNorm} mono />}
                {method !== "cod" && <Row label="Transaction ID" value={trxNorm} mono highlight />}
                <Row label="ঠিকানা" value={`${thana}, ${district}`} />
                <Row label="মোট" value={`৳${bn(total)}`} highlight />
              </div>
            </div>
          )}
        </div>

        {/* footer actions */}
        <div className="border-t border-slate-100 p-4">
          {step === "details" && (
            <button
              disabled={!detailsOk}
              onClick={() => setStep("method")}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              পরবর্তী — Pay Now (৳{bn(total)})
            </button>
          )}
          {step === "method" && (
            <button
              disabled={!method || busy}
              onClick={() => { if (method === "cod") void placeOrder(); else setStep("account"); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-200"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {method === "cod" ? "অর্ডার কনফার্ম করুন" : `Pay ${total} BDT`}
            </button>
          )}
          {step === "account" && b && (
            <button
              disabled={!senderValid}
              onClick={() => setStep("waiting")}
              style={{ background: senderValid ? b.gradient : undefined }}
              className={cn("w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow transition", !senderValid && "cursor-not-allowed bg-slate-300")}
            >Confirm</button>
          )}
          {step === "waiting" && b && (
            <button
              disabled={countdown > 0}
              onClick={() => setStep("trx")}
              style={{ background: countdown === 0 ? b.gradient : undefined }}
              className={cn("w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow transition", countdown > 0 && "cursor-not-allowed bg-slate-300")}
            >{countdown > 0 ? `Waiting… ${countdown}s` : "Next: Submit TrxID →"}</button>
          )}
          {step === "trx" && b && (
            <button
              disabled={!trxValid || busy}
              onClick={placeOrder}
              style={{ background: trxValid && !busy ? b.gradient : undefined }}
              className={cn("flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow transition", (!trxValid || busy) && "cursor-not-allowed bg-slate-300")}
            >
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit"}
            </button>
          )}
          {step === "success" && (
            <button onClick={onDone} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-md">
              ঠিক আছে
            </button>
          )}
          {step !== "success" && (
            <p className="mt-2 text-center text-[10px] text-slate-400">{brandName} • নিরাপদ চেকআউট</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ring-1", highlight ? "bg-amber-50 ring-amber-200" : "bg-slate-50 ring-slate-100")}>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={cn("text-right text-sm font-bold text-slate-900", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function CopyPill({ value, className }: { value: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(value); toast.success("কপি হয়েছে"); } catch { /* noop */ } }}
      className={cn("grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-white ring-1 ring-white/30 transition hover:bg-white/30", className)}
      aria-label="copy"
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

function parseInstructions(raw: string | undefined, amount: number, methodBn: string): string[] {
  const text = (raw ?? "").trim();
  if (text) {
    const lines = text.split(/\r?\n+/).map((l) => l.replace(/^\s*(?:[0-9]+[.)]|[-•*])\s*/, "").trim()).filter(Boolean);
    if (lines.length > 0) return lines;
  }
  return [
    "উপরের নম্বরটি কপি করুন",
    `${methodBn} অ্যাপ থেকে "Send Money" সিলেক্ট করুন`,
    `নম্বর পেস্ট করে ৳${bn(amount)} Send Money করুন`,
    "Transaction ID কপি করে পরবর্তী ধাপে দিন",
  ];
}
