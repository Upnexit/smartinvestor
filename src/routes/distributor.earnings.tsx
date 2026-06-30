import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Award } from "lucide-react";
import { AdminPageHeader, StatTile, AdminCard } from "@/components/admin/AdminUI";
import { getMyDistributorBundle } from "@/lib/admin-client";

export const Route = createFileRoute("/distributor/earnings")({
  component: EarningsPage,
});

function EarningsPage() {
  const [data, setData] = useState<{ profile: { commission_rate?: number; payment_method?: string; payment_number?: string } | null; stats: { balance?: number; total_earned?: number; total_deposit?: number } | null } | null>(null);

  useEffect(() => { (async () => { try { setData(await getMyDistributorBundle() as never); } catch { setData({ profile: null, stats: null }); } })(); }, []);

  const s = data?.stats;
  const p = data?.profile;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="কমিশন ও আয়" subtitle="আপনার মোট আয় এবং পেমেন্ট বিস্তারিত" Icon={Wallet} accent="emerald" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatTile label="বর্তমান ব্যালেন্স" value={`৳${Number(s?.balance ?? 0).toLocaleString("bn-BD")}`} Icon={Wallet} accent="emerald" />
        <StatTile label="মোট আয়" value={`৳${Number(s?.total_earned ?? 0).toLocaleString("bn-BD")}`} Icon={Award} accent="fuchsia" />
        <StatTile label="মোট ডিপোজিট" value={`৳${Number(s?.total_deposit ?? 0).toLocaleString("bn-BD")}`} Icon={TrendingUp} accent="amber" />
      </div>

      <AdminCard accent="emerald" className="p-5">
        <h3 className="bn-display text-lg text-slate-900">পেমেন্ট তথ্য</h3>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
          <Info label="পেমেন্ট মেথড" value={p?.payment_method ?? "—"} />
          <Info label="পেমেন্ট নম্বর" value={p?.payment_number ?? "—"} />
          <Info label="কমিশন রেট" value={`${p?.commission_rate ?? 5}%`} />
        </div>
        <p className="mt-4 text-xs text-slate-500">উইথড্রের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      </AdminCard>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
      <p className="mt-0.5 font-bold text-slate-900">{value}</p>
    </div>
  );
}
