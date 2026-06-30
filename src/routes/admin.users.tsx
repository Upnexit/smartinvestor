import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Trash2, Eye, Download, UserPlus, ShieldCheck, UserCog, Pencil, X } from "lucide-react";
import {
  AdminPageHeader, AdminCard, GradientButton, SoftButton, Shimmer, EmptyState, ConfirmDeleteModal,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { listUsers, deleteUser, subscribeTable } from "@/lib/admin-client";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type Search = { q?: string };
type User = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  avatar_url: string | null; balance: number; locked_balance: number; total_earned: number;
  referral_code: string | null; tasks_completed: number; created_at: string;
};

export const Route = createFileRoute("/admin/users")({
  validateSearch: (s: Record<string, unknown>): Search => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({ meta: [{ title: "ইউজার — Smart Investor Admin" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(q ?? "");
  const [users, setUsers] = useState<User[] | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState<User | null>(null);

  const refresh = () => {
    listUsers(q ?? "").then((rows) => setUsers(rows as User[])).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
    const since = new Date(); since.setHours(0,0,0,0);
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()).then(({ count }) => setTodayCount(count ?? 0));
  };
  useAdminAutoRefresh(refresh);

  useEffect(() => {
    const unsub = subscribeTable("profiles", refresh);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => { setQuery(q ?? ""); }, [q]);

  const stats = useMemo(() => ({
    total: users?.length ?? 0,
    earners: users?.filter((u) => u.total_earned > 0).length ?? 0,
    newToday: todayCount,
  }), [users, todayCount]);

  const onSearch = () => navigate({ search: query.trim() ? { q: query.trim() } : {} });

  const handleDelete = async () => {
    if (!del) return;
    setBusy(del.id);
    try {
      await deleteUser(del.id);
      toast.success("ইউজার ডিলিট হয়েছে");
      setDel(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ব্যর্থ");
    } finally { setBusy(null); }
  };

  const exportCsv = () => {
    if (!users) return;
    const header = ["id","full_name","email","phone","balance","locked_balance","total_earned","tasks_completed","created_at"];
    const rows = users.map((u) => header.map((h) => `"${String((u as unknown as Record<string, unknown>)[h] ?? "").replace(/"/g,'""')}"`).join(","));
    const csv = header.join(",") + "\n" + rows.join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `users-${Date.now()}.csv`; a.click();
  };

  return (
    <>
      <AdminPageHeader accent="sky" Icon={Users} title="ইউজার ম্যানেজমেন্ট" subtitle="সকল ইউজার, সার্চ, এডিট, ডিলিট"
        action={<GradientButton accent="sky" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</GradientButton>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile accent="sky"     label="মোট ইউজার"      value={stats.total.toLocaleString("bn-BD")} Icon={Users} />
        <StatTile accent="emerald" label="আর্নিং ইউজার"    value={stats.earners.toLocaleString("bn-BD")} Icon={ShieldCheck} />
        <StatTile accent="rose"    label="আজকের সাইনআপ"   value={stats.newToday.toLocaleString("bn-BD")} Icon={UserPlus} />
        <StatTile accent="amber"   label="মোট আর্নিং"      value={users ? "৳" + users.reduce((s,u)=>s + Number(u.total_earned||0),0).toLocaleString("bn-BD") : "—"} Icon={UserCog} />
      </div>

      <AdminCard accent="sky" className="p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
              placeholder="নাম / ইমেইল / ফোন খুঁজুন..."
              className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-9 pr-3 py-2 text-sm outline-none focus:border-sky-400 focus:bg-white" />
          </div>
          <GradientButton accent="sky" onClick={onSearch}>খুঁজুন</GradientButton>
        </div>
      </AdminCard>

      {!users ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0,1,2,3,4,5].map((i) => <Shimmer key={i} className="h-40" />)}
        </div>
      ) : users.length === 0 ? (
        <EmptyState Icon={Users} title="কোনো ইউজার পাওয়া যায়নি" hint="অন্য কীওয়ার্ডে চেষ্টা করুন" accent="sky" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <AdminCard key={u.id} accent="sky" interactive className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-bold shadow-lg ring-2 ring-white")}>
                  {(u.full_name ?? "?").slice(0,1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="bn-display text-base text-slate-900 truncate">{u.full_name ?? "—"}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  <p className="text-xs font-mono text-slate-400">{u.phone}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-emerald-50 p-2 text-center">
                  <p className="text-[10px] text-emerald-600 font-semibold">ব্যালেন্স</p>
                  <p className="text-sm font-bold text-emerald-700">৳{Number(u.balance).toFixed(0)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2 text-center">
                  <p className="text-[10px] text-amber-600 font-semibold">লকড</p>
                  <p className="text-sm font-bold text-amber-700">৳{Number(u.locked_balance).toFixed(0)}</p>
                </div>
                <div className="rounded-lg bg-sky-50 p-2 text-center">
                  <p className="text-[10px] text-sky-600 font-semibold">টাস্ক</p>
                  <p className="text-sm font-bold text-sky-700">{u.tasks_completed}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Link to="/admin/users/$id" params={{ id: u.id }} className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-500/30 hover:scale-[1.02] transition">
                  <Eye className="h-3.5 w-3.5" /> ডিটেইল
                </Link>
                <SoftButton onClick={() => setDel(u)} accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200">
                  <Trash2 className="h-3.5 w-3.5" />
                </SoftButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!del} onClose={() => setDel(null)} busy={!!busy} onConfirm={handleDelete}
        title="ইউজার ডিলিট করবেন?"
        body={<>এই ইউজারের সকল ডাটা (প্যাকেজ, টাস্ক, উইথড্র, রেফারেল) মুছে যাবে। <b className="text-rose-600">এটা ফিরিয়ে আনা যাবে না।</b></>}
      />
    </>
  );
}
