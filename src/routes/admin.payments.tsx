import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, CreditCard, Save, Sparkles, X } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { saveSetting } from "@/lib/admin-client";
import { generatePaymentInstruction } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useServerFn } from "@tanstack/react-start";
import { reviewDistributorPackageOrder } from "@/lib/distributor-package.functions";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "পেমেন্ট গেটওয়ে — Admin" }] }),
  component: PaymentsPage,
});

type Method = "bkash" | "nagad" | "rocket";
type Cfg = { number: string; agent_number?: string; type: "personal" | "merchant" | "payment"; instructions: string; logo_url?: string; active: boolean };
const DEFAULT: Cfg = { number: "", type: "personal", instructions: "", active: true };
const GRAD: Record<Method, string> = { bkash: "from-pink-500 to-rose-600", nagad: "from-orange-500 to-amber-600", rocket: "from-purple-500 to-violet-600" };
const LABEL: Record<Method, string> = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট" };

function PaymentsPage() {
  const [state, setState] = useState<Record<Method, Cfg> | null>(null);
  const [busy, setBusy] = useState<Method | null>(null);
  const [aiBusy, setAiBusy] = useState<Method | null>(null);
  const authReady = useAuthReady();
  const reviewOrder = useServerFn(reviewDistributorPackageOrder);
  const [partnerOrders, setPartnerOrders] = useState<Array<{ id: string; distributor_id: string; snapshot_package_name: string; snapshot_price: number; snapshot_monthly_salary: number; payment_method: string; sender_number: string; trx_id: string; submitted_at: string }>>([]);

  useEffect(() => { if (!authReady) return; void (async () => {
    const { data } = await supabase.from("site_settings").select("key,value").in("key", ["payment_bkash","payment_nagad","payment_rocket"]);
    const s: Record<Method, Cfg> = { bkash: { ...DEFAULT }, nagad: { ...DEFAULT }, rocket: { ...DEFAULT } };
    (data ?? []).forEach((r) => {
      const m = r.key.replace("payment_", "") as Method;
      if (m in s && r.value) s[m] = { ...DEFAULT, ...(r.value as Cfg) };
    });
    setState(s);
    const { data: orders } = await supabase.from("distributor_package_orders").select("id,distributor_id,snapshot_package_name,snapshot_price,snapshot_monthly_salary,payment_method,sender_number,trx_id,submitted_at").eq("status", "pending").order("submitted_at", { ascending: false });
    setPartnerOrders((orders ?? []) as typeof partnerOrders);
  })(); }, [authReady]);

  const decidePartner = async (id: string, action: "approve" | "reject") => {
    const reason = action === "reject" ? window.prompt("বাতিলের কারণ লিখুন")?.trim() : "";
    if (action === "reject" && !reason) return;
    try {
      await reviewOrder({ data: { orderId: id, action, reason } });
      setPartnerOrders((rows) => rows.filter((row) => row.id !== id));
      toast.success(action === "approve" ? "Elite Partner প্যাকেজ সক্রিয় হয়েছে" : "আবেদন বাতিল হয়েছে");
    } catch (error) { toast.error(error instanceof Error ? error.message : "রিভিউ ব্যর্থ"); }
  };

  const upd = (m: Method, p: Partial<Cfg>) => setState((s) => s ? { ...s, [m]: { ...s[m], ...p } } : s);

  const handleSave = async (m: Method) => {
    if (!state) return;
    setBusy(m);
    try { await saveSetting(`payment_${m}`, state[m]); toast.success(`${LABEL[m]} সেভ হয়েছে`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  const uploadLogo = async (m: Method, file: File) => {
    const path = `${m}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("payment-logos").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("payment-logos").createSignedUrl(path, 60*60*24*365);
    upd(m, { logo_url: data?.signedUrl ?? path });
  };

  const handleAIGenerate = async (m: Method) => {
    if (!state) return;
    const c = state[m];
    if (!c.number?.trim()) { toast.error("প্রথমে নম্বর দিন"); return; }
    setAiBusy(m);
    try {
      const r = await generatePaymentInstruction({ data: { method: m, type: c.type, number: c.number, agent_number: c.agent_number } });
      upd(m, { instructions: r.instruction });
      toast.success(r.source === "local" ? "AI ব্যস্ত — ডিফল্ট নির্দেশনা বসানো হলো" : "AI নির্দেশনা তৈরি হয়েছে");
    } catch (e) { toast.error(e instanceof Error ? e.message : "AI ব্যর্থ"); }
    finally { setAiBusy(null); }
  };

  return (
    <>
      <AdminPageHeader accent="pink" Icon={CreditCard} title="পেমেন্ট গেটওয়ে"
        subtitle="বিকাশ / নগদ / রকেট মার্চেন্ট নম্বর ম্যানেজ করুন" />

      {!authReady || !state ? <Shimmer className="h-40" /> : (
        <div className="grid gap-3 lg:grid-cols-3">
          {(["bkash","nagad","rocket"] as Method[]).map((m) => {
            const c = state[m];
            return (
              <AdminCard key={m} accent="pink" className="p-4">
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-lg bg-gradient-to-br px-3 py-1 text-sm font-bold text-white shadow-md", GRAD[m])}>{LABEL[m]}</span>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={c.active} onChange={(e) => upd(m, { active: e.target.checked })} /> অ্যাক্টিভ
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  <F label="নম্বর" value={c.number} onChange={(v) => upd(m, { number: v })} mono />
                  <F label="এজেন্ট নম্বর (ঐচ্ছিক)" value={c.agent_number ?? ""} onChange={(v) => upd(m, { agent_number: v })} mono />
                  <label className="block">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">টাইপ</span>
                    <select value={c.type} onChange={(e) => upd(m, { type: e.target.value as Cfg["type"] })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="personal">পার্সোনাল (Send Money)</option>
                      <option value="merchant">মার্চেন্ট (Merchant)</option>
                      <option value="payment">পেমেন্ট (Payment)</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ইনস্ট্রাকশন</span>
                      <button type="button" onClick={() => handleAIGenerate(m)} disabled={aiBusy===m}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 px-2 py-1 text-[10px] font-bold text-white shadow disabled:opacity-60">
                        <Sparkles className="h-3 w-3" /> {aiBusy===m ? "তৈরি হচ্ছে…" : "AI দিয়ে লিখুন"}
                      </button>
                    </div>
                    <textarea value={c.instructions} onChange={(e) => upd(m, { instructions: e.target.value })} rows={5}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm" placeholder="AI দিয়ে লিখুন বা নিজে টাইপ করুন" />
                  </label>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">লোগো</span>
                    <label className={cn("inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br px-3 py-1.5 text-xs font-bold text-white shadow-md", GRAD[m])}>
                      আপলোড
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(m, e.target.files[0])} />
                    </label>
                    {c.logo_url && <img src={c.logo_url} alt="" className="mt-2 h-12 rounded-lg" />}
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                  <p className="font-bold text-slate-700">প্রিভিউ:</p>
                  <p>{LABEL[m]} {c.type === "merchant" ? "Merchant" : ""} — <span className="font-mono">{c.number || "—"}</span></p>
                </div>
                <GradientButton accent="pink" className="mt-3 w-full" busy={busy===m} onClick={() => handleSave(m)}><Save className="h-4 w-4" /> সেভ</GradientButton>
              </AdminCard>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <AdminPageHeader accent="amber" Icon={CreditCard} title="Elite Partner আবেদন" subtitle="ডিস্ট্রিবিউটর প্যাকেজের pending payment যাচাই করুন" />
        <div className="grid gap-3">
          {partnerOrders.length === 0 ? <AdminCard accent="amber" className="p-5 text-center text-sm text-slate-500">কোনো pending Elite Partner আবেদন নেই</AdminCard> : partnerOrders.map((order) => (
            <AdminCard key={order.id} accent="amber" className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1"><p className="bn-display text-base text-slate-900">{order.snapshot_package_name}</p><p className="text-xs text-slate-500">মূল্য ৳{Number(order.snapshot_price).toLocaleString("bn-BD")} • বেতন ৳{Number(order.snapshot_monthly_salary).toLocaleString("bn-BD")}</p><p className="mt-1 text-xs font-mono text-slate-700">{order.payment_method.toUpperCase()} • {order.sender_number} • {order.trx_id}</p></div>
                <GradientButton accent="emerald" onClick={() => decidePartner(order.id, "approve")}><Check className="h-4 w-4" /> অনুমোদন</GradientButton>
                <GradientButton accent="rose" onClick={() => decidePartner(order.id, "reject")}><X className="h-4 w-4" /> বাতিল</GradientButton>
              </div>
            </AdminCard>
          ))}
        </div>
      </div>
    </>
  );
}

function F({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className={cn("w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-400", mono && "font-mono")} />
    </label>
  );
}
