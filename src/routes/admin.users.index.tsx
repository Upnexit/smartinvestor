import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Search, Trash2, Eye, FileSpreadsheet, FileText, Printer, FileDown, UserPlus, ShieldCheck, UserCog, Pencil, X, Ban, ShieldOff, BadgeCheck } from "lucide-react";
import {
  AdminPageHeader, AdminCard, SoftButton, Shimmer, EmptyState, ConfirmDeleteModal,
} from "@/components/admin/AdminUI";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { listUsers, deleteUser, subscribeTable, setUserStatus } from "@/lib/admin-client";
import { UserEditDrawer } from "@/components/admin/UserEditDrawer";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { exportCsv, exportExcel, exportPrint, exportPdf } from "@/lib/users-export";

type Search = { q?: string };
type User = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  avatar_url: string | null; balance: number; locked_balance: number; total_earned: number;
  referral_code: string | null; tasks_completed: number; created_at: string;
  status?: string | null; payment_method?: string | null; payment_number?: string | null;
  is_distributor?: boolean;
};

export const Route = createFileRoute("/admin/users/")({
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
  const [edit, setEdit] = useState<User | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

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

  useEffect(() => {
    const t = setTimeout(() => {
      const next = query.trim();
      if ((q ?? "") !== next) navigate({ search: next ? { q: next } : {} });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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

  const handleToggleSuspend = async (u: User) => {
    const isSuspended = u.status === "suspended";
    setBusy(u.id);
    try {
      await setUserStatus(u.id, isSuspended ? "active" : "suspended", isSuspended ? undefined : "অ্যাডমিন কর্তৃক সাসপেন্ড");
      toast.success(isSuspended ? "অ্যাকাউন্ট পুনরায় চালু করা হয়েছে" : "অ্যাকাউন্ট সাসপেন্ড করা হয়েছে");
      setSuspendTarget(null);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  const settings = useSiteSettings();
  const brand = { site_name: settings.site_name, tagline: settings.tagline, logo_url: settings.logo_url };

  const guard = (fn: () => void) => () => {
    if (!users || users.length === 0) return toast.error("কোনো ইউজার নেই");
    try { fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "এক্সপোর্ট ব্যর্থ"); }
  };
  const onCsv = guard(() => exportCsv(users!, brand));
  const onExcel = guard(() => { exportExcel(users!, brand); toast.success("Excel ফাইল ডাউনলোড হচ্ছে"); });
  const onPrint = guard(() => exportPrint(users!, brand));
  const onPdf = guard(() => exportPdf(users!, brand));

  const totalEarnedSum = users ? users.reduce((s,u)=>s + Number(u.total_earned||0),0) : 0;

  const tiles: Array<{ label: string; value: string; Icon: typeof Users; from: string; to: string; ring: string; shadow: string }> = [
    { label: "মোট ইউজার",    value: stats.total.toLocaleString("bn-BD"),   Icon: Users,       from: "from-sky-500",     to: "to-indigo-600",  ring: "ring-sky-200/60",     shadow: "shadow-sky-500/30" },
    { label: "আর্নিং ইউজার",  value: stats.earners.toLocaleString("bn-BD"), Icon: ShieldCheck, from: "from-emerald-500", to: "to-teal-600",    ring: "ring-emerald-200/60", shadow: "shadow-emerald-500/30" },
    { label: "আজকের সাইনআপ", value: stats.newToday.toLocaleString("bn-BD"), Icon: UserPlus,    from: "from-rose-500",    to: "to-pink-600",    ring: "ring-rose-200/60",    shadow: "shadow-rose-500/30" },
    { label: "মোট আর্নিং",    value: users ? "৳" + totalEarnedSum.toLocaleString("bn-BD") : "—", Icon: UserCog, from: "from-amber-500", to: "to-orange-600", ring: "ring-amber-200/60", shadow: "shadow-amber-500/30" },
  ];

  return (
    <>
      <AdminPageHeader accent="sky" Icon={Users} title="ইউজার ম্যানেজমেন্ট" subtitle="সকল ইউজার, সার্চ, এডিট, সাসপেন্ড, ডিলিট"
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <ExportBtn onClick={onCsv} label="CSV" Icon={FileText} gradient="from-slate-600 to-slate-800" shadow="shadow-slate-500/30" />
            <ExportBtn onClick={onExcel} label="Excel" Icon={FileSpreadsheet} gradient="from-emerald-500 to-green-600" shadow="shadow-emerald-500/40" />
            <ExportBtn onClick={onPdf} label="PDF" Icon={FileDown} gradient="from-rose-500 to-red-600" shadow="shadow-rose-500/40" />
            <ExportBtn onClick={onPrint} label="Print" Icon={Printer} gradient="from-sky-500 to-indigo-600" shadow="shadow-sky-500/40" />
          </div>
        } />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white ring-1 shadow-xl animate-admin-pop", t.from, t.to, t.ring, t.shadow)}>
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">{t.label}</p>
                <p className="mt-1 bn-display text-2xl font-extrabold drop-shadow-sm">{t.value}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                <t.Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <AdminCard accent="sky" className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="নাম, ইমেইল, ফোন, ইউজার-কোড (SN-...) বা রেফারেল কোড লিখুন — রিয়েল-টাইম সার্চ"
            className="w-full rounded-xl border border-sky-200 bg-sky-50/30 pl-9 pr-10 py-2.5 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-300/40" />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          )}
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
          {users.map((u) => {
            const suspended = u.status === "suspended" || u.status === "banned";
            const isDist = !!u.is_distributor;
            return (
              <AdminCard key={u.id} accent="sky" interactive className={cn("p-4 relative overflow-hidden", isDist && "ring-2 ring-indigo-300/70 shadow-indigo-200/40")}>
                {isDist && (
                  <div className="absolute -top-px right-3 z-10">
                    <div className="inline-flex items-center gap-1 rounded-b-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-lg ring-1 ring-white/40">
                      <BadgeCheck className="h-3 w-3" /> ডিস্ট্রিবিউটর
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white font-bold shadow-lg ring-2 ring-white",
                    suspended ? "from-rose-500 to-red-600" : isDist ? "from-indigo-500 to-violet-600" : "from-sky-500 to-indigo-600")}>
                    {(u.full_name ?? "?").slice(0,1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="bn-display text-base text-slate-900 truncate flex items-center gap-1.5">
                      {u.full_name ?? "—"}
                      {suspended && <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 uppercase"><Ban className="h-2.5 w-2.5" /> সাসপেন্ডেড</span>}
                    </p>
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
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  <Link to="/admin/users/$id" params={{ id: u.id }} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md shadow-blue-500/30 hover:scale-[1.02] transition">
                    <Eye className="h-3.5 w-3.5" /> ডিটেইল
                  </Link>
                  <button onClick={() => setEdit(u)} className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-md shadow-emerald-500/30 hover:scale-[1.02] transition">
                    <Pencil className="h-3.5 w-3.5" /> এডিট
                  </button>
                  <button onClick={() => setSuspendTarget(u)} disabled={busy === u.id}
                    className={cn("inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-white shadow-md hover:scale-[1.02] transition disabled:opacity-60",
                      suspended ? "bg-gradient-to-br from-lime-500 to-emerald-600 shadow-emerald-500/30" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30")}>
                    {suspended ? <><ShieldCheck className="h-3.5 w-3.5" /> চালু</> : <><ShieldOff className="h-3.5 w-3.5" /> সাসপেন্ড</>}
                  </button>
                  <SoftButton onClick={() => setDel(u)} accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200 !text-[11px] justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </SoftButton>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!del} onClose={() => setDel(null)} busy={!!busy} onConfirm={handleDelete}
        title="ইউজার ডিলিট করবেন?"
        body={<>এই ইউজারের সকল ডাটা (প্যাকেজ, টাস্ক, উইথড্র, রেফারেল) মুছে যাবে। <b className="text-rose-600">এটা ফিরিয়ে আনা যাবে না।</b></>}
      />

      {suspendTarget && (
        <ConfirmDeleteModal
          open onClose={() => setSuspendTarget(null)} busy={!!busy}
          onConfirm={() => handleToggleSuspend(suspendTarget)}
          title={suspendTarget.status === "suspended" ? "অ্যাকাউন্ট পুনরায় চালু করবেন?" : "অ্যাকাউন্ট সাসপেন্ড করবেন?"}
          body={suspendTarget.status === "suspended"
            ? <>ইউজার আবার সব ফিচার ব্যবহার করতে পারবে।</>
            : <>সাসপেন্ড করলে ইউজার লগইন করতে পারবে কিন্তু সাসপেনশন স্ক্রিন দেখবে এবং শুধু অ্যাডমিন-এর সাথে চ্যাট করতে পারবে।</>}
        />
      )}

      {edit && (
        <UserEditDrawer userId={edit.id} initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />
      )}
    </>
  );
}

function ExportBtn({ onClick, label, Icon, gradient, shadow }: {
  onClick: () => void; label: string; Icon: typeof Users; gradient: string; shadow: string;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br px-3 py-2 text-xs font-bold text-white shadow-lg ring-1 ring-white/20 transition-all hover:scale-[1.04] hover:-translate-y-0.5 active:scale-95",
        gradient, shadow,
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
