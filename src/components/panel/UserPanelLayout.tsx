import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListChecks, ArrowDownToLine, Package, MessageCircle,
  Users, User as UserIcon, ChevronRight, LogOut, Sparkles, Menu, X, Bell, Crown, Home,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  short: string;
  Icon: typeof LayoutDashboard;
  from: string;
  to_: string;
  soft: string;
  dot: string;
};

const NAV: NavItem[] = [
  { to: "/dashboard",  label: "ড্যাশবোর্ড",  short: "হোম",    Icon: LayoutDashboard, from: "from-amber-400",   to_: "to-orange-500",  soft: "bg-amber-50",   dot: "bg-amber-500" },
  { to: "/tasks",      label: "আজকের টাস্ক", short: "টাস্ক",  Icon: ListChecks,      from: "from-indigo-500",  to_: "to-blue-700",    soft: "bg-indigo-50",  dot: "bg-indigo-500" },
  { to: "/community",  label: "কমিউনিটি",    short: "চ্যাট",  Icon: MessageCircle,   from: "from-teal-400",    to_: "to-cyan-600",    soft: "bg-teal-50",    dot: "bg-teal-500" },
  { to: "/packages",   label: "প্যাকেজ",     short: "প্যাকেজ", Icon: Package,         from: "from-fuchsia-400", to_: "to-purple-600",  soft: "bg-fuchsia-50", dot: "bg-fuchsia-500" },
  { to: "/withdraw",   label: "উইথড্র",      short: "উইথড্র",  Icon: ArrowDownToLine, from: "from-emerald-400", to_: "to-green-600",   soft: "bg-emerald-50", dot: "bg-emerald-500" },
  { to: "/referral",   label: "রেফারেল",     short: "রেফার",  Icon: Users,           from: "from-violet-400",  to_: "to-fuchsia-500", soft: "bg-violet-50",  dot: "bg-violet-500" },
  { to: "/profile",    label: "প্রোফাইল",    short: "প্রোফাইল", Icon: UserIcon,       from: "from-rose-400",    to_: "to-pink-500",    soft: "bg-rose-50",    dot: "bg-rose-500" },
];

const BOTTOM_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4], NAV[6]];

export function UserPanelLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeItem = NAV.find((n) => pathname.startsWith(n.to)) ?? NAV[0];
  const navigate = useNavigate();
  const site = useSiteSettings();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 backdrop-blur px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg overflow-hidden">
            {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <p className="bn-display text-base leading-none">{site.site_name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">USER · PANEL</p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <button className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="নোটিফিকেশন">
            <Bell className="h-5 w-5" />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="মেনু খুলুন"
            className={cn("grid h-9 w-9 place-items-center rounded-xl text-white shadow-lg bg-gradient-to-br", activeItem.from, activeItem.to_)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white/85 backdrop-blur lg:block">
          <SidebarContent onNavigate={() => {}} onLogout={handleLogout} pathname={pathname} />
        </aside>

        {/* Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-end p-2">
                <button onClick={() => setDrawerOpen(false)} aria-label="বন্ধ" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
                <SidebarContent onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} pathname={pathname} />
              </div>
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — gradient background, always-colorful icons */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/40 bg-gradient-to-r from-amber-50 via-rose-50 to-cyan-50 backdrop-blur-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)] lg:hidden">
        <ul className="grid grid-cols-6">
          {BOTTOM_NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="relative flex flex-col items-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold"
                >
                  {active && (
                    <span className={cn("absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r shadow-md", item.from, item.to_)} />
                  )}
                  <span className={cn(
                    "grid h-10 w-10 place-items-center rounded-[14px] text-white bg-gradient-to-br shadow-md transition-all duration-300",
                    item.from, item.to_,
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

function SidebarContent({
  onNavigate, onLogout, pathname,
}: { onNavigate: () => void; onLogout: () => void; pathname: string }) {
  const site = useSiteSettings();
  return (
    <div className="flex h-full flex-col p-4">
      {/* Brand */}
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-2xl px-2 py-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg overflow-hidden">
          {site.logo_url ? <img src={site.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6" />}
        </div>
        <div>
          <p className="bn-display text-lg leading-none">{site.site_name}</p>
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 mt-1">USER · PANEL</p>
        </div>
      </Link>

      {/* Home — go back to the public website */}
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-4 group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      >
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
          <Home className="h-[18px] w-[18px]" />
        </span>
        <span className="relative flex-1">হোম পেজ</span>
        <ChevronRight className="relative h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-0.5" />
      </Link>

      {/* Nav — neutral row, gradient icon tile, professional hover */}
      <nav className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                active
                  ? "bg-slate-900/[0.04] text-slate-900 ring-1 ring-slate-200 shadow-soft"
                  : "text-slate-700 hover:bg-slate-50 hover:-translate-y-0.5",
              )}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/60 to-white/0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
              <span className={cn(
                "relative grid h-9 w-9 place-items-center rounded-xl text-white shadow-md bg-gradient-to-br transition-all duration-300",
                item.from, item.to_,
                "group-hover:rotate-6 group-hover:scale-110 group-hover:shadow-lg group-hover:saturate-150",
                active && "ring-2 ring-white scale-105",
              )}>
                <item.Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="relative flex-1">{item.label}</span>
              <ChevronRight className={cn("relative h-4 w-4 transition-all duration-300", active ? "translate-x-0 text-slate-700" : "-translate-x-1 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
            </Link>
          );
        })}
      </nav>

      {/* Promo */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 p-4 text-white shadow-pop">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          <p className="bn-display text-sm">প্রিমিয়াম আনলক</p>
        </div>
        <p className="mt-1 text-xs text-white/90">আপগ্রেড করে ৫× আয় বাড়ান</p>
        <Link to="/packages" onClick={onNavigate} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-semibold hover:bg-white/30">
          এখনই আপগ্রেড <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mt-3 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-gradient-to-r hover:from-rose-500 hover:to-pink-500 hover:text-white hover:border-transparent transition"
      >
        <LogOut className="h-4 w-4" />
        লগআউট
      </button>
    </div>
  );
}
