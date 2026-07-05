import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, User as UserIcon, Wallet, Users as UsersIcon, Mail, Phone, Hash, Calendar,
  MapPin, BadgeCheck, Activity, LogIn, LogOut, UserPlus, TrendingUp, Award, HandCoins,
  Clock, ShieldCheck, ShieldOff, CheckCircle2, XCircle,
} from "lucide-react";
import { AdminCard, Shimmer } from "@/components/admin/AdminUI";
import { getDistributorBundle } from "@/lib/admin-client";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/hooks/use-auth-ready";

export const Route = createFileRoute("/admin/distributors/$id")({
  head: () => ({ meta: [{ title: "ডিস্ট্রিবিউটর ডিটেইল — Admin" }] }),
  component: DistributorDetailPage,
});

type Bundle = Awaited<ReturnType<typeof getDistributorBundle>>;

function DistributorDetailPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<Bundle | null>(null);
  const authReady = useAuthReady();

  const load = () => {
    getDistributorBundle(id).then(setData).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
  };
  useEffect(() => { if (authReady) load(); /* eslint-disable-next-line */ }, [id, authReady]);

  if (!authReady || !data) return (<><Shimmer className="h-24" /><Shimmer className="h-64" /></>);

  const d = (data.distributor ?? {}) as Record<string, unknown>;
  const p = (data.profile ?? {}) as Record<string, unknown>;
  const stats = (data.stats ?? {}) as Record<string, unknown>;
  const suspended = String(d.status ?? "active") !== "active";

  const name = String(d.full_name ?? p.full_name ?? "—");
  const email = String(d.email ?? p.email ?? "—");
  const phone = (d.phone ?? p.phone ?? null) as string | null;
  const district = (d.district ?? null) as string | null;
  const thana = (d.thana ?? null) as string | null;

  const totalUsers = Number(stats.total_users ?? 0);
  const activePackages = Number(stats.active_packages ?? 0);
  const totalDeposit = Number(stats.total_deposit ?? 0);
  const balance = Number(stats.balance ?? d.balance ?? 0);
  const totalEarned = Number(stats.total_earned ?? d.total_earned ?? 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/distributors" className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 hover:bg-slate-50 ring-1 ring-slate-200 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1" />
        <span className={cn("inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ring-1",
          suspended ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
          {suspended ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {suspended ? "সাসপেন্ডেড" : "সক্রিয়"}
        </span>
      </div>

      {/* IDENTITY + KEY STATS */}
      <div className="grid gap-3 lg:grid-cols-2">
        <AdminCard accent="indigo" className="p-4 relative overflow-hidden">
          <div className="absolute -top-px right-3 z-10">
            <div className="inline-flex items-center gap-1 rounded-b-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-lg">
              <BadgeCheck className="h-3 w-3" /> ডিস্ট্রিবিউটর
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white text-2xl font-extrabold shadow-lg ring-2 ring-white",
              suspended ? "from-rose-500 to-red-600" : "from-indigo-500 to-violet-600")}>
              {name.slice(0,1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="bn-display text-xl text-slate-900 truncate">{name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{email}</span>
                {phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{phone}</span>}
                {(district || thana) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{district ?? ""}{thana ? `, ${thana}` : ""}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1 font-mono"><Hash className="h-2.5 w-2.5" />{String(p.user_code ?? id.slice(0,8))}</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{d.created_at ? new Date(String(d.created_at)).toLocaleDateString("bn-BD") : "—"}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="মোট ইউজার" value={totalUsers.toLocaleString("bn-BD")} Icon={UsersIcon} from="from-sky-500" to="to-indigo-600" />
            <MiniStat label="একটিভ প্যাকেজ" value={activePackages.toLocaleString("bn-BD")} Icon={Activity} from="from-emerald-500" to="to-teal-600" />
            <MiniStat label="ব্যালেন্স" value={`৳${balance.toFixed(0)}`} Icon={Wallet} from="from-amber-500" to="to-orange-600" />
            <MiniStat label="মোট আয়" value={`৳${totalEarned.toFixed(0)}`} Icon={Award} from="from-fuchsia-500" to="to-pink-600" />
          </div>
        </AdminCard>

        <SectionCard title="প্রোফাইল ও পেমেন্ট" Icon={UserIcon} accent="sky">
          <div className="grid grid-cols-2 gap-2">
            <Bio label="পূর্ণ নাম" value={name} />
            <Bio label="ইউজার ID" value={String(p.user_code ?? "—")} mono />
            <Bio label="ইমেইল" value={email} Icon={Mail} />
            <Bio label="ফোন" value={phone} Icon={Phone} />
            <Bio label="জেলা" value={district} Icon={MapPin} />
            <Bio label="থানা" value={thana} />
            <Bio label="ঠিকানা" value={(d.address ?? null) as string | null} />
            <Bio label="কমিশন" value={`${Number(d.commission_rate ?? 0)}%`} />
            <Bio label="পেমেন্ট মেথড" value={String(d.payment_method ?? "—")} />
            <Bio label="পেমেন্ট নম্বর" value={String(d.payment_number ?? "—")} mono />
          </div>
          {d.notes ? (
            <div className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2 text-xs text-slate-700">
              <span className="font-semibold">নোট: </span>{String(d.notes)}
            </div>
          ) : null}
        </SectionCard>
      </div>

      {/* FINANCE */}
      <SectionCard title="ফিনান্সিয়াল সারসংক্ষেপ" Icon={HandCoins} accent="emerald">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <BigCard label="ব্যালেন্স" v={`৳${balance.toFixed(0)}`} accent="emerald" />
          <BigCard label="মোট আয়" v={`৳${totalEarned.toFixed(0)}`} accent="fuchsia" />
          <BigCard label="মোট ডিপোজিট" v={`৳${totalDeposit.toFixed(0)}`} accent="sky" />
          <BigCard label="একটিভ প্যাকেজ" v={activePackages.toLocaleString("bn-BD")} accent="amber" />
        </div>
      </SectionCard>

      {/* REFERRED USERS - step by step */}
      <SectionCard
        title={`রেফার্ড ইউজার (${data.users.length.toLocaleString("bn-BD")})`}
        Icon={UsersIcon} accent="fuchsia"
      >
        {data.users.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">এখনো কোনো ইউজার রেফার করেননি</p>
        ) : (
          <ol className="space-y-2">
            {data.users.map((u, idx) => (
              <li key={u.id} className="flex items-center gap-3 rounded-xl ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-3 py-2">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white text-xs font-extrabold shadow">
                  {(idx + 1).toLocaleString("bn-BD")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                    {u.full_name ?? "—"}
                    <span className="text-[9px] font-mono text-slate-400">{u.user_code}</span>
                    {u.has_active_package ? (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1 py-0.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 className="h-2.5 w-2.5" /> সক্রিয়</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-600"><XCircle className="h-2.5 w-2.5" /> নিষ্ক্রিয়</span>
                    )}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    {u.email && <span className="inline-flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{u.email}</span>}
                    {u.phone && <span className="inline-flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{u.phone}</span>}
                    <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{new Date(u.created_at).toLocaleDateString("bn-BD")}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-emerald-700">৳{Number(u.balance ?? 0).toFixed(0)}</p>
                  <p className="text-[9px] text-slate-500">আয়: ৳{Number(u.total_earned ?? 0).toFixed(0)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      {/* ACTIVITY LOG */}
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title="ডিস্ট্রিবিউটরের অ্যাক্টিভিটি" Icon={Clock} accent="sky">
          <ActivityList items={data.activity} empty="কোনো অ্যাক্টিভিটি নেই" />
        </SectionCard>
        <SectionCard title="আন্ডার ইউজারদের অ্যাক্টিভিটি" Icon={TrendingUp} accent="rose">
          <ActivityList items={data.user_activity} showActor empty="আন্ডার ইউজারদের কোনো অ্যাক্টিভিটি নেই" />
        </SectionCard>
      </div>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function ActivityList({ items, showActor, empty }: {
  items: Array<{ id: string; event_type: string; meta: Record<string, unknown>; created_at: string; actor_name?: string | null; actor_code?: string | null }>;
  showActor?: boolean; empty: string;
}) {
  const grouped = useMemo(() => items.slice(0, 100), [items]);
  if (grouped.length === 0) return <p className="text-xs text-slate-500 text-center py-6">{empty}</p>;
  return (
    <ul className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
      {grouped.map((a) => {
        const cfg = eventConfig(a.event_type);
        const Icon = cfg.icon;
        return (
          <li key={a.id} className={cn("flex items-start gap-2.5 rounded-xl px-2.5 py-1.5 ring-1", cfg.ring, cfg.bg)}>
            <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm", cfg.grad)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">
                {cfg.label}
                {showActor && a.actor_name ? (
                  <span className="ml-1 font-normal text-slate-500">— {a.actor_name} <span className="font-mono text-[9px] text-slate-400">{a.actor_code}</span></span>
                ) : null}
              </p>
              {activityDetail(a.event_type, a.meta) && (
                <p className="text-[10px] text-slate-500 truncate">{activityDetail(a.event_type, a.meta)}</p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 shrink-0 text-right">
              {new Date(a.created_at).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function eventConfig(event: string) {
  switch (event) {
    case "login":            return { label: "লগইন",           icon: LogIn,     grad: "from-emerald-500 to-teal-600", bg: "bg-emerald-50/50", ring: "ring-emerald-100" };
    case "logout":           return { label: "লগআউট",          icon: LogOut,    grad: "from-slate-500 to-slate-700",  bg: "bg-slate-50",      ring: "ring-slate-100" };
    case "referral_signup":  return { label: "নতুন রেফারেল",   icon: UserPlus,  grad: "from-fuchsia-500 to-pink-600", bg: "bg-fuchsia-50/50", ring: "ring-fuchsia-100" };
    default:                 return { label: event,             icon: Activity,  grad: "from-sky-500 to-indigo-600",   bg: "bg-sky-50/50",     ring: "ring-sky-100" };
  }
}

function activityDetail(event: string, meta: Record<string, unknown>): string | null {
  if (!meta) return null;
  if (event === "referral_signup") {
    const n = meta.referred_name as string | undefined;
    const c = meta.user_code as string | undefined;
    return n ? `${n}${c ? ` (${c})` : ""}` : null;
  }
  if (event === "login" && meta.path) return String(meta.path);
  return null;
}

function SectionCard({ title, Icon, accent, children }: {
  title: string; Icon: React.ComponentType<{ className?: string }>;
  accent: "sky"|"emerald"|"fuchsia"|"rose"|"indigo"|"amber"; children: React.ReactNode;
}) {
  const map = {
    sky:      "from-sky-500 to-indigo-600",
    emerald:  "from-emerald-500 to-teal-600",
    fuchsia:  "from-fuchsia-500 to-pink-600",
    rose:     "from-rose-500 to-red-600",
    indigo:   "from-indigo-500 to-violet-600",
    amber:    "from-amber-500 to-orange-600",
  } as const;
  return (
    <AdminCard accent={accent} className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", map[accent])}>
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
