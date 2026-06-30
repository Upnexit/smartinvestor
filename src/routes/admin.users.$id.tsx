import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, User as UserIcon, Wallet, Package, ListChecks, ArrowDownToLine, Users as UsersIcon, Pencil, X, Mail, Phone, Hash, Calendar, Banknote, TrendingUp } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, Shimmer } from "@/components/admin/AdminUI";
import { getUserBundle, updateUser } from "@/lib/admin-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [{ title: "ইউজার ডিটেইল — Admin" }] }),
  component: UserDetailPage,
});

const TABS = [
  { key: "profile",     label: "প্রোফাইল",   Icon: UserIcon },
  { key: "financial",   label: "ফিনান্সিয়াল", Icon: Wallet },
  { key: "referrals",   label: "রেফারেল",    Icon: UsersIcon },
  { key: "packages",    label: "প্যাকেজ",    Icon: Package },
  { key: "tasks",       label: "টাস্ক",      Icon: ListChecks },
  { key: "withdrawals", label: "উইথড্র",     Icon: ArrowDownToLine },
] as const;
type TabKey = typeof TABS[number]["key"];

type Bundle = Awaited<ReturnType<typeof getUserBundle>>;

function UserDetailPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<Bundle | null>(null);
  const [tab, setTab] = useState<TabKey>("profile");
  const [editOpen, setEditOpen] = useState(false);

  const load = () => {
    getUserBundle(id).then(setData).catch((e) => toast.error(e instanceof Error ? e.message : "ব্যর্থ"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!data) return (<><Shimmer className="h-24" /><Shimmer className="h-64" /></>);
  const p = data.profile;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/users" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1 min-w-0">
          <AdminPageHeader accent="sky" Icon={UserIcon}
            title={p?.full_name ?? "—"}
            subtitle={`ID: ${p?.user_code ?? id.slice(0,8)} · ${p?.email ?? ""}`}
          />
        </div>
        <button onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.03] transition ring-1 ring-emerald-300/40">
          <Pencil className="h-4 w-4" /> এডিট
        </button>
      </div>

      {/* Hero bio card */}
      <AdminCard accent="sky" className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-2xl font-extrabold shadow-lg ring-2 ring-white">
            {(p?.full_name ?? "?").slice(0,1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="bn-display text-xl text-slate-900">{p?.full_name ?? "—"}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{p?.user_code ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{p?.email ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p?.phone ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{p?.created_at ? new Date(p.created_at).toLocaleDateString("bn-BD") : "—"}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="ব্যালেন্স"    value={`৳${Number(p?.balance ?? 0).toFixed(0)}`}        Icon={Wallet}   from="from-emerald-500" to="to-teal-600" />
          <MiniStat label="মোট আর্নিং"   value={`৳${Number(p?.total_earned ?? 0).toFixed(0)}`}   Icon={TrendingUp} from="from-sky-500"     to="to-indigo-600" />
          <MiniStat label="রেফারেল"      value={data.referralCount.toLocaleString("bn-BD")}      Icon={UsersIcon}  from="from-fuchsia-500" to="to-pink-600" />
          <MiniStat label="রেফারেল আয়"  value={`৳${data.referralEarnedTotal.toFixed(0)}`}        Icon={Banknote}   from="from-amber-500"   to="to-orange-600" />
        </div>
      </AdminCard>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition-all",
                active ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white ring-transparent shadow-md shadow-blue-500/30 scale-[1.02]"
                       : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")}>
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <AdminCard accent="sky" className="p-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Bio label="পূর্ণ নাম"           value={p?.full_name} />
            <Bio label="ইউজার ID (কোড)"      value={p?.user_code} mono />
            <Bio label="ইমেইল"               value={p?.email} />
            <Bio label="ফোন"                 value={p?.phone} />
            <Bio label="পেমেন্ট মেথড"        value={p?.payment_method} />
            <Bio label="পেমেন্ট নম্বর"        value={p?.payment_number} />
            <Bio label="রেফারেল কোড"          value={p?.referral_code} mono />
            <Bio label="রেফার করেছেন"        value={p?.referred_by ? String(p.referred_by).slice(0,8) + "…" : "—"} mono />
            <Bio label="স্ট্যাটাস"            value={(p as unknown as { status?: string | null })?.status ?? "active"} />
            <Bio label="অ্যাকাউন্ট তৈরি"     value={p?.created_at ? new Date(p.created_at).toLocaleString("bn-BD") : "—"} />
            <Bio label="শেষ আপডেট"           value={p?.updated_at ? new Date(p.updated_at).toLocaleString("bn-BD") : "—"} />
            <Bio label="সম্পূর্ণ UUID"        value={p?.id} mono small />
          </div>
        </AdminCard>
      )}

      {tab === "financial" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BigCard label="ব্যালেন্স"      v={`৳${Number(p?.balance ?? 0).toFixed(0)}`}        accent="emerald" />
          <BigCard label="লকড"            v={`৳${Number(p?.locked_balance ?? 0).toFixed(0)}`} accent="amber" />
          <BigCard label="মোট আর্নিং"     v={`৳${Number(p?.total_earned ?? 0).toFixed(0)}`}   accent="sky" />
          <BigCard label="রেফারেল আয়"    v={`৳${data.referralEarnedTotal.toFixed(0)}`}        accent="fuchsia" />
        </div>
      )}

      {tab === "referrals" && (
        <AdminCard accent="fuchsia" className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="bn-display text-base text-slate-800">মোট রেফার করেছে: <span className="text-fuchsia-600 font-bold">{data.referralCount.toLocaleString("bn-BD")}</span> জন</p>
            <p className="text-sm text-slate-600">মোট কমিশন: <span className="font-bold text-emerald-600">৳{data.referralEarnedTotal.toFixed(2)}</span></p>
          </div>
          {data.referredUsers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">এই ইউজার এখনো কাউকে রেফার করেনি</p>
          ) : (
            <ul className="space-y-2">
              {data.referredUsers.map((r: { id: string; full_name: string | null; email: string | null; phone: string | null; user_code: string | null; created_at: string; total_earned: number | string | null }) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="bn-display text-sm truncate">{r.full_name ?? "—"} <span className="text-[10px] font-mono text-slate-400">{r.user_code}</span></p>
                    <p className="text-[11px] text-slate-500 truncate">{r.email} · {r.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-500">{new Date(r.created_at).toLocaleDateString("bn-BD")}</p>
                    <p className="text-sm font-bold text-emerald-700">৳{Number(r.total_earned ?? 0).toFixed(0)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.referrals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">কমিশন হিস্ট্রি</p>
              <ul className="space-y-1.5">
                {data.referrals.map((r: { id: string; referred_user_id: string; amount?: number | string | null; created_at?: string | null; source?: string | null }) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg ring-1 ring-purple-100 bg-purple-50/30 px-3 py-1.5 text-xs">
                    <span className="font-mono">{r.referred_user_id.slice(0,8)}…</span>
                    <span className="text-slate-500">{r.source}</span>
                    <span className="font-bold text-purple-700">+৳{r.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AdminCard>
      )}

      {tab === "packages" && (
        <AdminCard accent="fuchsia" className="p-4">
          {data.packages.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">কোনো প্যাকেজ নেই</p> : (
            <ul className="space-y-2">
              {data.packages.map((pk: { id: string; created_at?: string | null; status?: string | null; packages?: { name?: string } | null }) => (
                <li key={pk.id} className="flex items-center justify-between rounded-xl ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="bn-display text-sm">{pk.packages?.name ?? "—"}</p>
                    <p className="text-[11px] text-slate-500">{new Date(pk.created_at!).toLocaleString("bn-BD")}</p>
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
        </AdminCard>
      )}

      {tab === "tasks" && (
        <AdminCard accent="rose" className="p-4">
          {data.tasks.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">কোনো টাস্ক নেই</p> : (
            <ul className="space-y-2">
              {data.tasks.map((t: { id: string; link_tasks?: { title?: string; reward?: number | string | null } | null }) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl ring-1 ring-rose-100 bg-rose-50/40 px-3 py-2 text-sm">
                  <span className="truncate">{t.link_tasks?.title ?? "—"}</span>
                  <span className="font-bold text-rose-700">৳{Number(t.link_tasks?.reward ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      {tab === "withdrawals" && (
        <AdminCard accent="emerald" className="p-4">
          {data.withdrawals.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">কোনো উইথড্র নেই</p> : (
            <ul className="space-y-2">
              {data.withdrawals.map((w: { id: string; amount?: number | string | null; method?: string | null; status?: string | null }) => (
                <li key={w.id} className="flex items-center justify-between rounded-xl ring-1 ring-emerald-100 bg-emerald-50/40 px-3 py-2">
                  <p className="text-sm">৳{w.amount} · {w.method}</p>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    w.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    w.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}

      {editOpen && p && (
        <EditDrawer userId={id} initial={p} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />
      )}
    </>
  );
}

/* ---------- Edit drawer ---------- */
type ProfileLike = {
  full_name: string | null; phone: string | null; email: string | null;
  balance: number | string | null; locked_balance: number | string | null;
  payment_method?: string | null; payment_number?: string | null;
  status?: string | null;
};

function EditDrawer({ userId, initial, onClose, onSaved }: { userId: string; initial: ProfileLike; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: initial.full_name ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
    balance: String(initial.balance ?? 0),
    locked_balance: String(initial.locked_balance ?? 0),
    payment_method: initial.payment_method ?? "bkash",
    payment_number: initial.payment_number ?? "",
    status: initial.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateUser(userId, form);
      toast.success("সেভ হয়েছে ✓");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 animate-in fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in slide-in-from-bottom-4">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-3xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20"><Pencil className="h-4 w-4" /></div>
            <div>
              <p className="bn-display text-base">ইউজার এডিট</p>
              <p className="text-[11px] text-white/85">পরিবর্তন সাথে সাথে database-এ সেভ হবে</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 hover:bg-white/25"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 grid gap-3 sm:grid-cols-2">
          <Field label="পূর্ণ নাম"      value={form.full_name}      onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
          <Field label="ফোন"             value={form.phone}          onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Field label="ইমেইল"           value={form.email}          onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <SelectField label="স্ট্যাটাস" value={form.status}         onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={["active","suspended","banned"]} />
          <Field label="ব্যালেন্স (৳)"   value={form.balance}        onChange={(v) => setForm((f) => ({ ...f, balance: v }))} type="number" />
          <Field label="লকড ব্যালেন্স"   value={form.locked_balance} onChange={(v) => setForm((f) => ({ ...f, locked_balance: v }))} type="number" />
          <SelectField label="পেমেন্ট মেথড" value={form.payment_method} onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))} options={["bkash","nagad","rocket"]} />
          <Field label="পেমেন্ট নম্বর"   value={form.payment_number} onChange={(v) => setForm((f) => ({ ...f, payment_number: v }))} />
        </div>

        <div className="sticky bottom-0 flex gap-2 rounded-b-3xl border-t border-slate-100 bg-white p-3">
          <button onClick={onClose} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">বাতিল</button>
          <GradientButton accent="emerald" onClick={save} busy={saving} className="flex-1 justify-center">
            <Save className="h-4 w-4" /> সেভ করুন
          </GradientButton>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

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

function Bio({ label, value, mono, small }: { label: string; value: string | null | undefined; mono?: boolean; small?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-0.5 text-slate-900 break-all", mono && "font-mono", small ? "text-xs" : "text-sm")}>{value ?? "—"}</p>
    </div>
  );
}

function BigCard({ label, v, accent }: { label: string; v: string; accent: "emerald"|"amber"|"sky"|"fuchsia" }) {
  const map = { emerald: "from-emerald-500 to-teal-600", amber: "from-amber-500 to-orange-600", sky: "from-sky-500 to-indigo-600", fuchsia: "from-fuchsia-500 to-pink-600" };
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white shadow-xl ring-1 ring-white/30", map[accent])}>
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
      <p className="relative text-[10px] font-bold uppercase tracking-wider text-white/85">{label}</p>
      <p className="relative mt-1 bn-display text-2xl font-extrabold">{v}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300/40" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-300/40">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
