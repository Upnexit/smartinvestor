import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, User as UserIcon, Wallet, Package, ListChecks, ArrowDownToLine, Users as UsersIcon, Pencil, Mail, Phone, Hash, Calendar, Banknote, TrendingUp, Ban, ShieldCheck, ShieldOff } from "lucide-react";
import { AdminCard, Shimmer } from "@/components/admin/AdminUI";
import { getUserBundle, setUserStatus } from "@/lib/admin-client";
import { UserEditDrawer } from "@/components/admin/UserEditDrawer";
import { cn } from "@/lib/utils";

type EditSearch = { edit?: number };

export const Route = createFileRoute("/admin/users/$id")({
  validateSearch: (s: Record<string, unknown>): EditSearch => ({ edit: s.edit === 1 || s.edit === "1" ? 1 : undefined }),
  head: () => ({ meta: [{ title: "ইউজার ডিটেইল — Admin" }] }),
  component: UserDetailPage,
});

type Bundle = Awaited<ReturnType<typeof getUserBundle>>;

function UserDetailPage() {
  const { id } = Route.useParams();
  const { edit: editParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [data, setData] = useState<Bundle | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    getUserBundle(id).then(setData).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (editParam === 1) {
      setEditOpen(true);
      navigate({ search: {}, replace: true });
    }
  }, [editParam, navigate]);

  if (!data) return (<><Shimmer className="h-24" /><Shimmer className="h-64" /></>);
  const p = data.profile;
  const suspended = (p as unknown as { status?: string })?.status === "suspended" || (p as unknown as { status?: string })?.status === "banned";

  const toggleSuspend = async () => {
    setBusy(true);
    try {
      await setUserStatus(id, suspended ? "active" : "suspended", suspended ? undefined : "অ্যাডমিন কর্তৃক সাসপেন্ড");
      toast.success(suspended ? "চালু করা হয়েছে" : "সাসপেন্ড করা হয়েছে");
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };

  return (
    <>
      {/* Top action bar — only back + action buttons, no admin header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/users" className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1" />
        <button onClick={toggleSuspend} disabled={busy}
          className={cn("inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-lg hover:scale-[1.03] transition ring-1 ring-white/40 disabled:opacity-60",
            suspended ? "bg-gradient-to-br from-lime-500 to-emerald-600 shadow-emerald-500/30" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30")}>
          {suspended ? <><ShieldCheck className="h-4 w-4" /> পুনরায় চালু</> : <><ShieldOff className="h-4 w-4" /> সাসপেন্ড</>}
        </button>
        <button onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.03] transition ring-1 ring-emerald-300/40">
          <Pencil className="h-4 w-4" /> এডিট
        </button>
      </div>

      {/* TOP ROW: Identity + Stats (left) | Profile (right) */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* LEFT: name + 2x2 stat tiles */}
        <AdminCard accent="sky" className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white text-2xl font-extrabold shadow-lg ring-2 ring-white",
              suspended ? "from-rose-500 to-red-600" : "from-sky-500 to-indigo-600")}>
              {(p?.full_name ?? "?").slice(0,1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="bn-display text-xl text-slate-900 truncate flex items-center gap-2">
                {p?.full_name ?? "—"}
                {suspended && <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase"><Ban className="h-3 w-3" /> সাসপেন্ডেড</span>}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1 font-mono"><Hash className="h-3 w-3" />{p?.user_code ?? "—"}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{p?.created_at ? new Date(p.created_at).toLocaleDateString("bn-BD") : "—"}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="ব্যালেন্স"   value={`৳${Number(p?.balance ?? 0).toFixed(0)}`}      Icon={Wallet}     from="from-emerald-500" to="to-teal-600" />
            <MiniStat label="মোট আর্নিং"  value={`৳${Number(p?.total_earned ?? 0).toFixed(0)}`} Icon={TrendingUp} from="from-sky-500"     to="to-indigo-600" />
            <MiniStat label="রেফারেল"     value={data.referralCount.toLocaleString("bn-BD")}    Icon={UsersIcon}  from="from-fuchsia-500" to="to-pink-600" />
            <MiniStat label="রেফারেল আয়" value={`৳${data.referralEarnedTotal.toFixed(0)}`}     Icon={Banknote}   from="from-amber-500"   to="to-orange-600" />
          </div>
        </AdminCard>

        {/* RIGHT: Profile bio */}
        <SectionCard title="প্রোফাইল" Icon={UserIcon} accent="sky">
          <div className="grid grid-cols-2 gap-2">
            <Bio label="পূর্ণ নাম"      value={p?.full_name} />
            <Bio label="ইউজার ID"        value={p?.user_code} mono />
            <Bio label="ইমেইল"           value={p?.email} Icon={Mail} />
            <Bio label="ফোন"             value={p?.phone} Icon={Phone} />
            <Bio label="রেফারেল কোড"     value={p?.referral_code} mono />
            <Bio label="রেফার করেছেন"    value={p?.referred_by ? String(p.referred_by).slice(0,8) + "…" : "—"} mono />
            <Bio label="স্ট্যাটাস"       value={(p as unknown as { status?: string })?.status ?? "active"} />
            <Bio label="আপডেট"           value={p?.updated_at ? new Date(p.updated_at).toLocaleDateString("bn-BD") : "—"} />
          </div>
        </SectionCard>
      </div>

      {/* MIDDLE ROW: Finance (left) | Referral (right) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title="ফিনান্সিয়াল" Icon={Wallet} accent="emerald">
          <div className="grid grid-cols-2 gap-2">
            <BigCard label="ব্যালেন্স"     v={`৳${Number(p?.balance ?? 0).toFixed(0)}`}        accent="emerald" />
            <BigCard label="লকড"           v={`৳${Number(p?.locked_balance ?? 0).toFixed(0)}`} accent="amber" />
            <BigCard label="মোট আর্নিং"    v={`৳${Number(p?.total_earned ?? 0).toFixed(0)}`}   accent="sky" />
            <BigCard label="রেফারেল আয়"   v={`৳${data.referralEarnedTotal.toFixed(0)}`}        accent="fuchsia" />
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold">পেমেন্ট মেথড:</span> {p?.payment_method ?? "—"} · <span className="font-mono">{p?.payment_number ?? "—"}</span>
          </div>
        </SectionCard>

        <SectionCard title="রেফারেল" Icon={UsersIcon} accent="fuchsia">
          <div className="flex items-center justify-between text-xs">
            <p className="text-slate-600">মোট রেফার: <b className="text-fuchsia-700">{data.referralCount.toLocaleString("bn-BD")}</b></p>
            <p className="text-slate-600">কমিশন: <b className="text-emerald-700">৳{data.referralEarnedTotal.toFixed(2)}</b></p>
          </div>
          {data.referredUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">এই ইউজার এখনো কাউকে রেফার করেনি</p>
          ) : (
            <ul className="mt-2 max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {data.referredUsers.map((r: { id: string; full_name: string | null; email: string | null; user_code: string | null; created_at: string; total_earned: number | string | null }) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-2.5 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs truncate font-medium">{r.full_name ?? "—"} <span className="text-[9px] font-mono text-slate-400">{r.user_code}</span></p>
                    <p className="text-[10px] text-slate-500 truncate">{r.email}</p>
                  </div>
                  <p className="text-xs font-bold text-emerald-700 shrink-0">৳{Number(r.total_earned ?? 0).toFixed(0)}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* THIRD ROW: Package (left) | Task (right) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title="প্যাকেজ" Icon={Package} accent="fuchsia">
          {data.packages.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">কোনো প্যাকেজ নেই</p> : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.packages.map((pk: { id: string; created_at?: string | null; status?: string | null; packages?: { name?: string } | null }) => (
                <li key={pk.id} className="flex items-center justify-between rounded-xl ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="bn-display text-sm">{pk.packages?.name ?? "—"}</p>
                    <p className="text-[10px] text-slate-500">{new Date(pk.created_at!).toLocaleDateString("bn-BD")}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    pk.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    pk.status === "pending" ? "bg-amber-100 text-amber-700" :
                    pk.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>
                    {pk.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="টাস্ক" Icon={ListChecks} accent="rose">
          {data.tasks.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">কোনো টাস্ক নেই</p> : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {data.tasks.map((t: { id: string; link_tasks?: { title?: string; reward?: number | string | null } | null }) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl ring-1 ring-rose-100 bg-rose-50/40 px-3 py-2 text-sm">
                  <span className="truncate">{t.link_tasks?.title ?? "—"}</span>
                  <span className="font-bold text-rose-700 shrink-0">৳{Number(t.link_tasks?.reward ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* BOTTOM: Withdraw (full width) */}
      <SectionCard title="উইথড্র" Icon={ArrowDownToLine} accent="emerald">
        {data.withdrawals.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">কোনো উইথড্র নেই</p> : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {data.withdrawals.map((w: { id: string; amount?: number | string | null; method?: string | null; status?: string | null; created_at?: string }) => (
              <li key={w.id} className="flex items-center justify-between rounded-xl ring-1 ring-emerald-100 bg-emerald-50/40 px-3 py-2">
                <div>
                  <p className="text-sm font-bold">৳{w.amount} <span className="text-xs font-normal text-slate-500">· {w.method}</span></p>
                  <p className="text-[10px] text-slate-500">{w.created_at ? new Date(w.created_at).toLocaleString("bn-BD") : "—"}</p>
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                  w.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                  w.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {editOpen && p && (
        <UserEditDrawer userId={id} initial={p as never} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />
      )}
    </>
  );
}

/* ---------- Subcomponents ---------- */

function SectionCard({ title, Icon, accent, children }: { title: string; Icon: React.ComponentType<{ className?: string }>; accent: "sky"|"emerald"|"fuchsia"|"rose"; children: React.ReactNode }) {
  const map = {
    sky:      { ic: "from-sky-500 to-indigo-600",     dot: "text-sky-500"     },
    emerald:  { ic: "from-emerald-500 to-teal-600",   dot: "text-emerald-500" },
    fuchsia:  { ic: "from-fuchsia-500 to-pink-600",   dot: "text-fuchsia-500" },
    rose:     { ic: "from-rose-500 to-red-600",       dot: "text-rose-500"    },
  } as const;
  return (
    <AdminCard accent={accent} className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", map[accent].ic)}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="bn-display text-base text-slate-900">{title}</p>
      </div>
      {children}
    </AdminCard>
  );
}

function MiniStat({ label, value, Icon, from, to }: { label: string; value: string; Icon: React.ComponentType<{ className?: string }>; from: string; to: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ring-1 ring-white/30", from, to)}>
      <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/15 blur-xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/85">{label}</p>
          <p className="mt-0.5 bn-display text-lg font-extrabold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-white/90" />
      </div>
    </div>
  );
}

function Bio({ label, value, mono, Icon }: { label: string; value: string | null | undefined; mono?: boolean; Icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-2.5 py-1.5 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />} {label}
      </p>
      <p className={cn("mt-0.5 text-slate-900 break-all text-xs", mono && "font-mono")}>{value ?? "—"}</p>
    </div>
  );
}

function BigCard({ label, v, accent }: { label: string; v: string; accent: "emerald"|"amber"|"sky"|"fuchsia" }) {
  const map = { emerald: "from-emerald-500 to-teal-600", amber: "from-amber-500 to-orange-600", sky: "from-sky-500 to-indigo-600", fuchsia: "from-fuchsia-500 to-pink-600" };
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white shadow-md ring-1 ring-white/30", map[accent])}>
      <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
      <p className="relative text-[10px] font-bold uppercase tracking-wider text-white/85">{label}</p>
      <p className="relative mt-1 bn-display text-xl font-extrabold">{v}</p>
    </div>
  );
}
