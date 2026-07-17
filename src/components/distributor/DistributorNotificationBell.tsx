import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Users, ArrowDownToLine, Wallet, Users2, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  kind: "user" | "withdrawal" | "lead" | "earning";
  title: string;
  subtitle: string;
  time: string;
  href: string;
};

const KIND: Record<Notice["kind"], { grad: string; ring: string; Icon: typeof Bell; label: string }> = {
  user:       { grad: "from-sky-500 to-blue-600",       ring: "ring-sky-200",     Icon: Users,           label: "নতুন ইউজার" },
  withdrawal: { grad: "from-emerald-500 to-teal-600",   ring: "ring-emerald-200", Icon: ArrowDownToLine, label: "উইথড্র রিকোয়েস্ট" },
  lead:       { grad: "from-fuchsia-500 to-purple-600", ring: "ring-fuchsia-200", Icon: Users2,          label: "নতুন লিড" },
  earning:    { grad: "from-amber-500 to-orange-600",   ring: "ring-amber-200",   Icon: Wallet,          label: "কমিশন" },
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

export function DistributorNotificationBell({ canManageWithdrawals }: { canManageWithdrawals: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [pending, setPending] = useState(0);
  const [uid, setUid] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  async function loadCount() {
    if (!uid) return;
    if (canManageWithdrawals) {
      const { count } = await supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending");
      setPending(count ?? 0);
    } else {
      const [leads] = await Promise.all([
        supabase.from("distributor_leads").select("id", { count: "exact", head: true })
          .eq("distributor_id", uid).eq("status", "new"),
      ]);
      setPending(leads.count ?? 0);
    }
  }

  async function loadItems() {
    if (!uid) return;
    setLoading(true);
    try {
      const [users, leads, earnings, wds] = await Promise.all([
        supabase.from("profiles")
          .select("id,full_name,user_code,created_at")
          .eq("distributor_id", uid).order("created_at", { ascending: false }).limit(8),
        supabase.from("distributor_leads")
          .select("id,name,phone,status,created_at")
          .eq("distributor_id", uid).order("created_at", { ascending: false }).limit(6),
        supabase.from("distributor_earnings")
          .select("id,amount,source,created_at")
          .eq("distributor_id", uid).order("created_at", { ascending: false }).limit(6),
        canManageWithdrawals
          ? supabase.from("withdrawals")
              .select("id,amount,method,status,created_at,user_id")
              .order("created_at", { ascending: false }).limit(10)
          : Promise.resolve({ data: [] as Array<{id:string; amount:number; method:string|null; status:string; created_at:string}> }),
      ]);

      const list: Notice[] = [];
      for (const u of (users.data ?? []) as Array<{id:string; full_name:string|null; user_code:string|null; created_at:string}>) {
        list.push({
          id: `u-${u.id}`, kind: "user",
          title: u.full_name || "নতুন ইউজার",
          subtitle: `আপনার রেফারে যোগ দিয়েছেন • ${u.user_code || ""}`,
          time: u.created_at, href: "/distributor/users",
        });
      }
      for (const l of (leads.data ?? []) as Array<{id:string; name:string|null; phone:string|null; status:string; created_at:string}>) {
        list.push({
          id: `l-${l.id}`, kind: "lead",
          title: l.name || "নতুন লিড",
          subtitle: `${l.phone || "—"} • ${l.status}`,
          time: l.created_at, href: "/distributor/leads",
        });
      }
      for (const e of (earnings.data ?? []) as Array<{id:string; amount:number; source:string; created_at:string}>) {
        list.push({
          id: `e-${e.id}`, kind: "earning",
          title: `৳${Number(e.amount).toLocaleString("bn-BD")} কমিশন`,
          subtitle: e.source === "withdrawal_tax" ? "উইথড্র ট্যাক্স" : e.source === "package_commission" ? "প্যাকেজ কমিশন" : e.source,
          time: e.created_at, href: "/distributor/earnings",
        });
      }
      for (const w of (wds.data ?? []) as Array<{id:string; amount:number; method:string|null; status:string; created_at:string}>) {
        list.push({
          id: `w-${w.id}`, kind: "withdrawal",
          title: `৳${Number(w.amount).toLocaleString("bn-BD")} উইথড্র`,
          subtitle: `${(w.method || "—").toUpperCase()} • ${w.status === "pending" ? "⏳ পেন্ডিং" : w.status === "approved" ? "✓ অ্যাপ্রুভড" : w.status === "rejected" ? "✕ রিজেক্টেড" : w.status}`,
          time: w.created_at, href: "/distributor/withdrawals",
        });
      }

      list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setItems(list.slice(0, 25));
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!uid) return;
    loadCount();
    const ch = supabase.channel(`dist-notif-${Math.random().toString(36).slice(2,7)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles", filter: `distributor_id=eq.${uid}` }, () => { loadCount(); if (open) loadItems(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "distributor_leads", filter: `distributor_id=eq.${uid}` }, () => { loadCount(); if (open) loadItems(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "distributor_earnings", filter: `distributor_id=eq.${uid}` }, () => { if (open) loadItems(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => { if (canManageWithdrawals) { loadCount(); if (open) loadItems(); } })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, canManageWithdrawals]);

  useEffect(() => { if (open) loadItems(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);

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
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.05]"
      >
        <Bell className="h-4 w-4" />
        {pending > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold grid place-items-center ring-2 ring-white animate-pulse">
            {pending > 99 ? "99+" : pending}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] sm:w-[400px] max-h-[75vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-indigo-100 border border-indigo-200 flex flex-col">
          <div className="relative flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white">
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
              {pending > 0 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold ring-1 ring-white/40">
                  {pending} পেন্ডিং
                </span>
              )}
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
                const s = KIND[n.kind];
                return (
                  <li key={n.id}>
                    <Link
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 transition hover:bg-indigo-50/60"
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
        </div>
      )}
    </div>
  );
}
