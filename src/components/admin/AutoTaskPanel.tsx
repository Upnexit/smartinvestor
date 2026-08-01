import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Loader2, RefreshCw, ServerCog, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AdminCard, GradientButton, SoftButton } from "@/components/admin/AdminUI";
import { adminRunAutoTasks, adminAutoTaskStatus, adminDeploymentCheck } from "@/lib/auto-tasks.functions";
import { cn } from "@/lib/utils";

type Status = Awaited<ReturnType<typeof adminAutoTaskStatus>>;
type Deploy = Awaited<ReturnType<typeof adminDeploymentCheck>>;

function timeBD(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("bn-BD", { timeZone: "Asia/Dhaka", dateStyle: "short", timeStyle: "short" });
}

export function AutoTaskPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  const [busy, setBusy] = useState(false);
  const [depBusy, setDepBusy] = useState(false);

  const statusFn = useServerFn(adminAutoTaskStatus);
  const runFn = useServerFn(adminRunAutoTasks);
  const deployFn = useServerFn(adminDeploymentCheck);

  const load = async () => {
    try { setStatus(await statusFn({})); } catch { /* ignore */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const runNow = async () => {
    setBusy(true);
    const t = toast.loading("অটো টাস্ক ট্রিগার হচ্ছে…");
    try {
      const res = await runFn({ data: {} });
      toast.success(`${res.total_created}টি টাস্ক তৈরি হয়েছে (${res.date})`, { id: t });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: t });
    } finally { setBusy(false); }
  };

  const checkDeploy = async () => {
    setDepBusy(true);
    const t = toast.loading("Deployment যাচাই হচ্ছে…");
    try {
      const res = await deployFn({});
      setDeploy(res);
      const bad = res.targets.filter((x) => !x.ok).length;
      if (bad === 0) toast.success("সব deployment ঠিকঠাক আছে ✅", { id: t });
      else toast.warning(`${bad}টি deployment-এ সমস্যা`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ", { id: t });
    } finally { setDepBusy(false); }
  };

  return (
    <AdminCard accent="emerald" className="p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Bot className="h-4 w-4 text-emerald-600" />
        <span className="bn-display text-sm text-slate-800">অটো টাস্ক ইঞ্জিন</span>
        <span className="text-[11px] text-slate-500">
          — প্রতিদিন রাত ২টা (BD) স্বয়ংক্রিয়ভাবে Facebook <b>Like</b> ও <b>Follow</b> টাস্ক active হয়
        </span>
        <div className="ml-auto flex gap-1.5">
          <SoftButton accent="slate" onClick={load}><RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ</SoftButton>
          <GradientButton accent="emerald" onClick={runNow} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} এখনই ট্রিগার
          </GradientButton>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
          <Clock className="h-3 w-3" /> শেষ রান: {timeBD(status?.last_run?.ran_at)}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1">তারিখ: {status?.today ?? "—"}</span>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
          সর্বশেষ তৈরি: {status?.last_run?.total_created ?? 0}টি
        </span>
      </div>

      {status && status.today_ready.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {status.today_ready.map((p) => {
            const ok = p.active_tasks >= p.quota;
            return (
              <div key={p.package_id}
                className={cn("flex items-center justify-between rounded-xl px-3 py-2 text-xs ring-1",
                  ok ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200")}>
                <span className="truncate font-semibold text-slate-800">{p.package_name}</span>
                <span className={cn("font-bold", ok ? "text-emerald-700" : "text-amber-700")}>
                  {p.active_tasks}/{p.quota}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Deployment check */}
      <div className="mt-3 border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <ServerCog className="h-4 w-4 text-indigo-600" />
          <span className="bn-display text-sm text-slate-800">ডিপ্লয়মেন্ট চেক</span>
          <span className="text-[11px] text-slate-500">— Vercel / Lovable-এ ঠিকভাবে deploy হয়েছে কিনা</span>
          <SoftButton accent="indigo" className="ml-auto" onClick={checkDeploy} disabled={depBusy}>
            {depBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} যাচাই করুন
          </SoftButton>
        </div>
        {deploy && (
          <div className="mt-2 grid gap-1.5">
            {deploy.targets.map((t) => (
              <div key={t.url} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] ring-1",
                t.ok ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200")}>
                {t.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                <span className="font-semibold text-slate-800">{t.label}</span>
                <span className="truncate text-slate-500">{t.url}</span>
                <span className="ml-auto whitespace-nowrap text-slate-600">
                  {t.ok ? `${t.status} · ${t.ms}ms` : (t.error ?? `HTTP ${t.status}`)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminCard>
  );
}
