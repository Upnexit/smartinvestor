import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ArrowDownToLine, Package, ShieldCheck, CreditCard,
  ListChecks, MessagesSquare, BarChart3, Activity, Settings, User as UserIcon,
  LogOut, Menu, X, Bell, Search, ChevronRight, Sparkles, Users2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";
import { useSiteSettings } from "@/hooks/use-site-settings";

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; accent: AccentKey };

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin",              label: "ড্যাশবোর্ড",         Icon: LayoutDashboard, accent: "amber" },
  { to: "/admin/users",        label: "ইউজার ম্যানেজমেন্ট",   Icon: Users,           accent: "sky" },
  { to: "/admin/distributors", label: "ডিস্ট্রিবিউটর",        Icon: Users2,          accent: "indigo" },
  { to: "/admin/withdrawals",  label: "উইথড্র রিকোয়েস্ট",     Icon: ArrowDownToLine, accent: "emerald" },
  { to: "/admin/packages",     label: "প্যাকেজ",            Icon: Package,         accent: "fuchsia" },
  { to: "/admin/approvals",    label: "পেমেন্ট অ্যাপ্রুভাল",   Icon: ShieldCheck,     accent: "orange" },
  { to: "/admin/payments",     label: "পেমেন্ট গেটওয়ে",      Icon: CreditCard,      accent: "pink" },
  { to: "/admin/tasks",        label: "টাস্ক লিংক",          Icon: ListChecks,      accent: "rose" },
  { to: "/admin/community",    label: "কমিউনিটি চ্যাট",      Icon: MessagesSquare,  accent: "purple" },
  { to: "/admin/support",      label: "সাপোর্ট চ্যাট",       Icon: MessagesSquare,  accent: "rose" },
  { to: "/admin/reports",      label: "রিপোর্ট",            Icon: BarChart3,       accent: "indigo" },
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
          <Link to="/admin/approvals" className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>
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
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="ইউজার / প্যাকেজ / ট্রানজেকশন..."
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-300/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      navigate({ to: "/admin/users", search: v ? { q: v } : {} });
                    }
                  }}
                />
              </div>
              <Link to="/admin/approvals" className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition hover:scale-[1.05]">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              </Link>
              <Link to="/admin/profile" className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg transition hover:scale-[1.05]">
                <UserIcon className="h-4 w-4" />
              </Link>
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
    <div className="flex h-full flex-col p-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 ring-1 ring-amber-200/70">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />
        <Link to="/admin" onClick={onNav} className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/40 overflow-hidden">
            {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="bn-display text-base text-slate-900 leading-none">{site.site_name}</p>
            <p className="text-[10px] font-bold tracking-[0.18em] text-orange-600 mt-1 flex items-center gap-1.5">
              ADMIN PANEL
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </Link>
      </div>

      <p className="px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">MENU</p>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {ADMIN_NAV.map((item) => {
          const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
          const a = ACCENTS[item.accent];
          return (
            <Link
              key={item.to} to={item.to} onClick={onNav}
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
              {active && <ChevronRight className="h-4 w-4 text-slate-500" />}
            </Link>
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
