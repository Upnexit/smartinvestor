import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, User as UserIcon, Wallet, Package, ListChecks, ArrowDownToLine, Users as UsersIcon } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, Shimmer } from "@/components/admin/AdminUI";
import { adminGetUser, adminUpdateUser } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/users/$id")({
  head: () => ({ meta: [{ title: "ইউজার ডিটেইল — Admin" }] }),
  component: UserDetailPage,
});

const TABS = [
  { key: "profile", label: "প্রোফাইল", Icon: UserIcon },
  { key: "financial", label: "ফিনান্সিয়াল", Icon: Wallet },
  { key: "packages", label: "প্যাকেজ", Icon: Package },
  { key: "tasks", label: "টাস্ক", Icon: ListChecks },
  { key: "withdrawals", label: "উইথড্র", Icon: ArrowDownToLine },
  { key: "referrals", label: "রেফারেল", Icon: UsersIcon },
] as const;

type TabKey = typeof TABS[number]["key"];

function UserDetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetUser);
  const update = useServerFn(adminUpdateUser);
  const [data, setData] = useState<Awaited<ReturnType<typeof get>> | null>(null);
  const [tab, setTab] = useState<TabKey>("profile");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", balance: "", locked_balance: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get({ data: { userId: id } }).then((r) => {
      setData(r);
      const p = r.profile;
      if (p) setForm({
        full_name: p.full_name ?? "", phone: p.phone ?? "", email: p.email ?? "",
        balance: String(p.balance ?? 0), locked_balance: String(p.locked_balance ?? 0),
      });
    }).catch((e) => toast.error(e.message));
  }, [id, get]);

  const onSave = async () => {
    setSaving(true);
    try {
      await update({ data: { userId: id, patch: {
        full_name: form.full_name, phone: form.phone, email: form.email,
        balance: form.balance, locked_balance: form.locked_balance,
      } } });
      toast.success("সেভ হয়েছে");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setSaving(false); }
  };

  if (!data) return (
    <>
      <Shimmer className="h-24" />
      <Shimmer className="h-64" />
    </>
  );

  const p = data.profile;

  return (
    <>
      <div className="flex items-center gap-2">
        <Link to="/admin/users" className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500 hover:bg-slate-50 ring-1 ring-slate-200"><ArrowLeft className="h-4 w-4" /></Link>
        <AdminPageHeader accent="sky" Icon={UserIcon}
          title={p?.full_name ?? "—"}
          subtitle={`${p?.email ?? ""} · ${p?.phone ?? ""}`}
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition-all",
                active
                  ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white ring-transparent shadow-md shadow-blue-500/30 scale-[1.02]"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
              )}>
              <t.Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <AdminCard accent="sky" className="p-4 space-y-3">
          <Field label="পূর্ণ নাম" value={form.full_name} onChange={(v) => setForm((f) => ({ ...f, full_name: v }))} />
          <Field label="ফোন" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Field label="ইমেইল" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Field label="ব্যালেন্স (৳)" value={form.balance} onChange={(v) => setForm((f) => ({ ...f, balance: v }))} type="number" />
          <Field label="লকড ব্যালেন্স (৳)" value={form.locked_balance} onChange={(v) => setForm((f) => ({ ...f, locked_balance: v }))} type="number" />
          <GradientButton accent="emerald" onClick={onSave} busy={saving}>{saving ? null : <Save className="h-4 w-4" />} সেভ করুন</GradientButton>
        </AdminCard>
      )}

      {tab === "financial" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="ব্যালেন্স" v={`৳${Number(p?.balance ?? 0).toFixed(0)}`} accent="emerald" />
          <Card label="লকড" v={`৳${Number(p?.locked_balance ?? 0).toFixed(0)}`} accent="amber" />
          <Card label="মোট আর্নিং" v={`৳${Number(p?.total_earned ?? 0).toFixed(0)}`} accent="sky" />
          <Card label="রেফারেল কোড" v={p?.referral_code ?? "—"} accent="fuchsia" mono />
        </div>
      )}

      {tab === "packages" && (
        <AdminCard accent="fuchsia" className="p-4">
          {data.packages.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">কোনো প্যাকেজ নেই</p> : (
            <ul className="space-y-2">
              {data.packages.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl ring-1 ring-fuchsia-100 bg-fuchsia-50/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="bn-display text-sm">{(p as { packages?: { name?: string } | null }).packages?.name ?? "—"}</p>
                    <p className="text-[11px] text-slate-500">{new Date(p.created_at!).toLocaleString("bn-BD")}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                    p.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    p.status === "pending" ? "bg-amber-100 text-amber-700" :
                    p.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>
                    {p.status}
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
              {data.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-xl ring-1 ring-rose-100 bg-rose-50/40 px-3 py-2 text-sm">
                  <span className="truncate">{(t as { link_tasks?: { title?: string } | null }).link_tasks?.title ?? "—"}</span>
                  <span className="font-bold text-rose-700">৳{Number((t as { link_tasks?: { reward?: number } | null }).link_tasks?.reward ?? 0)}</span>
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
              {data.withdrawals.map((w) => (
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

      {tab === "referrals" && (
        <AdminCard accent="violet" className="p-4">
          {data.referrals.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">কোনো রেফারেল আয় নেই</p> : (
            <ul className="space-y-2">
              {data.referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl ring-1 ring-purple-100 bg-purple-50/40 px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{r.referred_user_id.slice(0,8)}…</span>
                  <span className="font-bold text-purple-700">+৳{r.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      )}
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300/40" />
    </label>
  );
}

function Card({ label, v, accent, mono }: { label: string; v: string; accent: "emerald"|"amber"|"sky"|"fuchsia"|"violet"; mono?: boolean }) {
  const map = { emerald: "from-emerald-500 to-green-600", amber: "from-amber-500 to-orange-600", sky: "from-sky-500 to-blue-600", fuchsia: "from-fuchsia-500 to-pink-600", violet: "from-purple-500 to-violet-600" };
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-soft p-3 animate-admin-pop">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-1 bn-display text-lg bg-gradient-to-br bg-clip-text text-transparent", map[accent], mono && "font-mono")}>{v}</p>
    </div>
  );
}

void Loader2; void SoftButton;
