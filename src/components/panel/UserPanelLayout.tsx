import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListChecks, ArrowDownToLine, Package, MessageCircle,
  Users, User as UserIcon, ChevronRight, LogOut, Sparkles, Menu, X, Bell, Crown,
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
  { to: "/tasks",      label: "আজকের টাস্ক", short: "টাস্ক",  Icon: ListChecks,      from: "from-sky-400",     to_: "to-blue-500",    soft: "bg-sky-50",     dot: "bg-sky-500" },
  { to: "/community",  label: "কমিউনিটি",    short: "চ্যাট",  Icon: MessageCircle,   from: "from-cyan-400",    to_: "to-blue-500",    soft: "bg-cyan-50",    dot: "bg-cyan-500" },
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

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-rose-50/40">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 backdrop-blur px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="bn-display text-base leading-none">Smart Investor</p>
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
            <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white shadow-2xl">
              <div className="flex items-center justify-end p-2">
                <button onClick={() => setDrawerOpen(false)} aria-label="বন্ধ" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} pathname={pathname} />
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

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        <ul className="grid grid-cols-6">
          {BOTTOM_NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="relative flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium"
                >
                  {active && (
                    <span className={cn("absolute -top-1 h-1 w-7 rounded-full bg-gradient-to-r", item.from, item.to_)} />
                  )}
                  <span className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl transition",
                    active
                      ? cn("bg-gradient-to-br text-white shadow-lg scale-110", item.from, item.to_)
                      : "text-slate-500"
                  )}>
                    <item.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={cn(active ? "text-slate-900" : "text-slate-500")}>{item.short}</span>
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
  return (
    <div className="flex h-full flex-col p-4">
      {/* Brand */}
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-2xl px-2 py-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="bn-display text-lg leading-none">Smart Investor</p>
          <p className="text-[10px] font-semibold tracking-wider text-slate-500 mt-1">USER · PANEL</p>
        </div>
      </Link>

      {/* Mini profile */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/40 p-3 shadow-soft">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white shadow-md">
            SI
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">স্বাগতম 👋</p>
          <p className="truncate text-xs text-slate-500">প্রোফাইল সম্পূর্ণ করুন</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? cn(item.soft, "text-slate-900") : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {active && (
                <span className={cn("absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b", item.from, item.to_)} />
              )}
              <span className={cn(
                "grid h-9 w-9 place-items-center rounded-xl transition",
                active
                  ? cn("bg-gradient-to-br text-white shadow-md scale-105", item.from, item.to_)
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
              )}>
                <item.Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">{item.label}</span>
              {active ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <span className={cn("h-1.5 w-1.5 rounded-full opacity-40", item.dot)} />}
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
