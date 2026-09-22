import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Smartphone, Users, CheckCircle2, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader, AdminCard, Shimmer } from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/app-installs")({
  head: () => ({ meta: [{ title: "অ্যাপ ইনস্টল — Smart Click BD Admin" }] }),
  component: AppInstallsPage,
});

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  user_code: string | null;
  status: string | null;
  app_installed_at: string;
  created_at: string;
};

function AppInstallsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [installsRes, totalRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,full_name,email,phone,user_code,status,app_installed_at,created_at")
          .not("app_installed_at", "is", null)
          .order("app_installed_at", { ascending: false })
          .limit(500),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setRows((installsRes.data ?? []) as Row[]);
      setTotalUsers(totalRes.count ?? 0);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.phone?.toLowerCase().includes(q) ||
        r.user_code?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalInstalls = rows?.length ?? 0;
  const activeInstalls = rows?.filter((r) => r.status === "active").length ?? 0;
  const installRate = totalUsers > 0 ? Math.round((totalInstalls / totalUsers) * 100) : 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        Icon={Smartphone}
        title="অ্যাপ ইনস্টল"
        subtitle="যেসব ইউজার মোবাইল/ডেস্কটপ অ্যাপ ইনস্টল করেছেন"
        accent="cyan"
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon={<Download className="h-5 w-5" />}
          label="মোট ইনস্টল"
          value={totalInstalls.toLocaleString("bn-BD")}
          gradient="from-cyan-500 via-sky-500 to-blue-600"
        />
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="অ্যাক্টিভ ইনস্টল"
          value={activeInstalls.toLocaleString("bn-BD")}
          gradient="from-emerald-500 via-teal-500 to-green-600"
        />
        <StatTile
          icon={<Users className="h-5 w-5" />}
          label="ইনস্টল রেট"
          value={`${installRate.toLocaleString("bn-BD")}%`}
          gradient="from-amber-500 via-orange-500 to-rose-500"
        />
      </div>

      <AdminCard accent="cyan">
        <div className="flex items-center gap-2 border-b border-slate-100 p-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম / ইমেইল / ফোন / কোড দিয়ে সার্চ করুন…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>

        {!rows ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            <Smartphone className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            কোনো ইনস্টল পাওয়া যায়নি
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">ইউজার</th>
                  <th className="px-4 py-3">কোড</th>
                  <th className="px-4 py-3">যোগাযোগ</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3">ইনস্টল সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {r.user_code || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{r.email || "—"}</div>
                      <div className="text-slate-400">{r.phone || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          r.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "suspended"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {r.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.app_installed_at).toLocaleString("bn-BD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-lg ring-1 ring-white/20",
        gradient,
      )}
    >
      <span className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/20 blur-xl" />
      <div className="opacity-90">{icon}</div>
      <p className="bn-display mt-2 text-2xl drop-shadow">{value}</p>
      <p className="text-[11px] text-white/85">{label}</p>
    </div>
  );
}
