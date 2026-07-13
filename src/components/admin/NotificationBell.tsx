import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Users2, ArrowDownToLine, ShieldCheck, Sparkles, X, Loader2, Activity, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  kind: "application" | "withdrawal" | "order" | "user" | "dist_generated" | "dist_activated";
  title: string;
  subtitle: string;
  time: string;
  href: string;
};

const KIND_STYLE: Record<Notice["kind"], { grad: string; ring: string; Icon: typeof Bell; label: string }> = {
  application:    { grad: "from-indigo-500 to-violet-600",  ring: "ring-indigo-200",  Icon: Users2,          label: "ডিস্ট্রিবিউটর আবেদন" },
  withdrawal:     { grad: "from-emerald-500 to-teal-600",   ring: "ring-emerald-200", Icon: ArrowDownToLine, label: "উইথড্র রিকোয়েস্ট" },
  order:          { grad: "from-orange-500 to-amber-600",   ring: "ring-orange-200",  Icon: ShieldCheck,     label: "পেমেন্ট অ্যাপ্রুভাল" },
  user:           { grad: "from-sky-500 to-blue-600",       ring: "ring-sky-200",     Icon: Sparkles,        label: "নতুন ইউজার" },
  dist_generated: { grad: "from-fuchsia-500 to-purple-600", ring: "ring-fuchsia-200", Icon: Activity,        label: "Distributor Task তৈরি" },
  dist_activated: { grad: "from-emerald-500 to-green-600",  ring: "ring-emerald-200", Icon: CheckCircle2,    label: "Distributor Task Active" },
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return "এইমাত্র";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${d} দিন আগে`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  async function loadCount() {
    const [apps, wds, orders] = await Promise.all([
      supabase.from("distributor_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("user_packages").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setPendingCount((apps.count ?? 0) + (wds.count ?? 0) + (orders.count ?? 0));
  }

  async function loadItems() {
    setLoading(true);
    try {
      const [apps, wds, orders, users, distActs] = await Promise.all([
        supabase.from("distributor_applications")
          .select("id,full_name,district,thana,status,created_at")
          .order("created_at", { ascending: false }).limit(8),
        supabase.from("withdrawals")
          .select("id,amount,method,status,created_at,user_id")
          .order("created_at", { ascending: false }).limit(8),
        supabase.from("user_packages")
          .select("id,status,created_at,user_id,packages(name,price)")
          .order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles")
          .select("id,full_name,user_code,created_at")
          .order("created_at", { ascending: false }).limit(4),
        supabase.from("activity_logs")
          .select("id,user_id,event_type,meta,created_at")
          .in("event_type", ["distributor_task_generated", "distributor_task_activated"])
          .order("created_at", { ascending: false }).limit(10),
      ]);

      const list: Notice[] = [];
      for (const a of (apps.data ?? []) as Array<{id:string; full_name:string; district:string|null; thana:string|null; status:string; created_at:string}>) {
        list.push({
          id: `app-${a.id}`, kind: "application",
          title: a.full_name || "নতুন আবেদন",
          subtitle: `${a.status === "pending" ? "⏳ পেন্ডিং" : a.status === "approved" ? "✓ অনুমোদিত" : "✕ বাতিল"} • ${[a.district, a.thana].filter(Boolean).join(", ") || "—"}`,
          time: a.created_at, href: "/admin/distributors",
        });
      }
      for (const w of (wds.data ?? []) as Array<{id:string; amount:number; method:string|null; status:string; created_at:string}>) {
        list.push({
          id: `wd-${w.id}`, kind: "withdrawal",
          title: `৳${Number(w.amount).toLocaleString("bn-BD")} উইথড্র`,
          subtitle: `${(w.method || "—").toUpperCase()} • ${w.status === "pending" ? "⏳ পেন্ডিং" : w.status === "approved" ? "✓ অনুমোদিত" : "✕ বাতিল"}`,
          time: w.created_at, href: "/admin/withdrawals",
        });
      }
      for (const o of (orders.data ?? []) as Array<{id:string; status:string; created_at:string; packages?:{name?:string; price?:number}|null}>) {
        list.push({
          id: `od-${o.id}`, kind: "order",
          title: `${o.packages?.name || "প্যাকেজ"} অর্ডার`,
          subtitle: `৳${Number(o.packages?.price || 0).toLocaleString("bn-BD")} • ${o.status === "pending" ? "⏳ অনুমোদন প্রয়োজন" : o.status}`,
          time: o.created_at, href: "/admin/approvals",
        });
      }
      for (const u of (users.data ?? []) as Array<{id:string; full_name:string|null; user_code:string|null; created_at:string}>) {
        list.push({
          id: `u-${u.id}`, kind: "user",
          title: u.full_name || "নতুন ইউজার",
          subtitle: `রেজিস্ট্রেশন • ${u.user_code || ""}`,
          time: u.created_at, href: "/admin/users",
        });
      }
      const distUserIds = Array.from(new Set(((distActs.data ?? []) as Array<{user_id: string}>).map((x) => x.user_id)));
      const nameMap = new Map<string, string>();
      if (distUserIds.length) {
        const { data: names } = await supabase.from("profiles").select("id,full_name").in("id", distUserIds);
        (names ?? []).forEach((n) => nameMap.set(n.id, n.full_name || ""));
      }
      for (const a of (distActs.data ?? []) as Array<{id:string; user_id:string; event_type:string; meta:{count?:number; total_amount?:number}; created_at:string}>) {
        const kind: Notice["kind"] = a.event_type === "distributor_task_activated" ? "dist_activated" : "dist_generated";
        const who = nameMap.get(a.user_id) || "Distributor";
        const label = a.event_type === "distributor_task_activated" ? "✅ Activate করেছে" : "✨ AI দিয়ে তৈরি";
        list.push({
          id: `da-${a.id}`, kind,
          title: `${who} — ${label}`,
          subtitle: `${a.meta?.count ?? 0}টি task${a.meta?.total_amount ? ` • ৳${a.meta.total_amount}` : ""}`,
          time: a.created_at, href: "/admin/tasks/distributor-activity",
        });
      }
      list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setItems(list.slice(0, 25));
    } finally { setLoading(false); }
  }


  useEffect(() => {
    loadCount();
    const ch = supabase.channel(`notif-${Math.random().toString(36).slice(2,7)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "distributor_applications" }, () => { loadCount(); if (open) loadItems(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => { loadCount(); if (open) loadItems(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_packages" }, () => { loadCount(); if (open) loadItems(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="নোটিফিকেশন"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition hover:scale-[1.05]"
      >
        <Bell className="h-4 w-4" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold grid place-items-center ring-2 ring-white animate-pulse">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[360px] sm:w-[400px] max-h-[75vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-amber-100 border border-amber-200 flex flex-col">
          <div className="relative flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 ring-1 ring-white/40">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="bn-display text-sm leading-none">নোটিফিকেশন</p>
                <p className="text-[10px] text-white/80 mt-0.5">সর্বশেষ কার্যক্রম</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold ring-1 ring-white/40">
                {pendingCount} পেন্ডিং
              </span>
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 hover:bg-white/25">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="grid place-items-center py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-500">কোনো নোটিফিকেশন নেই</p>
            )}
            <ul className="divide-y divide-slate-100">
              {items.map((n) => {
                const s = KIND_STYLE[n.kind];
                return (
                  <li key={n.id}>
                    <Link
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-amber-50/60"
                    >
                      <span className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white bg-gradient-to-br shadow-md ring-1",
                        s.grad, s.ring,
                      )}>
                        <s.Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{n.title}</span>
                          <span className="shrink-0 text-[10px] font-bold text-slate-400 whitespace-nowrap">{timeAgo(n.time)}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{n.subtitle}</span>
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          {s.label}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t border-amber-100 bg-amber-50/50 px-2 py-2 grid grid-cols-3 gap-1.5">
            <Link onClick={() => setOpen(false)} to="/admin/distributors" className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50">আবেদন</Link>
            <Link onClick={() => setOpen(false)} to="/admin/withdrawals" className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">উইথড্র</Link>
            <Link onClick={() => setOpen(false)} to="/admin/approvals" className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] font-bold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50">অ্যাপ্রুভাল</Link>
          </div>
        </div>
      )}
    </div>
  );
}
