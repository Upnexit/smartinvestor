import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Wallet, User as UserIcon, MessagesSquare,
  LogOut, Menu, X, ChevronRight, Sparkles, ArrowDownToLine, ListChecks, Users2, Headphones,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ACCENTS, type AccentKey } from "@/lib/admin-accents";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { usePresenceBroadcast } from "@/hooks/use-presence-broadcast";
import { DistributorNotificationBell } from "@/components/distributor/DistributorNotificationBell";
import { DistributorLiveSearch } from "@/components/distributor/DistributorLiveSearch";

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; accent: AccentKey; requiresWithdrawAccess?: boolean };

const NAV_BASE: NavItem[] = [
  { to: "/distributor",             label: "ড্যাশবোর্ড",     Icon: LayoutDashboard, accent: "indigo" },
  { to: "/distributor/tasks",       label: "Task Management", Icon: ListChecks,      accent: "fuchsia" },
  { to: "/distributor/leads",       label: "লিড / CRM",       Icon: Users2,          accent: "sky" },
  { to: "/distributor/users",       label: "আমার ইউজার",     Icon: Users,           accent: "sky" },
  { to: "/distributor/earnings",    label: "কমিশন ও আয়",     Icon: Wallet,          accent: "emerald" },
  { to: "/distributor/withdrawals", label: "উইথড্র ম্যানেজ",   Icon: ArrowDownToLine, accent: "emerald", requiresWithdrawAccess: true },
  { to: "/distributor/withdraw",    label: "নিজের উইথড্র",   Icon: ArrowDownToLine, accent: "rose" },
  { to: "/distributor/support",     label: "সাপোর্ট চ্যাট",   Icon: MessagesSquare,  accent: "fuchsia" },
  { to: "/distributor/profile",     label: "প্রোফাইল",       Icon: UserIcon,        accent: "purple" },
];

const BOTTOM_NAV: { to: string; short: string; Icon: typeof LayoutDashboard; accent: AccentKey }[] = [
  { to: "/distributor",          short: "হোম",     Icon: LayoutDashboard, accent: "indigo" },
  { to: "/distributor/tasks",    short: "টাস্ক",   Icon: ListChecks,      accent: "fuchsia" },
  { to: "/distributor/leads",    short: "লিড",     Icon: Users2,          accent: "sky" },
  { to: "/distributor/earnings", short: "আয়",      Icon: Wallet,          accent: "emerald" },
  { to: "/distributor/profile",  short: "প্রোফাইল", Icon: UserIcon,        accent: "purple" },
];

