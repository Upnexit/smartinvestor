import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Users, Search, Mail, Phone } from "lucide-react";
import { distributorListMyUsers } from "@/lib/distributor.functions";
import { AdminPageHeader, AdminCard, EmptyState, Shimmer } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/distributor/users")({
  component: MyUsersPage,
});

type Row = { id: string; full_name: string; email: string; phone: string | null; balance: number; total_earned: number; created_at: string; status: string };

function MyUsersPage() {
  const list = useServerFn(distributorListMyUsers);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");

  async function refresh() {
    try { setRows(await list({ data: { q } }) as Row[]); } catch { setRows([]); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const t = setTimeout(refresh, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="আমার ইউজার" subtitle="আপনার অধীনস্থ সমস্ত ইউজার" Icon={Users} accent="sky" />

      <AdminCard accent="sky" className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="নাম / ইমেইল / ফোন..."
            className="w-full rounded-xl border-2 border-sky-200 bg-sky-50/30 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100" />
        </div>
      </AdminCard>

      {rows === null ? <Shimmer className="h-24" />
        : rows.length === 0 ? <EmptyState Icon={Users} title="কোন ইউজার পাওয়া যায়নি" accent="sky" />
        : (
          <div className="grid gap-2">
            {rows.map((u) => (
              <AdminCard key={u.id} accent="sky" className="p-3" interactive>
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold shadow-lg">
                    {(u.full_name?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{u.full_name || "—"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {u.email}</span>
                      {u.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {u.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-emerald-700">৳{Number(u.balance ?? 0).toLocaleString("bn-BD")}</p>
                    <p className="text-slate-500 mt-0.5">আয়: ৳{Number(u.total_earned ?? 0).toLocaleString("bn-BD")}</p>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
    </div>
  );
}
