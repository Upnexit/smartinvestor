import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Toaster, toast } from "sonner";
import {
  Sparkles, ThumbsUp, MessageCircle, Wallet, ShieldCheck, UserPlus,
  MousePointerClick, CheckCircle2, Smartphone, Clock, Users, TrendingUp,
  Zap, Gift, Trophy, ArrowRight, Star, Banknote, Crown, Gem, Award,
  Rocket, Check, Package, Truck, ShoppingCart, Download,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/")({
  component: SmartInvestorPage,
});

/* ---------------- Shared bits ---------------- */

function Logo({ size = 40 }: { size?: number }) {
  const { logo_url, site_name } = useSiteSettings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (mounted && logo_url) {
    return (
      <img
        src={logo_url}
        alt={`${site_name} লোগো`}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover ring-2 ring-amber-200 shadow-soft bg-white"
      />
    );
  }
  return (
    <div
      className="grid place-items-center rounded-xl bg-white ring-2 ring-amber-200 shadow-soft"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="bn-display text-amber-600" style={{ fontSize: size * 0.45 }}>Si</span>
    </div>
  );
}

function Heading({
  eyebrow, eyebrowColor = "amber", title, sub,
}: {
  eyebrow: string;
  eyebrowColor?: "amber" | "emerald" | "rose" | "sky" | "violet";
  title: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    sky: "bg-sky-100 text-sky-700 border-sky-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${colorMap[eyebrowColor]}`}>
        {eyebrow}
      </span>
      <h2 className="bn-display mt-4 text-3xl text-slate-900 sm:text-4xl md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-slate-600 sm:text-lg">{sub}</p>}
    </div>
  );
}

/* ---------------- 1. Nav ---------------- */

