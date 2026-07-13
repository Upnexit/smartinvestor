import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ArrowDownToLine, Package, ShieldCheck, CreditCard,
  ListChecks, MessagesSquare, BarChart3, Activity, Settings, User as UserIcon,
  LogOut, Menu, X, Search, ChevronRight, ChevronDown, Sparkles, Users2, Loader2, Smartphone, Megaphone,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { NotificationBell } from "@/components/admin/NotificationBell";

type NavChild = { to: string; label: string; Icon: typeof LayoutDashboard };
type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; accent: AccentKey; children?: NavChild[] };

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin",              label: "ড্যাশবোর্ড",         Icon: LayoutDashboard, accent: "amber" },
  { to: "/admin/users",        label: "ইউজার ম্যানেজমেন্ট",   Icon: Users,           accent: "sky" },
  { to: "/admin/distributors", label: "ডিস্ট্রিবিউটর",        Icon: Users2,          accent: "indigo" },
  { to: "/admin/withdrawals",  label: "উইথড্র রিকোয়েস্ট",     Icon: ArrowDownToLine, accent: "emerald" },
  { to: "/admin/packages",     label: "প্যাকেজ",            Icon: Package,         accent: "fuchsia" },
  { to: "/admin/approvals",    label: "পেমেন্ট অ্যাপ্রুভাল",   Icon: ShieldCheck,     accent: "orange" },
  { to: "/admin/payments",     label: "পেমেন্ট গেটওয়ে",      Icon: CreditCard,      accent: "pink" },
  { to: "/admin/tasks",        label: "টাস্ক লিংক",          Icon: ListChecks,      accent: "rose",
    children: [
      { to: "/admin/tasks/daily-report", label: "দৈনিক রিপোর্ট", Icon: CalendarDays },
    ] },
  { to: "/admin/community",    label: "কমিউনিটি চ্যাট",      Icon: MessagesSquare,  accent: "purple" },
  { to: "/admin/notices",      label: "নোটিশ ম্যানেজমেন্ট",   Icon: Megaphone,       accent: "fuchsia" },
  { to: "/admin/support",      label: "সাপোর্ট চ্যাট",       Icon: MessagesSquare,  accent: "rose" },
  { to: "/admin/reports",      label: "রিপোর্ট",            Icon: BarChart3,       accent: "indigo" },
  { to: "/admin/app-installs", label: "অ্যাপ ইনস্টল",         Icon: Smartphone,      accent: "cyan" },
  { to: "/admin/monitor",      label: "সিস্টেম মনিটর",       Icon: Activity,        accent: "lime" },
  { to: "/admin/settings",     label: "হোমপেজ সেটিংস",       Icon: Settings,        accent: "teal" },
  { to: "/admin/profile",      label: "অ্যাডমিন প্রোফাইল",     Icon: UserIcon,        accent: "slate" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const site = useSiteSettings();

  useEffect(() => { setDrawer(false); }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-app">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-amber-200/70 bg-white/90 backdrop-blur px-3 py-2.5 lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/40 overflow-hidden">
            {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <p className="bn-display text-sm leading-none">{site.site_name}</p>
            <p className="text-[9px] font-bold tracking-widest text-orange-600 mt-0.5">ADMIN</p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button onClick={() => setDrawer(true)} aria-label="মেনু খুলুন"
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-amber-200/70 bg-white/95 backdrop-blur lg:block">
          <SidebarBody pathname={pathname} onNav={() => {}} onLogout={handleLogout} />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white shadow-2xl overflow-y-auto">
              <div className="flex justify-end p-2">
                <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <SidebarBody pathname={pathname} onNav={() => setDrawer(false)} onLogout={handleLogout} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1">
          {/* Desktop top bar */}
          <div className="sticky top-0 z-20 hidden lg:block border-b border-amber-200/70 bg-white/85 backdrop-blur">
            <div className="mx-auto grid h-[60px] max-w-7xl grid-cols-[1fr_minmax(0,560px)_1fr] items-center gap-3 px-6">
              {/* left spacer */}
              <div />
              {/* centered search */}
              <div className="flex justify-center">
                <AdminLiveSearch />
              </div>
              {/* right actions */}
              <div className="flex items-center justify-end gap-2">
                <NotificationBell />
                <Link to="/admin/profile" aria-label="প্রোফাইল" className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg transition hover:scale-[1.05]">
                  <UserIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>


          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({
  pathname, onNav, onLogout,
}: { pathname: string; onNav: () => void; onLogout: () => void }) {
  const site = useSiteSettings();
  return (
    <div className="flex h-full flex-col p-3 min-h-0">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 px-2.5 ring-1 ring-amber-200/70 h-[60px] shrink-0 flex items-center">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
        <Link to="/admin" onClick={onNav} className="flex items-center gap-2 min-w-0 w-full">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-md shadow-orange-500/40 overflow-hidden">
            {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div className="min-w-0 leading-tight flex-1">
            <p className="bn-display text-[14px] text-slate-900 leading-none truncate">{site.site_name}</p>
          </div>
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
        </Link>
      </div>


      <p className="px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 shrink-0">MENU</p>
      <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto pr-1">
        {ADMIN_NAV.map((item) => {
          const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
          const a = ACCENTS[item.accent];
          const hasChildren = !!item.children?.length;
          return (
            <div key={item.to}>
              <Link
                to={item.to} onClick={onNav}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-300",
                  active ? cn(a.soft, "text-slate-900 translate-x-0.5 ring-1", a.ring) : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <span className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white bg-gradient-to-br shadow-md transition-all duration-300",
                  a.chip, a.glow,
                  active ? "scale-105" : "opacity-90 group-hover:scale-105",
                )}>
                  <item.Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {hasChildren ? (
                  active ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />
                ) : (active && <ChevronRight className="h-4 w-4 text-slate-500" />)}
              </Link>
              {hasChildren && active && (
                <div className="ml-6 mt-1 mb-1 space-y-0.5 border-l-2 border-rose-200 pl-2">
                  {item.children!.map((c) => {
                    const cActive = pathname === c.to || pathname.startsWith(c.to + "/");
                    return (
                      <Link key={c.to} to={c.to} onClick={onNav}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition",
                          cActive
                            ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm"
                            : "text-slate-600 hover:bg-rose-50 hover:text-rose-700",
                        )}>
                        <c.Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button onClick={onLogout}
        className="mt-3 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 hover:translate-x-0.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/40">
          <LogOut className="h-[18px] w-[18px]" />
        </span>
        লগআউট
      </button>
    </div>
  );
}

type SearchRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  user_code: string | null;
  avatar_url: string | null;
};

function AdminLiveSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (!t) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const esc = t.replace(/[%,()]/g, "");
      const parts = [
        `full_name.ilike.%${esc}%`,
        `email.ilike.%${esc}%`,
        `phone.ilike.%${esc}%`,
        `user_code.ilike.%${esc}%`,
        `referral_code.ilike.%${esc}%`,
      ].join(",");
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,user_code,avatar_url")
        .or(parts)
        .limit(8);
      setRows((data ?? []) as SearchRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const t = q.trim();

  return (
    <div ref={boxRef} className="relative w-full max-w-[560px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="নাম, ফোন, ইউজার আইডি দিয়ে সার্চ..."
        className="w-full rounded-xl border border-amber-200 bg-amber-50/30 pl-9 pr-9 py-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-300/40"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            navigate({ to: "/admin/users", search: t ? { q: t } : {} });
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-orange-500" />}

      {open && t && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-amber-200 bg-white/95 backdrop-blur-xl shadow-2xl shadow-orange-500/10 ring-1 ring-amber-100">
          {loading && rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">খুঁজছি...</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">কোনো ফলাফল নেই</p>
          )}
          {rows.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                ইউজার ({rows.length})
              </p>
              <ul className="pb-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => {
                        navigate({ to: "/admin/users/$id", params: { id: r.id } });
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-amber-50"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white">
                        {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : (r.full_name || r.email || "U").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {r.full_name || "নামহীন"}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {[r.user_code, r.phone, r.email].filter(Boolean).join(" • ")}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { navigate({ to: "/admin/users", search: { q: t } }); setOpen(false); }}
                className="block w-full border-t border-amber-100 bg-amber-50/50 px-4 py-2.5 text-center text-xs font-semibold text-orange-700 hover:bg-amber-50"
              >
                সব ফলাফল দেখুন →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
