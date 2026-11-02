import fs from "node:fs";

const file = "src/routes/_authenticated/dashboard.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. Replace quick actions to remove package and highlight ad tasks
const oldQuick = `  const quick = [
    { to: "/spin",     Icon: Sparkles,        label: "লাকি স্পিন",   desc: "ফ্রি ক্যাশ",  from: "from-rose-500",    to_: "to-amber-500" },
    { to: "/tasks",    Icon: ListChecks,      label: "আজকের টাস্ক", desc: "ইনকাম শুরু",  from: "from-sky-400",     to_: "to-blue-600" },
    { to: "/withdraw", Icon: ArrowDownToLine, label: "উইথড্র",       desc: "টাকা তুলুন",  from: "from-emerald-400", to_: "to-green-600" },
    { to: "/packages", Icon: Package,         label: "প্যাকেজ",      desc: "আপগ্রেড",    from: "from-fuchsia-400", to_: "to-purple-600" },
    { to: "/referral", Icon: Users,           label: "রেফারেল",      desc: "৫% কমিশন",  from: "from-violet-400",  to_: "to-fuchsia-500" },
  ];`;

const newQuick = `  const quick = [
    { to: "/tasks",    Icon: ListChecks,      label: "বিজ্ঞাপন দেখুন", desc: "ফ্রি আয়",   from: "from-amber-500",   to_: "to-orange-600" },
    { to: "/spin",     Icon: Sparkles,        label: "লাকি স্পিন",   desc: "বোনাস ক্যাশ", from: "from-rose-500",    to_: "to-amber-500" },
    { to: "/withdraw", Icon: ArrowDownToLine, label: "উইথড্র",       desc: "টাকা তুলুন",  from: "from-emerald-400", to_: "to-green-600" },
    { to: "/referral", Icon: Users,           label: "রেফারেল",      desc: "৫% কমিশন",  from: "from-violet-400",  to_: "to-fuchsia-500" },
  ];`;

if (content.includes(oldQuick)) {
  content = content.replace(oldQuick, newQuick);
}

// 2. Replace the package promotion banner with an Ad Earning banner
const oldBanner = `      {/* Promotion — different copy for no-package vs. upgrade-available */}
      {(hasActivePackage === false || canUpgrade) && (
        <Link
          to="/packages"
          className="group relative block overflow-hidden rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-400 via-fuchsia-500 to-emerald-500 shadow-pop"
        >
          <div className="relative flex items-center gap-4 rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-slate-900 via-indigo-950 to-fuchsia-950 p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-2xl" />
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-white/20">
              <Crown className="h-6 w-6" />
            </div>
            <div className="relative min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                {canUpgrade ? "UPGRADE OFFER" : "SPECIAL OFFER"}
              </p>
              <p className="bn-display truncate text-base text-white sm:text-lg">
                {canUpgrade
                  ? "আরো আয় বাড়াতে প্যাকেজ upgrade করুন"
                  : "প্যাকেজ ক্রয় করুন — দৈনিক টাস্ক শুরু করুন"}
              </p>
              <p className="mt-0.5 text-xs text-white/75">
                {canUpgrade
                  ? "উপরের প্যাকেজে দৈনিক আয় ও টাস্ক লিমিট অনেক বেশি"
                  : "৬০ দিনে ১১০% পর্যন্ত রিটার্ন · ইনকাম শুরু করুন"}
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-white text-amber-700 px-3 py-2 text-xs font-bold shadow-md transition group-hover:translate-x-1">
              {canUpgrade ? "আপগ্রেড করুন" : "প্যাকেজ দেখুন"} <ChevronRight className="h-3.5 w-3.5" />
            </span>
            <span className="sm:hidden grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-700 shadow-md">
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </Link>
      )}`;

const newBanner = `      {/* Direct Ad Earning Banner */}
      <Link
        to="/tasks"
        className="group relative block overflow-hidden rounded-3xl p-[1.5px] bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-500 shadow-pop"
      >
        <div className="relative flex items-center gap-4 rounded-[calc(1.5rem-1.5px)] bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-orange-500/20 blur-2xl" />
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-white/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
              দৈনিক ফ্রি ইনকাম
            </p>
            <p className="bn-display truncate text-base text-white sm:text-lg">
              কোনো ইনভেস্ট ছাড়াই বিজ্ঞাপন দেখে আয় করুন!
            </p>
            <p className="mt-0.5 text-xs text-white/75">
              প্রতিদিন ৫০টি বিজ্ঞাপন দেখে সরাসরি টাকা তুলুন bKash/Nagad-এ।
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 px-3.5 py-2 text-xs font-bold shadow-md transition group-hover:translate-x-1">
            বিজ্ঞাপন দেখুন <ChevronRight className="h-3.5 w-3.5" />
          </span>
          <span className="sm:hidden grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-md">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </Link>`;

if (content.includes(oldBanner)) {
  content = content.replace(oldBanner, newBanner);
}

// 3. Remove bottom package upgrade notice if present
const oldBottomNotice = `      {hasActivePackage === false ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 p-4 text-sm text-amber-900 flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
          <span>নতুন গ্রাহকদের জন্য বিশেষ সুযোগ: প্রথমবার রেজিস্ট্রেশন করলেই ফ্রি অ্যাড দেখে আনলিমিটেড আয়ের সুযোগ!</span>
        </div>
      ) : canUpgrade ? (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 p-4 text-sm text-amber-900 flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-amber-600" />
          <span>আরো বেশি আয়ের জন্য <Link to="/packages" className="font-bold underline">প্যাকেজ upgrade করুন</Link> — দৈনিক বিজ্ঞাপন সুবিধা বৃদ্ধি পাবে।</span>
        </div>
      ) : null}`;

// Replace any leftover hasActivePackage notice at bottom
const noticeTarget = content.indexOf(`{hasActivePackage === false ? (`);
if (noticeTarget !== -1) {
  const noticeEnd = content.indexOf(`) : null}`, noticeTarget);
  if (noticeEnd !== -1) {
    content = content.substring(0, noticeTarget) + `<div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 p-4 text-sm text-amber-900 flex items-center gap-3"><Sparkles className="h-5 w-5 shrink-0 text-amber-600" /><span>নতুন ইউজারদের জন্য সুখবর: কোনো ইনভেস্ট ছাড়াই সরাসরি বিজ্ঞাপন দেখে আয় শুরু করুন!</span></div>` + content.substring(noticeEnd + 9);
  }
}

fs.writeFileSync(file, content, "utf-8");
console.log("Updated dashboard.tsx successfully");