function Nav() {
  const { site_name } = useSiteSettings();
  return (
    <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="bn-display text-lg text-slate-900 sm:text-xl">{site_name}</span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {[
            ["কিভাবে কাজ করে", "#how"],
            ["ফিচার", "#features"],
            ["আয়", "#earning"],
            ["রিভিউ", "#review"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-medium text-slate-700 transition-colors hover:text-amber-600">
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link to="/auth" className="btn-green !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">লগইন</Link>
          <Link to="/register" className="btn-gold !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">শুরু করুন</Link>
        </div>
      </nav>
    </header>
  );
}

/* ---------------- 2. Hero ---------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 md:pt-20 md:pb-24">
      {/* blobs */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-amber-300/40 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-20 h-72 w-72 rounded-full bg-emerald-300/40 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/2 h-72 w-80 -translate-x-1/2 rounded-full bg-rose-300/40 blur-2xl" />

      <div className="relative mx-auto max-w-4xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 sm:text-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          বাংলাদেশের #১ অনলাইন ইনকাম প্ল্যাটফর্ম
        </span>

        <div className="mt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 px-4 py-1.5 text-xs font-semibold text-amber-900 sm:text-sm">
            <Gift className="h-4 w-4 text-rose-500" />
            নতুন একাউন্টে <span className="text-rose-700">৳৩০০</span> সাইনআপ বোনাস (লকড)
          </span>
        </div>

        <h1 className="bn-display mt-6 text-[2.5rem] leading-[1.05] text-slate-900 sm:text-6xl md:text-7xl">
          <span className="text-gradient">লাইক ও কমেন্ট</span>{" "}
          করে টাকা <span className="text-gradient">ইনকাম</span> করুন
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          ঘরে বসে মোবাইল দিয়ে সহজেই আয় করুন। প্রতিদিন কয়েক মিনিট কাজ করেই পেয়ে যান রিয়েল ক্যাশ —{" "}
          <span className="font-semibold text-pink-600">bKash</span>,{" "}
          <span className="font-semibold text-orange-600">Nagad</span> ও{" "}
          <span className="font-semibold text-purple-600">Rocket</span>-এ ইনস্ট্যান্ট পেমেন্ট।
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register" className="btn-gold w-full sm:w-auto">
            ফ্রি একাউন্ট খুলুন <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/distributor-info" className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 font-semibold text-white shadow-lg shadow-violet-500/30 ring-1 ring-white/20 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto">
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
            <Crown className="relative h-4 w-4" />
            <span className="relative">ডিস্ট্রিবিউটর হোন</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-600">
          {["ফ্রি রেজিস্ট্রেশন", "ইনভেস্টমেন্ট নেই", "১০০% নিরাপদ"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        {/* rate cards */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4">
          <RateCard tone="sky" Icon={ThumbsUp} label="প্রতি Like" value="৳ ০.৫০" />
          <RateCard tone="rose" Icon={MessageCircle} label="প্রতি Comment" value="৳ ১.২০" />
        </div>
      </div>
    </section>
  );
}

function RateCard({
  tone, Icon, label, value,
}: {
  tone: "sky" | "rose";
  Icon: typeof ThumbsUp;
  label: string;
  value: string;
}) {
  const map = {
    sky:  { border: "border-sky-200",  iconBg: "bg-sky-500",  text: "text-sky-700"  },
    rose: { border: "border-rose-200", iconBg: "bg-rose-500", text: "text-rose-700" },
  }[tone];
  return (
    <div className={`group rounded-2xl border ${map.border} bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-pop`}>
      <div className={`mb-3 inline-grid h-11 w-11 place-items-center rounded-xl ${map.iconBg} text-white shadow-soft`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={`bn-display mt-1 text-2xl sm:text-3xl ${map.text}`}>{value}</div>
    </div>
  );
}

/* ---------------- 3. Stats ---------------- */

function Stats() {
  const items = [
    { Icon: Users,       value: "৫০,০০০+", label: "সক্রিয় ইউজার",  tone: "amber"   },
    { Icon: Banknote,    value: "৳ ২ কোটি+", label: "পেমেন্ট সম্পন্ন", tone: "emerald" },
    { Icon: Clock,       value: "২৪/৭",      label: "লাইভ সাপোর্ট",   tone: "sky"     },
    { Icon: TrendingUp,  value: "৯৯%",       label: "সফল উইথড্র",     tone: "rose"    },
  ] as const;
  const tones: Record<string, { soft: string; solid: string; text: string }> = {
    amber:   { soft: "bg-amber-100",   solid: "bg-amber-500",   text: "text-amber-700"   },
    emerald: { soft: "bg-emerald-100", solid: "bg-emerald-500", text: "text-emerald-700" },
    sky:     { soft: "bg-sky-100",     solid: "bg-sky-500",     text: "text-sky-700"     },
    rose:    { soft: "bg-rose-100",    solid: "bg-rose-500",    text: "text-rose-700"    },
  };
  return (
    <section className="px-4 py-14 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 md:grid-cols-4">
        {items.map(({ Icon, value, label, tone }) => {
          const t = tones[tone];
          return (
            <div key={label} className="group rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop">
              <div className={`mx-auto grid h-12 w-12 place-items-center rounded-xl ${t.soft}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-lg ${t.solid} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className={`bn-display mt-3 text-2xl sm:text-3xl ${t.text}`}>{value}</div>
              <div className="mt-1 text-sm text-slate-600">{label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 4. How It Works ---------------- */

function HowItWorks() {
  const steps = [
    { Icon: UserPlus,            title: "একাউন্ট তৈরি করুন",    desc: "মাত্র ১ মিনিটে ফ্রি রেজিস্ট্রেশন করুন এবং ড্যাশবোর্ডে প্রবেশ করুন।", tone: "amber"   },
    { Icon: MousePointerClick,   title: "টাস্ক সম্পন্ন করুন",     desc: "প্রতিদিন নতুন লাইক ও কমেন্ট টাস্ক করুন আপনার পছন্দ মতো।",          tone: "emerald" },
    { Icon: Wallet,              title: "ইনস্ট্যান্ট পেমেন্ট নিন", desc: "bKash, Nagad বা Rocket-এ মুহূর্তেই টাকা তুলে নিন।",            tone: "rose"    },
  ] as const;
  const tones: Record<string, { ring: string; chip: string; iconBg: string }> = {
    amber:   { ring: "bg-amber-100",   chip: "bg-amber-100 text-amber-700",     iconBg: "bg-amber-500"   },
    emerald: { ring: "bg-emerald-100", chip: "bg-emerald-100 text-emerald-700", iconBg: "bg-emerald-500" },
    rose:    { ring: "bg-rose-100",    chip: "bg-rose-100 text-rose-700",       iconBg: "bg-rose-500"    },
  };
  return (
    <section id="how" className="bg-mint px-4 py-20 sm:px-6">
      <Heading eyebrow="প্রসেস" eyebrowColor="emerald" title="মাত্র ৩ ধাপে শুরু করুন" />
      <div className="relative mx-auto mt-14 max-w-6xl">
        {/* connector */}
        <div aria-hidden className="absolute left-0 right-0 top-10 hidden h-0.5 bg-gradient-to-r from-amber-300 via-emerald-300 to-rose-300 md:block" />
        <div className="relative grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const t = tones[s.tone];
            return (
              <div key={s.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop">
                <div className={`grid h-20 w-20 place-items-center rounded-2xl ${t.ring}`}>
                  <div className={`grid h-14 w-14 place-items-center rounded-xl ${t.iconBg} text-white shadow-soft`}>
                    <s.Icon className="h-7 w-7" />
                  </div>
                </div>
                <span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-bold ${t.chip}`}>ধাপ {["১","২","৩"][i]}</span>
                <h3 className="bn-display mt-3 text-2xl text-slate-900">{s.title}</h3>
                <p className="mt-2 text-slate-600">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 5. Features ---------------- */

function Features() {
  const feats = [
    { Icon: ShieldCheck, title: "১০০% নিরাপদ",     desc: "আপনার তথ্য এবং পেমেন্ট সম্পূর্ণ সুরক্ষিত।",         tone: "emerald" },
    { Icon: Smartphone,  title: "মোবাইল ফ্রেন্ডলি", desc: "যেকোনো ডিভাইস থেকে সহজেই কাজ করুন।",          tone: "sky"     },
    { Icon: Zap,         title: "ইনস্ট্যান্ট পেমেন্ট", desc: "অনুরোধের সাথে সাথে টাকা পান।",                tone: "amber"   },
    { Icon: Clock,       title: "২৪/৭ টাস্ক",       desc: "দিন-রাত যেকোনো সময় কাজ করতে পারবেন।",        tone: "orange"  },
    { Icon: Gift,        title: "রেফার বোনাস",      desc: "বন্ধুকে রেফার করে অতিরিক্ত আয় করুন।",          tone: "rose"    },
    { Icon: Trophy,      title: "কম মিনিমাম উইথড্র", desc: "মাত্র ১০০ টাকা থেকেই উইথড্র করতে পারবেন।",    tone: "violet"  },
  ] as const;
  const tones: Record<string, { bg: string; border: string; chip: string }> = {
    emerald: { bg: "bg-emerald-50/70", border: "border-emerald-200", chip: "bg-emerald-500" },
    sky:     { bg: "bg-sky-50/70",     border: "border-sky-200",     chip: "bg-sky-500"     },
    amber:   { bg: "bg-amber-50/70",   border: "border-amber-200",   chip: "bg-amber-500"   },
    orange:  { bg: "bg-orange-50/70",  border: "border-orange-200",  chip: "bg-orange-500"  },
    rose:    { bg: "bg-rose-50/70",    border: "border-rose-200",    chip: "bg-rose-500"    },
    violet:  { bg: "bg-violet-50/70",  border: "border-violet-200",  chip: "bg-violet-500"  },
  };
  return (
    <section id="features" className="bg-white px-4 py-20 sm:px-6">
      <Heading eyebrow="ফিচার" eyebrowColor="amber" title="কেন Smart Investor সেরা?" />
      <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {feats.map((f) => {
          const t = tones[f.tone];
          return (
            <div key={f.title} className={`group rounded-2xl border ${t.border} ${t.bg} p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop`}>
              <div className={`inline-grid h-12 w-12 place-items-center rounded-xl ${t.chip} text-white shadow-soft transition-transform group-hover:scale-110`}>
                <f.Icon className="h-6 w-6" />
              </div>
              <h3 className="bn-display mt-4 text-xl text-slate-900">{f.title}</h3>
              <p className="mt-2 text-slate-600">{f.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------- 6. Earnings / Packages ---------------- */

type Pkg = {
  name: string;
  Icon: typeof Crown;
  gradient: string;
  badge?: { label: string; classes: string };
  price: string;
  daily: string;
  total: string;
  tasks: string;
};

function Earnings() {
  const fallback: (Pkg & { image_url: string | null })[] = [
    { name: "VIP", Icon: Crown, gradient: "from-amber-400 via-orange-500 to-red-500", badge: { label: "POPULAR", classes: "bg-rose-600 text-white" }, price: "৳ ৯,৯৯৯", daily: "৳ ৪৫০", total: "৳ ২০,২৫০", tasks: "১৫", image_url: null },
    { name: "Gold", Icon: Trophy, gradient: "from-amber-300 via-yellow-400 to-amber-500", price: "৳ ৪,৯৯৯", daily: "৳ ২২০", total: "৳ ৯,৯০০", tasks: "১০", image_url: null },
    { name: "Diamond", Icon: Gem, gradient: "from-cyan-400 via-sky-500 to-blue-600", price: "৳ ১৪,৯৯৯", daily: "৳ ৬৮০", total: "৳ ৩০,৬০০", tasks: "২০", image_url: null },
    { name: "Crazy", Icon: Rocket, gradient: "from-pink-500 via-rose-500 to-orange-500", badge: { label: "NEW", classes: "bg-pink-600 text-white" }, price: "৳ ৫২০", daily: "৳ ২০", total: "৳ ৯০০", tasks: "৫", image_url: null },
  ];
  const [pkgs, setPkgs] = useState<(Pkg & { image_url: string | null })[]>(fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.from("packages")
        .select("id,name,price,daily_income,daily_tasks,duration_days,image_url,featured,sort_order")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .limit(4);
      if (cancelled || !data || data.length === 0) return;
      const gradients = [
        "from-amber-400 via-orange-500 to-red-500",
        "from-amber-300 via-yellow-400 to-amber-500",
        "from-cyan-400 via-sky-500 to-blue-600",
        "from-pink-500 via-rose-500 to-orange-500",
      ];
      const icons = [Crown, Trophy, Gem, Rocket];
      const bn = (n: number) => Number(n).toLocaleString("bn-BD");
      setPkgs(data.map((r, i) => ({
        name: r.name,
        Icon: icons[i % icons.length],
        gradient: gradients[i % gradients.length],
        badge: r.featured ? { label: "POPULAR", classes: "bg-rose-600 text-white" } : undefined,
        price: `৳ ${bn(Number(r.price))}`,
        daily: `৳ ${bn(Number(r.daily_income))}`,
        total: `৳ ${bn(Number(r.daily_income) * Number(r.duration_days))}`,
        tasks: bn(Number(r.daily_tasks)),
        image_url: r.image_url,
      })));
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="earning" className="bg-honey px-4 py-20 sm:px-6">
      <Heading
        eyebrow="প্যাকেজ" eyebrowColor="amber"
        title="আমাদের প্যাকেজ সমূহ"
        sub="আপনার বাজেট অনুযায়ী সেরা প্যাকেজ বেছে নিন — ৫২০৳ থেকে ২৯,৯৯৯৳ পর্যন্ত। দৈনিক ২০৳ থেকে ১,২০০৳ পর্যন্ত আয়।"
      />
      <div className="mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-5 lg:grid-cols-4">
        {pkgs.map((p) => (
          <article key={p.name} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop">
            {p.image_url && (
              <div className="relative h-36 w-full overflow-hidden">
                <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className={`absolute inset-0 bg-gradient-to-t ${p.gradient} opacity-30 mix-blend-multiply`} />
              </div>
            )}
            <div className={`relative bg-gradient-to-br ${p.gradient} p-5 text-white`}>
              {p.badge && (
                <span className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${p.badge.classes} shadow-soft`}>
                  {p.badge.label}
                </span>
              )}
              <div className="inline-grid h-12 w-12 place-items-center rounded-xl bg-white/25 backdrop-blur-sm">
                <p.Icon className="h-6 w-6" />
              </div>
              <h3 className="bn-display mt-3 text-2xl">{p.name}</h3>
              <div className="bn-display mt-1 text-2xl">{p.price}</div>
              <p className="text-xs text-white/90">৪৫ দিন মেয়াদ</p>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <TrendingUp className="h-3.5 w-3.5" />
                দৈনিক {p.daily}
              </span>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />দৈনিক {p.tasks}টি টাস্ক</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" />মোট আয় {p.total}</li>
              </ul>
              <Link to="/our-packages" className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${p.gradient} px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-transform hover:scale-[1.02]`}>
                বিস্তারিত দেখুন <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center gap-2 text-center">
        <Link to="/our-packages" className="btn-gold">সকল প্যাকেজ দেখুন →</Link>
        <p className="text-xs text-slate-600">১০টি প্রিমিয়াম প্যাকেজ — Like · Comment · Share</p>
      </div>
    </section>
  );
}


/* ---------------- 7. Products ---------------- */

type Product = {
  name: string;
  price: string;
  oldPrice: string;
  img: string;
  tag: { label: string; gradient: string };
};

function Products() {
  const products: Product[] = [
    { name: "Apple AirPods Pro 2",   price: "৳ ৩৮,৯০০", oldPrice: "৳ ৪৫,০০০", img: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80", tag: { label: "BEST SELLER", gradient: "from-amber-500 to-orange-600" } },
    { name: "Sony WH-1000XM5 হেডফোন", price: "৳ ৩৪,৫০০", oldPrice: "৳ ৩৯,৯০০", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80", tag: { label: "PREMIUM",     gradient: "from-violet-500 to-purple-700" } },
    { name: "Samsung Galaxy Buds2 Pro", price: "৳ ১৪,৯০০", oldPrice: "৳ ১৮,০০০", img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80", tag: { label: "NEW",         gradient: "from-emerald-500 to-teal-600" } },
    { name: "JBL Tune 760NC হেডফোন", price: "৳ ১২,৫০০", oldPrice: "৳ ১৫,০০০", img: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=600&q=80",  tag: { label: "SAVE 17%",    gradient: "from-rose-500 to-pink-600" } },
    { name: "Xiaomi Mi Band 8 স্মার্টব্যান্ড", price: "৳ ৪,৯৯০", oldPrice: "৳ ৬,৫০০", img: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=600&q=80", tag: { label: "HOT",         gradient: "from-orange-500 to-red-600" } },
    { name: "Anker Soundcore Liberty 4", price: "৳ ১১,৯০০", oldPrice: "৳ ১৪,৫০০", img: "https://images.unsplash.com/photo-1606741965326-cb6ea1937d57?auto=format&fit=crop&w=600&q=80", tag: { label: "TRENDING",    gradient: "from-sky-500 to-blue-600" } },
    { name: "Apple Watch SE",        price: "৳ ৩২,৯০০", oldPrice: "৳ ৩৮,০০০", img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80",  tag: { label: "EXCLUSIVE",   gradient: "from-slate-700 to-slate-900" } },
    { name: "Realme Buds Air 5 Pro", price: "৳ ৬,৪৯০", oldPrice: "৳ ৮,৫০০", img: "https://images.unsplash.com/photo-1612444530582-fc66183b16f4?auto=format&fit=crop&w=600&q=80",  tag: { label: "DEAL",        gradient: "from-fuchsia-500 to-purple-600" } },
  ];

  const handleOrder = () => {
    toast("এই পণ্যটি শীঘ্রই অর্ডারের জন্য উন্মুক্ত হবে — Coming Soon!");
  };

  return (
    <section id="products" className="bg-mint px-4 py-20 sm:px-6">
      <Heading
        eyebrow="আমাদের পণ্য সমূহ" eyebrowColor="emerald"
        title="বিশ্বস্ত প্রিমিয়াম পণ্যের কালেকশন"
        sub="ইয়ারবাডস, হেডফোন, স্মার্টওয়াচসহ অরিজিনাল ব্র্যান্ডেড ইলেকট্রনিক্স — সাশ্রয়ী মূল্যে, সারা বাংলাদেশে দ্রুত ডেলিভারি।"
      />
      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {[
          { Icon: ShieldCheck, label: "১০০% অরিজিনাল", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { Icon: Truck,       label: "ফাস্ট ডেলিভারি", tone: "bg-sky-50 text-sky-700 border-sky-200" },
          { Icon: Package,     label: "ক্যাশ অন ডেলিভারি", tone: "bg-rose-50 text-rose-700 border-rose-200" },
        ].map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${c.tone}`}>
            <c.Icon className="h-3.5 w-3.5" /> {c.label}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
        {products.map((p) => (
          <article key={p.name} className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop">
            <div className="relative aspect-square overflow-hidden bg-slate-50">
              <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <span className={`absolute left-2 top-2 rounded-full bg-gradient-to-r ${p.tag.gradient} px-2.5 py-0.5 text-[10px] font-bold text-white shadow-soft`}>
                {p.tag.label}
              </span>
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                <Clock className="h-3 w-3" /> Coming Soon
              </span>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent px-3 py-2 text-center text-xs font-bold text-white">
                শীঘ্রই আসছে
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900">{p.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="bn-display text-lg text-rose-600">{p.price}</span>
                <span className="text-xs text-slate-400 line-through">{p.oldPrice}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                  <span className="ml-1 text-slate-600">(4.9)</span>
                </div>
                <span className="font-semibold text-emerald-600">ইন স্টক</span>
              </div>
              <button onClick={handleOrder} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-3 py-2 text-sm font-bold text-white shadow-soft transition-transform hover:scale-[1.02]">
                <ShoppingCart className="h-4 w-4" /> অর্ডার করুন
              </button>
            </div>
          </article>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-slate-500">
        * পণ্য অর্ডারের জন্য সাপোর্টে যোগাযোগ করুন। সকল পণ্য ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি সহ।
      </p>
    </section>
  );
}

/* ---------------- 8. Testimonials ---------------- */

const REVIEWS = [
  { name: "রাকিব হাসান",     city: "ঢাকা",      text: "প্রতিদিন ৩-৪ ঘন্টা কাজ করে মাসে ১৫,০০০ টাকা আয় করছি। সত্যিই অসাধারণ প্ল্যাটফর্ম।" },
  { name: "সুমাইয়া আক্তার",   city: "চট্টগ্রাম",  text: "স্টুডেন্ট হিসেবে পড়াশোনার পাশাপাশি ভালো আয় করতে পারছি। পেমেন্ট সবসময় টাইমলি।" },
  { name: "মো. ইমরান",       city: "সিলেট",     text: "bKash-এ ইনস্ট্যান্ট পেমেন্ট পাই। সাপোর্ট টিম খুবই হেল্পফুল। হাইলি রিকমেন্ডেড।" },
  { name: "ফারহানা ইয়াসমিন",  city: "রাজশাহী",   text: "ঘরে বসে নিরাপদে আয় করার সবচেয়ে ভালো উপায়। উইথড্র কখনো ফেল হয়নি।" },
  { name: "শাহরিয়ার কবির",    city: "খুলনা",     text: "নতুনদের জন্য পারফেক্ট প্ল্যাটফর্ম। কয়েক মিনিটেই টাস্ক শেষ করা যায়।" },
  { name: "তানজিনা রহমান",   city: "বরিশাল",    text: "রেফার বোনাস থেকেই অনেক ভালো আয় হচ্ছে। দারুণ সিস্টেম।" },
];
const AVATAR_COLORS = ["bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-sky-500", "bg-violet-500", "bg-orange-500"];

function Testimonials() {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: "start" }, [Autoplay({ delay: 3500, stopOnInteraction: false })]);
  return (
    <section id="review" className="bg-white px-4 py-20 sm:px-6">
      <Heading eyebrow="রিভিউ" eyebrowColor="rose" title="আমাদের ইউজারদের রিভিউ" />
      <div className="mx-auto mt-12 max-w-6xl overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5">
          {REVIEWS.map((r, i) => (
            <div key={r.name} className="min-w-0 shrink-0 basis-[calc(50%-10px)] md:basis-[calc(33.333%-13.33px)]">
              <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
                <div className="flex gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-slate-700">{r.text}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className={`grid h-10 w-10 place-items-center rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} bn-display text-white`}>
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">{r.city}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- 9. CTA Banner ---------------- */

function CTA() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-12 text-center text-white shadow-pop sm:px-12 sm:py-16"
        style={{ backgroundImage: "linear-gradient(135deg, #f97316 0%, #e11d48 55%, #d946ef 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-amber-300/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-yellow-300/40 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm sm:text-sm">
            🎁 আজই যোগ দিন — সাইনআপ বোনাস ৳৩০০
          </span>
          <h2 className="bn-display mx-auto mt-5 max-w-3xl text-3xl leading-tight sm:text-5xl">
            আজই শুরু করুন <span className="text-amber-200">আপনার আয়</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/90">
            ফ্রি রেজিস্ট্রেশন। কোনো ইনভেস্টমেন্ট নেই। প্রথম টাস্ক থেকেই আয় শুরু।
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3 font-bold text-rose-700 shadow-soft transition-transform hover:scale-105 sm:w-auto">
              ফ্রি একাউন্ট খুলুন
            </Link>
            <Link to="/install" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/70 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto">
              <Download className="h-5 w-5" />
              অ্যাপ ডাউনলোড করুন
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- 10. Footer ---------------- */

function Footer() {
  const { site_name } = useSiteSettings();
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
      {/* Mobile layout: centered stacked */}
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center sm:hidden">
        <div className="flex flex-col items-center gap-2.5">
          <Logo size={44} />
          <span className="bn-display text-xl text-slate-900">{site_name}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link to="/privacy" className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-200">
            প্রাইভেসি পলিসি
          </Link>
          <Link to="/terms" className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-200">
            শর্তাবলী
          </Link>
          <a href="#" className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-amber-50 hover:text-amber-700 hover:ring-amber-200">
            যোগাযোগ
          </a>
        </div>
        <div className="w-full border-t border-slate-100 pt-4 text-xs text-slate-500">
          © 2025 {site_name} — সকল অধিকার সংরক্ষিত।
        </div>
      </div>

      {/* Desktop / tablet layout: original row */}
      <div className="mx-auto hidden max-w-7xl flex-col items-start justify-between gap-4 sm:flex sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="bn-display text-lg text-slate-900">{site_name}</span>
        </div>
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-6">
          <span>© 2025 {site_name} — সকল অধিকার সংরক্ষিত।</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-amber-600">শর্তাবলী</Link>
            <Link to="/privacy" className="hover:text-amber-600">প্রাইভেসি</Link>
            <a href="#" className="hover:text-amber-600">যোগাযোগ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Page ---------------- */

function SmartInvestorPage() {
  return (
    <div className="bg-app min-h-screen">
      <Toaster position="top-center" richColors />
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Earnings />
        <Products />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
