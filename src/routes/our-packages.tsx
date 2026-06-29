import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown, Trophy, Gem, Rocket, Sparkles, Check, TrendingUp,
  ArrowRight, ShieldCheck, Zap, Star, Flame, Award, Diamond,
} from "lucide-react";

export const Route = createFileRoute("/our-packages")({
  head: () => ({
    meta: [
      { title: "সকল প্যাকেজ — Smart Investor" },
      { name: "description", content: "Smart Investor এর সকল ইনভেস্টমেন্ট প্যাকেজ — ৫২০৳ থেকে ২৯,৯৯৯৳ পর্যন্ত। দৈনিক ২০৳ থেকে ১,২০০৳ আয়ের সুযোগ।" },
    ],
  }),
  component: PublicPackages,
});

type Pkg = {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  ring: string;
  badge?: { label: string; classes: string };
  price: string;
  daily: string;
  total: string;
  tasks: string;
  validity: string;
  perks: string[];
};

const packages: Pkg[] = [
  { name: "Starter", Icon: Sparkles, gradient: "from-slate-400 via-slate-500 to-slate-600", ring: "ring-slate-300",
    price: "৳ ৩০০", daily: "৳ ১৫", total: "৳ ৬৭৫", tasks: "৩", validity: "৪৫ দিন",
    perks: ["ফ্রি বোনাস দিয়ে শুরু", "Like টাস্ক", "তাৎক্ষণিক উইথড্র"] },
  { name: "Crazy", Icon: Rocket, gradient: "from-pink-500 via-rose-500 to-orange-500", ring: "ring-pink-300",
    badge: { label: "NEW", classes: "bg-pink-600 text-white" },
    price: "৳ ৫২০", daily: "৳ ২০", total: "৳ ৯০০", tasks: "৫", validity: "৪৫ দিন",
    perks: ["Like + Comment", "দ্রুত পেআউট", "রেফার বোনাস"] },
  { name: "Silver", Icon: Award, gradient: "from-zinc-300 via-zinc-400 to-zinc-600", ring: "ring-zinc-300",
    price: "৳ ১,৫০০", daily: "৳ ৬৫", total: "৳ ২,৯২৫", tasks: "৭", validity: "৪৫ দিন",
    perks: ["প্রিমিয়াম সাপোর্ট", "৭টি দৈনিক টাস্ক", "৫% রেফার কমিশন"] },
  { name: "Bronze", Icon: Flame, gradient: "from-orange-400 via-amber-500 to-yellow-600", ring: "ring-amber-300",
    price: "৳ ২,৫০০", daily: "৳ ১১০", total: "৳ ৪,৯৫০", tasks: "৮", validity: "৪৫ দিন",
    perks: ["বুস্ট টাস্ক", "প্রিমিয়াম গ্রুপ", "তাৎক্ষণিক উইথড্র"] },
  { name: "Gold", Icon: Trophy, gradient: "from-amber-300 via-yellow-400 to-amber-500", ring: "ring-amber-300",
    price: "৳ ৪,৯৯৯", daily: "৳ ২২০", total: "৳ ৯,৯০০", tasks: "১০", validity: "৪৫ দিন",
    perks: ["১০টি দৈনিক টাস্ক", "VIP গ্রুপ এক্সেস", "৭% রেফার কমিশন"] },
  { name: "Platinum", Icon: Star, gradient: "from-violet-400 via-purple-500 to-fuchsia-600", ring: "ring-violet-300",
    price: "৳ ৭,৪৯৯", daily: "৳ ৩৩০", total: "৳ ১৪,৮৫০", tasks: "১২", validity: "৪৫ দিন",
    perks: ["১২টি দৈনিক টাস্ক", "প্রিমিয়াম ব্যাজ", "ফাস্ট ট্র্যাক পেআউট"] },
  { name: "VIP", Icon: Crown, gradient: "from-amber-400 via-orange-500 to-red-500", ring: "ring-orange-300",
    badge: { label: "POPULAR", classes: "bg-rose-600 text-white" },
    price: "৳ ৯,৯৯৯", daily: "৳ ৪৫০", total: "৳ ২০,২৫০", tasks: "১৫", validity: "৪৫ দিন",
    perks: ["১৫টি দৈনিক টাস্ক", "ডেডিকেটেড ম্যানেজার", "১০% রেফার কমিশন"] },
  { name: "Diamond", Icon: Gem, gradient: "from-cyan-400 via-sky-500 to-blue-600", ring: "ring-sky-300",
    price: "৳ ১৪,৯৯৯", daily: "৳ ৬৮০", total: "৳ ৩০,৬০০", tasks: "২০", validity: "৪৫ দিন",
    perks: ["২০টি দৈনিক টাস্ক", "VIP+ সুবিধা", "বোনাস টাস্ক আনলক"] },
  { name: "Royal", Icon: Diamond, gradient: "from-emerald-400 via-teal-500 to-cyan-600", ring: "ring-emerald-300",
    price: "৳ ১৯,৯৯৯", daily: "৳ ৯০০", total: "৳ ৪০,৫০০", tasks: "২৫", validity: "৪৫ দিন",
    perks: ["২৫টি দৈনিক টাস্ক", "এক্সক্লুসিভ ক্যাম্পেইন", "১৫% রেফার কমিশন"] },
  { name: "Mega", Icon: Crown, gradient: "from-fuchsia-500 via-purple-600 to-indigo-700", ring: "ring-fuchsia-300",
    badge: { label: "BEST VALUE", classes: "bg-emerald-600 text-white" },
    price: "৳ ২৯,৯৯৯", daily: "৳ ১,২০০", total: "৳ ৫৪,০০০", tasks: "৩০", validity: "৪৫ দিন",
    perks: ["৩০টি দৈনিক টাস্ক", "মেগা বোনাস", "ব্যক্তিগত ম্যানেজার"] },
];

