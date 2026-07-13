import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Award, Receipt, ArrowDownToLine } from "lucide-react";
import { AdminPageHeader, StatTile, AdminCard } from "@/components/admin/AdminUI";
import { getMyDistributorBundle } from "@/lib/admin-client";
import { useServerFn } from "@tanstack/react-start";
import { listDistributorEarnings } from "@/lib/distributor-earnings.functions";

export const Route = createFileRoute("/distributor/earnings")({
  component: EarningsPage,
});

type Earning = { id: string; source: string; amount: number; created_at: string; related_user_id: string | null };

const SOURCE_BN: Record<string, string> = {
  withdrawal_tax: "উইথড্র ট্যাক্স (২%)",
  weekly_target: "সাপ্তাহিক টার্গেট",
  manual: "ম্যানুয়াল",
};

function EarningsPage() {
  const [data, setData] = useState<{ profile: { commission_rate?: number; payment_method?: string; payment_number?: string } | null; stats: { balance?: number; total_earned?: number; total_deposit?: number } | null } | null>(null);
  const [earnings, setEarnings] = useState<{ rows: Earning[]; summary: { total: number; bySource: Record<string, number> } }>({ rows: [], summary: { total: 0, bySource: {} } });
  const listFn = useServerFn(listDistributorEarnings);

  useEffect(() => {
    (async () => {
      try {
        const [b, e] = await Promise.all([
          getMyDistributorBundle().catch(() => null),
          listFn({ data: {} }).catch(() => ({ rows: [], summary: { total: 0, bySource: {} } })),
        ]);
        setData(b as never);
        setEarnings(e as never);
      } catch { setData({ profile: null, stats: null }); }
    })();
  }, [listFn]);

  const s = data?.stats;
  const p = data?.profile;
  const withdrawalTax = earnings.summary.bySource["withdrawal_tax"] ?? 0;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="কমিশন ও আয়" subtitle="আপনার মোট আয় এবং পেমেন্ট বিস্তারিত" Icon={Wallet} accent="emerald" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="বর্তমান ব্যালেন্স" value={`৳${Number(s?.balance ?? 0).toLocaleString("bn-BD")}`} Icon={Wallet} accent="emerald" />
        <StatTile label="মোট আয়" value={`৳${Number(s?.total_earned ?? 0).toLocaleString("bn-BD")}`} Icon={Award} accent="fuchsia" />
        <StatTile label="উইথড্র ট্যাক্স আয়" value={`৳${withdrawalTax.toLocaleString("bn-BD")}`} Icon={ArrowDownToLine} accent="sky" />
        <StatTile label="মোট ডিপোজিট" value={`৳${Number(s?.total_deposit ?? 0).toLocaleString("bn-BD")}`} Icon={TrendingUp} accent="amber" />
      </div>

      <AdminCard accent="sky" className="p-5">
        <h3 className="bn-display text-lg text-slate-900 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-sky-600" /> উইথড্র ট্যাক্স কমিশন (২%)
        </h3>
        <p className="mt-1 text-xs text-slate-600">আপনার under-এ থাকা user-রা যখন withdraw দেয়, তখন ২% service fee automatic আপনার balance-এ যোগ হয়।</p>
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {earnings.rows.filter((r) => r.source === "withdrawal_tax").length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-4">এখনো কোনো উইথড্র ট্যাক্স আয় হয়নি</p>
          ) : earnings.rows.filter((r) => r.source === "withdrawal_tax").map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-slate-700">{SOURCE_BN[r.source] || r.source}</p>
                <p className="text-[11px] text-slate-500">{new Date(r.created_at).toLocaleString("bn-BD")}</p>
              </div>
              <p className="bn-display text-emerald-600">+৳{Number(r.amount).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard accent="emerald" className="p-5">
        <h3 className="bn-display text-lg text-slate-900">পেমেন্ট তথ্য</h3>
        <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
          <Info label="পেমেন্ট মেথড" value={p?.payment_method ?? "—"} />
          <Info label="পেমেন্ট নম্বর" value={p?.payment_number ?? "—"} />
          <Info label="কমিশন রেট" value={`${p?.commission_rate ?? 5}%`} />
        </div>
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
