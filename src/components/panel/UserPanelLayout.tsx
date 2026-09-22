import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ListChecks, ArrowDownToLine, Package, MessageCircle,
  Users, User as UserIcon, ChevronRight, LogOut, Sparkles, Menu, X, Bell, Crown, Home, LifeBuoy,
  ShoppingBag, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useLaunchFlag } from "@/hooks/use-launch-flag";
import { cn } from "@/lib/utils";
import { NoticeModal } from "@/components/panel/NoticeModal";
import { PushOptInBanner } from "@/components/panel/PushOptInBanner";
import { usePushSubscribe } from "@/hooks/use-push-subscribe";
import { applyPanelTheme, getPanelTheme } from "@/lib/panel-theme";
import { APP_VERSION } from "@/config/version";

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

const SPIN_ITEM: NavItem = {
  to: "/spin", label: "স্পিন ইনকাম", short: "স্পিন", Icon: Sparkles,
  from: "from-rose-500", to_: "to-amber-500", soft: "bg-rose-50", dot: "bg-rose-500",
};

// Staged for the big re-launch — hidden until the launch switch is on.
const SHOP_ITEM: NavItem = {
  to: "/shop", label: "শপ", short: "শপ", Icon: ShoppingBag,
  from: "from-purple-500", to_: "to-fuchsia-700", soft: "bg-purple-50", dot: "bg-purple-500",
};

const THEME_ITEM: NavItem = {
  to: "/theme", label: "থিম কাস্টমাইজ", short: "থিম", Icon: Palette,
  from: "from-cyan-400", to_: "to-sky-600", soft: "bg-cyan-50", dot: "bg-cyan-500",
};

const sideNav = (launched: boolean): NavItem[] =>
  launched
    ? [NAV[0], SPIN_ITEM, NAV[1], SHOP_ITEM, ...NAV.slice(2), THEME_ITEM]
    : [NAV[0], SPIN_ITEM, ...NAV.slice(1), THEME_ITEM];

const bottomNav = (launched: boolean): NavItem[] =>
  launched
    ? [NAV[0], SPIN_ITEM, NAV[1], SHOP_ITEM, NAV[3], NAV[4]]
    : [NAV[0], SPIN_ITEM, NAV[1], NAV[3], NAV[4], NAV[6]];

export function UserPanelLayout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { launched } = useLaunchFlag();
  const BOTTOM_NAV = bottomNav(launched);
  const activeItem = sideNav(launched).find((n) => pathname.startsWith(n.to)) ?? NAV[0];
  const navigate = useNavigate();
  const site = useSiteSettings();
  const { status: pushStatus, busy: pushBusy, subscribe: pushSubscribe } = usePushSubscribe();

  // ইউজারের সেভ করা থিম প্যানেলে অ্যাপ্লাই
  useEffect(() => { applyPanelTheme(getPanelTheme()); }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleBellClick() {
    if (pushBusy) return;
    if (pushStatus === "subscribed" || pushStatus === "granted") {
      toast.success("নোটিফিকেশন ইতিমধ্যেই চালু আছে ✅");
      return;
    }
    if (pushStatus === "denied") {
      toast.error("ব্রাউজার সেটিংস থেকে notification অনুমতি দিন");
      return;
    }
    if (pushStatus === "unsupported") {
      toast.info("এই ব্রাউজারে notification সাপোর্ট নেই");
      return;
    }
    if (pushStatus === "blocked-preview") {
      toast.info("Preview-এ কাজ করে না — published অ্যাপে খুলুন");
      return;
    }
    const r = await pushSubscribe();
    if (r.ok) toast.success("নোটিফিকেশন চালু হয়েছে ✅");
    else if (r.reason === "permission") toast.error("অনুমতি না দিলে notification আসবে না");
    else toast.error("Notification চালু করা যায়নি");
  }

  const showBellDot = pushStatus === "default";

  return (
    <div className="panel-themed min-h-screen">
      {/* Mobile top bar */}
      <header className="panel-chrome sticky top-0 z-30 flex items-center justify-between border-b backdrop-blur px-4 py-3 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="panel-brand grid h-9 w-9 place-items-center rounded-xl shadow-lg overflow-hidden bg-white p-0.5">
            <img src="/logo.png" alt="Smart Click BD" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="bn-display panel-chrome-fg text-base leading-none">Smart Click BD</p>
            <p className="panel-chrome-muted text-[10px] mt-0.5">USER · PANEL</p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleBellClick}
            disabled={pushBusy}
            className="panel-chrome-fg relative grid h-9 w-9 place-items-center rounded-xl hover:bg-black/5 disabled:opacity-60"
            aria-label="নোটিফিকেশন চালু করুন"
          >
            <Bell className="h-5 w-5" />
            {showBellDot && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>
          <Link
            to="/support"
            aria-label="সাপোর্ট"
            className="panel-brand grid h-9 w-9 place-items-center rounded-xl shadow-lg hover:scale-105 transition"
          >
            <LifeBuoy className="h-5 w-5" />
          </Link>
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
        <aside className="panel-chrome sticky top-0 hidden h-screen w-72 shrink-0 border-r backdrop-blur lg:block">

          <SidebarContent onNavigate={() => {}} onLogout={handleLogout} pathname={pathname} />
        </aside>

        {/* Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <aside className="panel-chrome absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col shadow-2xl">
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
          <PushOptInBanner />
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — gradient background, always-colorful icons */}
      <nav className="panel-navbar fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] lg:hidden">
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
                  <span className={cn("transition-colors", active ? "panel-chrome-fg" : "panel-chrome-muted")}>{item.short}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <NoticeModal />
    </div>
  );
}

