import fs from "node:fs";

const file = "src/components/panel/UserPanelLayout.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. In NAV array, filter out package
const oldNav = `const NAV: NavItem[] = [
  { to: "/dashboard",  label: "ড্যাশবোর্ড",  short: "হোম",    Icon: LayoutDashboard, from: "from-amber-400",   to_: "to-orange-500",  soft: "bg-amber-50",   dot: "bg-amber-500" },
  { to: "/tasks",      label: "আজকের টাস্ক", short: "টাস্ক",  Icon: ListChecks,      from: "from-indigo-500",  to_: "to-blue-700",    soft: "bg-indigo-50",  dot: "bg-indigo-500" },
  { to: "/community",  label: "কমিউনিটি",    short: "চ্যাট",  Icon: MessageCircle,   from: "from-teal-400",    to_: "to-cyan-600",    soft: "bg-teal-50",    dot: "bg-teal-500" },
  { to: "/packages",   label: "প্যাকেজ",     short: "প্যাকেজ", Icon: Package,         from: "from-fuchsia-400", to_: "to-purple-600",  soft: "bg-fuchsia-50", dot: "bg-fuchsia-500" },
  { to: "/withdraw",   label: "উইথড্র",      short: "উইথড্র",  Icon: ArrowDownToLine, from: "from-emerald-400", to_: "to-green-600",   soft: "bg-emerald-50", dot: "bg-emerald-500" },
  { to: "/referral",   label: "রেফারেল",     short: "রেফার",  Icon: Users,           from: "from-violet-400",  to_: "to-fuchsia-500", soft: "bg-violet-50",  dot: "bg-violet-500" },
  { to: "/profile",    label: "প্রোফাইল",    short: "প্রোফাইল", Icon: UserIcon,       from: "from-rose-400",    to_: "to-pink-500",    soft: "bg-rose-50",    dot: "bg-rose-500" },
];`;

const newNav = `const NAV: NavItem[] = [
  { to: "/dashboard",  label: "ড্যাশবোর্ড",  short: "হোম",    Icon: LayoutDashboard, from: "from-amber-400",   to_: "to-orange-500",  soft: "bg-amber-50",   dot: "bg-amber-500" },
  { to: "/tasks",      label: "বিজ্ঞাপন ও টাস্ক", short: "বিজ্ঞাপন",  Icon: ListChecks,      from: "from-amber-500",   to_: "to-orange-600",  soft: "bg-amber-50",   dot: "bg-amber-500" },
  { to: "/withdraw",   label: "উইথড্র",      short: "উইথড্র",  Icon: ArrowDownToLine, from: "from-emerald-400", to_: "to-green-600",   soft: "bg-emerald-50", dot: "bg-emerald-500" },
  { to: "/community",  label: "কমিউনিটি",    short: "চ্যাট",  Icon: MessageCircle,   from: "from-teal-400",    to_: "to-cyan-600",    soft: "bg-teal-50",    dot: "bg-teal-500" },
  { to: "/referral",   label: "রেফারেল",     short: "রেফার",  Icon: Users,           from: "from-violet-400",  to_: "to-fuchsia-500", soft: "bg-violet-50",  dot: "bg-violet-500" },
  { to: "/profile",    label: "প্রোফাইল",    short: "প্রোফাইল", Icon: UserIcon,       from: "from-rose-400",    to_: "to-pink-500",    soft: "bg-rose-50",    dot: "bg-rose-500" },
];`;

const oldBottom = `const bottomNav = (launched: boolean): NavItem[] =>
  launched
    ? [NAV[0], SPIN_ITEM, NAV[1], SHOP_ITEM, NAV[3], NAV[4]]
    : [NAV[0], SPIN_ITEM, NAV[1], NAV[3], NAV[4], NAV[6]];`;

const newBottom = `const bottomNav = (_launched: boolean): NavItem[] => [
  NAV[0],
  NAV[1],
  SPIN_ITEM,
  NAV[2],
  NAV[4],
  NAV[5],
];`;

const oldSide = `const sideNav = (launched: boolean): NavItem[] =>
  launched
    ? [NAV[0], SPIN_ITEM, LEADERBOARD_ITEM, NAV[1], SHOP_ITEM, ...NAV.slice(2), THEME_ITEM]
    : [NAV[0], SPIN_ITEM, LEADERBOARD_ITEM, ...NAV.slice(1), THEME_ITEM];`;

const newSide = `const sideNav = (_launched: boolean): NavItem[] => [
  NAV[0],
  NAV[1],
  SPIN_ITEM,
  LEADERBOARD_ITEM,
  ...NAV.slice(2),
  THEME_ITEM,
];`;

if (content.includes(oldNav)) {
  content = content.replace(oldNav, newNav);
}
if (content.includes(oldBottom)) {
  content = content.replace(oldBottom, newBottom);
}
if (content.includes(oldSide)) {
  content = content.replace(oldSide, newSide);
}

fs.writeFileSync(file, content, "utf-8");
console.log("Updated UserPanelLayout.tsx successfully");