export function DistributorLayout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const site = useSiteSettings();
  const [uid, setUid] = useState<string | null>(null);
  const [canManageWithdrawals, setCanManageWithdrawals] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    supabase.from("distributors").select("can_manage_withdrawals,status").eq("user_id", uid).maybeSingle()
      .then(({ data }) => {
        const d = data as { can_manage_withdrawals?: boolean; status?: string } | null;
        setCanManageWithdrawals(!!d?.can_manage_withdrawals && (d?.status ?? "active") === "active");
      });
  }, [uid]);

  usePresenceBroadcast(uid);
  useEffect(() => { setDrawer(false); }, [pathname]);

  const NAV = NAV_BASE.filter((n) => !n.requiresWithdrawAccess || canManageWithdrawals);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-violet-50/40">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-indigo-200/70 bg-white/90 backdrop-blur px-3 py-2 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link to="/distributor" className="flex items-center gap-2 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 overflow-hidden">
              {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="bn-display text-sm leading-none truncate">{site.site_name}</p>
              <p className="text-[9px] font-bold tracking-widest text-indigo-600 mt-0.5">DISTRIBUTOR</p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link to="/distributor/support" aria-label="সাপোর্ট"
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg">
              <HeadphonesIcon className="h-4 w-4" />
            </Link>
            <DistributorNotificationBell canManageWithdrawals={canManageWithdrawals} />
            <button onClick={() => setDrawer(true)} aria-label="মেনু"
              className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <DistributorLiveSearch />
        </div>
      </header>

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-indigo-200/70 bg-white/95 backdrop-blur lg:block">
          <SidebarBody nav={NAV} pathname={pathname} onNav={() => {}} onLogout={logout} />
        </aside>

        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDrawer(false)} />
            <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white shadow-2xl overflow-y-auto">
              <div className="flex justify-end p-2">
                <button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <SidebarBody nav={NAV} pathname={pathname} onNav={() => setDrawer(false)} onLogout={logout} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 pb-24 lg:pb-6">
          {/* Desktop top bar */}
          <div className="sticky top-0 z-20 hidden lg:block border-b border-indigo-200/70 bg-white/85 backdrop-blur">
            <div className="mx-auto grid h-[60px] max-w-6xl grid-cols-[1fr_minmax(0,560px)_1fr] items-center gap-3 px-6">
              <div />
              <div className="flex justify-center"><DistributorLiveSearch /></div>
              <div className="flex items-center justify-end gap-2">
                <Link to="/distributor/support" aria-label="সাপোর্ট"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg transition hover:scale-[1.05]">
                  <HeadphonesIcon className="h-4 w-4" />
                </Link>
                <DistributorNotificationBell canManageWithdrawals={canManageWithdrawals} />
                <Link to="/distributor/profile" aria-label="প্রোফাইল"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg transition hover:scale-[1.05]">
                  <UserIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 space-y-4">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/40 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 backdrop-blur-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] lg:hidden">
        <ul className="grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const active = item.to === "/distributor" ? pathname === "/distributor" : pathname.startsWith(item.to);
            const a = ACCENTS[item.accent];
            return (
              <li key={item.to}>
                <Link to={item.to} className="relative flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold">
                  {active && <span className={cn("absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r shadow-md", a.chip)} />}
                  <span className={cn(
                    "grid h-10 w-10 place-items-center rounded-[14px] text-white bg-gradient-to-br shadow-md transition-all duration-300",
                    a.chip, a.glow,
                    active ? "scale-110 ring-2 ring-white shadow-lg saturate-150 -translate-y-0.5" : "saturate-110 hover:scale-105",
                  )}>
                    <item.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={cn("transition-colors", active ? "text-slate-900" : "text-slate-600")}>{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function SidebarBody({ nav, pathname, onNav, onLogout }: { nav: NavItem[]; pathname: string; onNav: () => void; onLogout: () => void }) {
  const site = useSiteSettings();
  return (
    <div className="flex h-full flex-col p-3">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-3 ring-1 ring-indigo-200/70">
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-600" />
        <Link to="/distributor" onClick={onNav} className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 text-white shadow-lg shadow-indigo-500/40 overflow-hidden">
            {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <p className="bn-display text-base text-slate-900 leading-none">{site.site_name}</p>
            <p className="text-[10px] font-bold tracking-[0.18em] text-indigo-600 mt-1 flex items-center gap-1.5">
              DISTRIBUTOR PANEL
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
          </div>
        </Link>
      </div>

      <p className="px-2 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">MENU</p>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {nav.map((item) => {
          const active = item.to === "/distributor" ? pathname === "/distributor" : pathname.startsWith(item.to);
          const a = ACCENTS[item.accent];
          return (
            <Link key={item.to} to={item.to} onClick={onNav}
              className={cn("group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-all duration-300",
                active ? cn(a.soft, "text-slate-900 translate-x-0.5 ring-1", a.ring) : "text-slate-600 hover:bg-slate-50")}>
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white bg-gradient-to-br shadow-md transition-all duration-300",
                a.chip, a.glow, active ? "scale-105" : "opacity-90 group-hover:scale-105")}>
                <item.Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4 text-slate-500" />}
            </Link>
          );
        })}
      </nav>

      <button onClick={onLogout} className="mt-3 flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 hover:translate-x-0.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/40">
          <LogOut className="h-[18px] w-[18px]" />
        </span>
        লগআউট
      </button>
    </div>
  );
}