function SidebarContent({
  onNavigate, onLogout, pathname,
}: { onNavigate: () => void; onLogout: () => void; pathname: string }) {
  const site = useSiteSettings();
  const { launched } = useLaunchFlag();
  return (
    <div className="flex h-full flex-col p-4">
      {/* Brand */}
      <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-2xl px-2 py-2">
        <div className="panel-brand grid h-11 w-11 place-items-center rounded-2xl shadow-lg overflow-hidden bg-white p-1">
          <img src="/logo.png" alt="Smart Click BD" className="h-full w-full object-contain" />
        </div>
        <div>
          <p className="bn-display panel-chrome-fg text-lg leading-none">Smart Click BD</p>
          <p className="panel-chrome-muted text-[10px] font-semibold tracking-wider mt-1">USER · PANEL</p>
        </div>
      </Link>

      {/* Nav — neutral row, gradient icon tile, professional hover */}
      <nav className="mt-5 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sideNav(launched).map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
                active
                  ? "panel-chrome-fg bg-black/5 ring-1 ring-black/10 shadow-soft"
                  : "panel-chrome-muted hover:bg-black/5 hover:-translate-y-0.5",
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

        {/* Home — placed inside the scroll area so it scrolls with the rest */}
        <Link
          to="/"
          onClick={onNavigate}
          className="group relative mt-2 flex items-center gap-3 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Home className="h-[18px] w-[18px]" />
          </span>
          <span className="relative flex-1">হোম পেজ</span>
          <ChevronRight className="relative h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>

        {/* Promo inside scrollable area */}
        <div className="mt-3 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 p-3.5 text-white shadow-pop">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4" />
            <p className="bn-display text-xs font-bold">প্রিমিয়াম আনলক</p>
          </div>
          <p className="mt-1 text-[11px] text-white/90">আপগ্রেড করে ৫× আয় বাড়ান</p>
          <Link to="/packages" onClick={onNavigate} className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur px-2.5 py-1 text-xs font-semibold hover:bg-white/30 transition">
            এখনই আপগ্রেড <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Logout — inside scroll area */}
        <div className="pt-2 mt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50/80 via-pink-50/40 to-red-50/60 px-3 py-2.5 text-sm font-bold text-rose-700 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-rose-100/70"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            <span className="relative flex-1 text-left font-bold text-rose-700">লগআউট</span>
            <ChevronRight className="relative h-4 w-4 text-rose-400 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </div>
      </nav>

      {/* Version Section — Bold & Professional UI replacing old logout location */}
      <div className="mt-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 p-3 shadow-sm ring-1 ring-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider text-slate-900 uppercase">
              SMART CLICK BD
            </span>
          </div>
          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
            v{APP_VERSION}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between pt-2 border-t border-indigo-100/70">
          <span className="text-[11px] font-medium text-slate-600">
            সিস্টেম: আপ-টু-ডেট
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
            অনলাইন ✓
          </span>
        </div>
      </div>
    </div>
  );
}