function PublicPackages() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50/50 to-emerald-50/40">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-amber-200/60 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="bn-display text-lg text-slate-900">Smart Investor</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">লগইন</Link>
            <Link to="/register" className="btn-gold !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">শুরু করুন</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-rose-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> ১০টি প্রিমিয়াম প্যাকেজ
          </span>
          <h1 className="bn-display mt-4 text-4xl text-slate-900 sm:text-5xl">
            আপনার জন্য <span className="text-gradient">সেরা প্যাকেজ</span> বেছে নিন
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            ৳৩০০ থেকে ৳২৯,৯৯৯ পর্যন্ত — দৈনিক আয় ৳১৫ থেকে ৳১,২০০। প্রতিটি প্যাকেজে আছে নিশ্চিত রিটার্ন।
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs">
            {[
              { Icon: ShieldCheck, t: "১০০% নিরাপদ", c: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
              { Icon: Zap, t: "তাৎক্ষণিক একটিভ", c: "bg-amber-50 text-amber-800 ring-amber-200" },
              { Icon: TrendingUp, t: "নিশ্চিত আয়", c: "bg-rose-50 text-rose-700 ring-rose-200" },
            ].map(({ Icon, t, c }) => (
              <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ring-1 ${c}`}>
                <Icon className="h-3.5 w-3.5" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Packages grid */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <article
              key={p.name}
              className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition-all hover:-translate-y-1.5 hover:shadow-pop hover:ring-2 ${p.ring}`}
            >
              {/* Header band */}
              <div className={`relative bg-gradient-to-br ${p.gradient} p-6 text-white`}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                {p.badge && (
                  <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-soft ${p.badge.classes}`}>
                    {p.badge.label}
                  </span>
                )}
                <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/25 backdrop-blur-sm">
                  <p.Icon className="h-7 w-7" />
                </div>
                <h3 className="bn-display mt-4 text-3xl">{p.name}</h3>
                <div className="bn-display mt-1 text-3xl">{p.price}</div>
                <p className="mt-1 text-xs text-white/90">{p.validity} মেয়াদ</p>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
                    <p className="text-[10px] font-semibold text-emerald-700">দৈনিক</p>
                    <p className="bn-display text-sm text-emerald-800">{p.daily}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
                    <p className="text-[10px] font-semibold text-amber-700">টাস্ক</p>
                    <p className="bn-display text-sm text-amber-800">{p.tasks}টি</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-2 ring-1 ring-rose-100">
                    <p className="text-[10px] font-semibold text-rose-700">মোট</p>
                    <p className="bn-display text-sm text-rose-800">{p.total}</p>
                  </div>
                </div>

                <ul className="space-y-2 text-sm text-slate-700">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${p.gradient} px-4 py-3 text-sm font-bold text-white shadow-soft transition-transform hover:scale-[1.02]`}
                >
                  এই প্যাকেজ নিন <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-600 p-8 text-center text-white shadow-pop sm:p-10">
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
            <h2 className="bn-display text-3xl sm:text-4xl">আজই শুরু করুন — ৳৩০০ বোনাস সাথে</h2>
            <p className="mt-3 text-sm text-white/90 sm:text-base">রেজিস্ট্রেশন একদম ফ্রি — প্রথম প্যাকেজ একটিভ করেই বোনাস আনলক</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="rounded-xl bg-white px-6 py-3 font-bold text-rose-700 shadow-soft transition-transform hover:scale-105">
                ফ্রি একাউন্ট খুলুন
              </Link>
              <Link to="/auth" className="rounded-xl bg-white/15 px-6 py-3 font-bold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25">
                লগইন করুন
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
