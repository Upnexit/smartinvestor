import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Package, Wallet, TrendingUp, LayoutDashboard, ArrowRight } from "lucide-react";
import { distributorGetMe, distributorListMyUsers } from "@/lib/distributor.functions";
import { AdminPageHeader, StatTile, AdminCard, EmptyState, Shimmer } from "@/components/admin/AdminUI";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/distributor/")({
  component: DistDashboard,
});

type Stats = { total_users: number; active_packages: number; total_deposit: number; balance: number; total_earned: number };
type Me = { profile: { full_name?: string; district?: string; commission_rate?: number } | null; stats: Stats | null };

function DistDashboard() {
  const getMe = useServerFn(distributorGetMe);
  const listUsers = useServerFn(distributorListMyUsers);
  const [me, setMe] = useState<Me | null>(null);
  const [recent, setRecent] = useState<{ id: string; full_name: string; email: string; balance: number; created_at: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      try { setMe(await getMe() as Me); } catch (e) { console.error(e); setMe({ profile: null, stats: null }); }
      try { const u = await listUsers({ data: { q: "" } }); setRecent((u as never[]).slice(0, 5)); } catch { setRecent([]); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = me?.stats;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={`স্বাগতম, ${me?.profile?.full_name ?? "ডিস্ট্রিবিউটর"}`}
        subtitle={me?.profile?.district ? `${me.profile.district} অঞ্চল • কমিশন ${me.profile.commission_rate ?? 5}%` : "আঞ্চলিক ডিস্ট্রিবিউটর প্যানেল"}
        Icon={LayoutDashboard} accent="indigo"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="মোট ইউজার" value={s?.total_users ?? "—"} Icon={Users} accent="indigo" />
        <StatTile label="সক্রিয় প্যাকেজ" value={s?.active_packages ?? "—"} Icon={Package} accent="emerald" />
        <StatTile label="মোট ডিপোজিট" value={`৳${Number(s?.total_deposit ?? 0).toLocaleString("bn-BD")}`} Icon={TrendingUp} accent="fuchsia" />
        <StatTile label="আমার ব্যালেন্স" value={`৳${Number(s?.balance ?? 0).toLocaleString("bn-BD")}`} Icon={Wallet} accent="amber" />
      </div>

      <AdminCard accent="sky" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="bn-display text-lg text-slate-900">সাম্প্রতিক ইউজার</h3>
          <Link to="/distributor/users" className="text-xs font-bold text-indigo-600 inline-flex items-center gap-1">সব দেখুন <ArrowRight className="h-3 w-3" /></Link>
        </div>
        {recent === null ? <Shimmer className="h-24" />
          : recent.length === 0 ? <EmptyState Icon={Users} title="এখনো কোন ইউজার নেই" accent="sky" />
          : (
            <ul className="divide-y divide-slate-100">
              {recent.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">৳{Number(u.balance ?? 0).toLocaleString("bn-BD")}</span>
                </li>
              ))}
            </ul>
          )}
      </AdminCard>
    </div>
  );
}
