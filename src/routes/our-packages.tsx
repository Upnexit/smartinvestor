import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Crown, Trophy, Gem, Rocket, Sparkles, Check, TrendingUp,
  ArrowRight, ShieldCheck, Zap, Star, Flame, Award, Diamond,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/our-packages")({
  head: () => ({
    meta: [
      { title: "সকল প্যাকেজ — Smart Investor" },
      { name: "description", content: "Smart Investor এর সকল ইনভেস্টমেন্ট প্যাকেজ — এক ক্লিকে ক্রয় করুন।" },
    ],
  }),
  component: PublicPackages,
});

type Pkg = {
  id: string;
  name: string;
  price: number;
  daily_income: number;
  daily_tasks: number;
  duration_days: number;
  description: string | null;
  featured: boolean;
  image_url: string | null;
};

const ICONS = [Sparkles, Rocket, Award, Flame, Trophy, Star, Crown, Gem, Diamond, Crown];
const GRADS = [
  "from-slate-400 via-slate-500 to-slate-600",
  "from-pink-500 via-rose-500 to-orange-500",
  "from-zinc-300 via-zinc-400 to-zinc-600",
  "from-orange-400 via-amber-500 to-yellow-600",
  "from-amber-300 via-yellow-400 to-amber-500",
  "from-violet-400 via-purple-500 to-fuchsia-600",
  "from-amber-400 via-orange-500 to-red-500",
  "from-cyan-400 via-sky-500 to-blue-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-fuchsia-500 via-purple-600 to-indigo-700",
];
const RINGS = [
  "ring-slate-300","ring-pink-300","ring-zinc-300","ring-amber-300","ring-amber-300",
  "ring-violet-300","ring-orange-300","ring-sky-300","ring-emerald-300","ring-fuchsia-300",
];

const bn = (n: number) => Number(n).toLocaleString("en-BD");

function PublicPackages() {
  const [rows, setRows] = useState<Pkg[] | null>(null);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.from("packages").select("*").eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setRows((data ?? []) as Pkg[]));
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);


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
            {authed ? (
              <Link to="/dashboard" className="btn-gold !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">ড্যাশবোর্ড</Link>
            ) : (
              <>
                <Link to="/auth" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">লগইন</Link>
                <Link to="/register" className="btn-gold !px-3 !py-2 text-xs sm:!px-4 sm:text-sm">শুরু করুন</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-rose-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> সকল প্যাকেজ
          </span>
          <h1 className="bn-display mt-4 text-4xl text-slate-900 sm:text-5xl">
            আপনার জন্য <span className="text-gradient">সেরা প্যাকেজ</span> বেছে নিন
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            নিচে থেকে যেকোনো প্যাকেজ সিলেক্ট করে সরাসরি ক্রয় করুন — bKash / Nagad / Rocket সাপোর্ট।
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
        {!rows ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-96 rounded-3xl bg-white/70 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-600">এই মুহূর্তে কোনো প্যাকেজ available নেই।</p>
        ) : (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((p, i) => {
              const Icon = ICONS[i % ICONS.length];
              const grad = GRADS[i % GRADS.length];
              const ring = RINGS[i % RINGS.length];
              const total = p.daily_income * p.duration_days;
              const roi = Math.round(((total - Number(p.price)) / Number(p.price)) * 100);
              return (
                <article
                  key={p.id}
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition-all hover:-translate-y-1.5 hover:shadow-pop hover:ring-2 ${ring}`}
                >
                  <div className={`relative bg-gradient-to-br ${grad} p-6 text-white`}>
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                    {p.featured && (
                      <span className="absolute right-4 top-4 rounded-full bg-white/25 backdrop-blur px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-white/40">
                        ★ FEATURED
                      </span>
                    )}
                    <div className="inline-grid h-14 w-14 place-items-center rounded-2xl bg-white/25 backdrop-blur-sm">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="bn-display mt-4 text-3xl">{p.name}</h3>
                    <div className="bn-display mt-1 text-3xl">৳{bn(Number(p.price))}</div>
                    <p className="mt-1 text-xs text-white/90">{bn(p.duration_days)} দিন মেয়াদ • {roi}% ROI</p>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-emerald-50 p-2 ring-1 ring-emerald-100">
                        <p className="text-[10px] font-semibold text-emerald-700">দৈনিক</p>
                        <p className="bn-display text-sm text-emerald-800">৳{bn(p.daily_income)}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100">
                        <p className="text-[10px] font-semibold text-amber-700">টাস্ক</p>
                        <p className="bn-display text-sm text-amber-800">{bn(p.daily_tasks)}টি</p>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-2 ring-1 ring-rose-100">
                        <p className="text-[10px] font-semibold text-rose-700">মোট</p>
                        <p className="bn-display text-sm text-rose-800">৳{bn(total)}</p>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm text-slate-700">
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{bn(p.daily_tasks)}টি দৈনিক টাস্ক</span></li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>তাৎক্ষণিক উইথড্র সুবিধা</span></li>
                      <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>৫% রেফারেল কমিশন</span></li>
                    </ul>

                    {authed ? (
                      <Link
                        to="/packages/$id"
                        params={{ id: p.id }}
                        className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${grad} px-4 py-3 text-sm font-bold text-white shadow-soft transition-transform hover:scale-[1.02]`}
                      >
                        এই প্যাকেজ ক্রয় করুন <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        to="/auth"
                        search={{ redirect: `/packages/${p.id}` }}
                        className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r ${grad} px-4 py-3 text-sm font-bold text-white shadow-soft transition-transform hover:scale-[1.02]`}
                      >
                        এই প্যাকেজ ক্রয় করুন <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                    <p className="text-center text-[11px] text-slate-500">
                      {authed ? "প্যাকেজ বিস্তারিত পেজে নিয়ে যাওয়া হবে" : "ক্রয় করতে প্রথমে লগইন করুন — লগইনের পর সরাসরি প্যাকেজে ফিরবেন"}
                    </p>

                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* CTA bottom */}
        {!authed && (
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
        )}
      </section>
    </div>
  );
}
