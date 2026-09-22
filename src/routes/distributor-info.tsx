import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Crown, Wallet, Users, TrendingUp, ShieldCheck, Award, Sparkles,
  MapPin, Phone, ArrowRight, CheckCircle2, Rocket, Gift, HeartHandshake,
  BadgeCheck, Zap, Trophy, Star, ChevronRight,
} from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/distributor-info")({
  head: () => ({
    meta: [
      { title: "ডিস্ট্রিবিউটর হোন — Smart Click BD" },
      { name: "description", content: "নিজের এলাকায় Smart Click BD এর অফিসিয়াল এজেন্ট হয়ে ইনস্ট্যান্ট ৳২৫,০০০ ব্যালেন্স, ৫% কমিশন ও নিয়মিত আয়ের সুযোগ নিন।" },
      { property: "og:title", content: "ডিস্ট্রিবিউটর হোন — Smart Click BD" },
      { property: "og:description", content: "৳২৫,০০০ ইনস্ট্যান্ট ব্যালেন্স সহ Smart Click BD এজেন্ট প্রোগ্রামে যোগ দিন।" },
    ],
  }),
  component: DistributorInfoPage,
});

function DistributorInfoPage() {
  const { site_name } = useSiteSettings();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white via-indigo-50/40 to-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-indigo-100 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-md">
              <Crown className="h-5 w-5" />
            </div>
            <span className="bn-display text-lg text-slate-900 sm:text-xl">{site_name}</span>
          </Link>
          <Link to="/distributor-apply" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-4 py-2 text-xs font-bold text-white shadow-md sm:text-sm">
            আবেদন করুন <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 md:pt-20">
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-80 w-80 rounded-full bg-indigo-300/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -top-10 -right-20 h-80 w-80 rounded-full bg-fuchsia-300/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/2 h-72 w-96 -translate-x-1/2 rounded-full bg-violet-300/40 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-4 py-1.5 text-xs font-bold text-indigo-700 sm:text-sm">
            <Sparkles className="h-4 w-4" />
            অফিসিয়াল এজেন্ট প্রোগ্রাম
          </span>

          <h1 className="bn-display mt-6 text-[2.4rem] leading-[1.05] text-slate-900 sm:text-6xl md:text-7xl">
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">ডিস্ট্রিবিউটর</span> হোন
            <br /> নিজের এলাকায় ব্যবসা গড়ুন
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
            {site_name} এর অফিসিয়াল ডিস্ট্রিবিউটর হয়ে যান — অ্যাপ্রুভালের সাথে সাথে
            পেয়ে যান <span className="font-bold text-fuchsia-700">৳২৫,০০০ ইনস্ট্যান্ট ব্যালেন্স</span>,
            প্রতি বিক্রয়ে ৫% কমিশন এবং নিজস্ব ইউজার প্যানেল।
          </p>

          {/* Highlight card */}
          <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-2xl shadow-violet-500/30 ring-1 ring-white/20">
            <div className="flex items-center justify-center gap-3">
              <Gift className="h-8 w-8 text-yellow-200" />
              <div className="text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">অ্যাপ্রুভালের সাথে সাথেই</p>
                <p className="bn-display text-3xl sm:text-4xl">৳২৫,০০০ ইনস্ট্যান্ট ব্যালেন্স</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/distributor-apply" className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-violet-500/30 transition-all hover:-translate-y-0.5 sm:w-auto">
              এখনই আবেদন করুন <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/" className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-soft transition-colors hover:border-indigo-400 sm:w-auto">
              হোমপেজে ফিরুন
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-fuchsia-700">সুবিধাসমূহ</span>
          <h2 className="bn-display mt-4 text-3xl text-slate-900 sm:text-4xl md:text-5xl">এজেন্ট হওয়ার সুবিধা কী?</h2>
          <p className="mt-3 text-slate-600">নিচের সবগুলো সুবিধা আপনি একবার অ্যাপ্রুভ হলেই পাবেন</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className={`group relative overflow-hidden rounded-2xl border ${b.border} bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-pop`}>
              <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${b.blob} blur-2xl opacity-70`} />
              <div className={`relative inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${b.gradient} text-white shadow-md transition-transform group-hover:scale-110`}>
                <b.Icon className="h-6 w-6" />
              </div>
              <h3 className="bn-display relative mt-4 text-xl text-slate-900">{b.title}</h3>
              <p className="relative mt-2 text-sm text-slate-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — 4 steps */}
      <section className="bg-gradient-to-b from-indigo-50/50 to-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">প্রসেস</span>
          <h2 className="bn-display mt-4 text-3xl text-slate-900 sm:text-4xl">মাত্র ৪ ধাপে শুরু</h2>
        </div>
        <div className="relative mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="absolute -top-3 -left-3 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-sm font-bold text-white shadow-md">
                {["১","২","৩","৪"][i]}
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white shadow-md">
                <s.Icon className="h-5 w-5" />
              </div>
              <h3 className="bn-display mt-3 text-lg text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eligibility */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="bn-display text-2xl text-slate-900 sm:text-3xl">যোগ্যতা</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ELIGIBILITY.map((e) => (
              <div key={e} className="flex items-start gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-emerald-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-slate-700">{e}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gradient-to-b from-white to-fuchsia-50/40 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-fuchsia-700">প্রশ্নোত্তর</span>
            <h2 className="bn-display mt-4 text-3xl text-slate-900 sm:text-4xl">সাধারণ প্রশ্ন</h2>
          </div>
          <div className="mt-8 space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft open:border-indigo-300 open:shadow-md">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="bn-display text-lg text-slate-900">{f.q}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 sm:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-center text-white shadow-2xl shadow-violet-500/30">
          <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.3),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(255,255,255,0.2),transparent_40%)]" />
          <div className="relative">
            <Star className="mx-auto h-10 w-10 text-yellow-200" />
            <h2 className="bn-display mt-4 text-3xl sm:text-5xl">আজই শুরু করুন</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/90">
              আবেদন সম্পূর্ণ করুন — আমাদের টিম ২৪ ঘণ্টার মধ্যে যোগাযোগ করবে।
            </p>
            <Link to="/distributor-apply" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-indigo-700 shadow-xl transition-transform hover:-translate-y-0.5">
              এখনই আবেদন করুন <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500 sm:px-6">
        © {new Date().getFullYear()} {site_name} — সকল অধিকার সংরক্ষিত
      </footer>
    </div>
  );
}

const BENEFITS = [
  { Icon: Wallet, title: "৳২৫,০০০ ইনস্ট্যান্ট ব্যালেন্স", desc: "অ্যাপ্রুভালের সাথে সাথেই একাউন্টে ক্রেডিট।", gradient: "from-emerald-500 to-teal-600", border: "border-emerald-200", blob: "bg-emerald-300/40" },
  { Icon: Award, title: "৫% বিক্রয় কমিশন", desc: "প্রতিটি প্যাকেজ বিক্রয়ে সরাসরি কমিশন পাবেন।", gradient: "from-amber-500 to-orange-600", border: "border-amber-200", blob: "bg-amber-300/40" },
  { Icon: Users, title: "নিজস্ব ইউজার প্যানেল", desc: "আপনার অধীনে থাকা ইউজারদের ম্যানেজ করুন।", gradient: "from-sky-500 to-blue-600", border: "border-sky-200", blob: "bg-sky-300/40" },
  { Icon: TrendingUp, title: "রিয়েল-টাইম ড্যাশবোর্ড", desc: "আয়, ইউজার ও পারফরম্যান্স লাইভ দেখুন।", gradient: "from-violet-500 to-purple-600", border: "border-violet-200", blob: "bg-violet-300/40" },
  { Icon: BadgeCheck, title: "অফিসিয়াল ডিস্ট্রিবিউটর ব্যাজ", desc: "আপনার প্রোফাইলে ভেরিফায়েড এজেন্ট ব্যাজ।", gradient: "from-rose-500 to-pink-600", border: "border-rose-200", blob: "bg-rose-300/40" },
  { Icon: HeartHandshake, title: "ট্রেনিং ও সাপোর্ট", desc: "শুরু থেকে সম্পূর্ণ গাইডলাইন ও ২৪/৭ সাপোর্ট।", gradient: "from-indigo-500 to-fuchsia-600", border: "border-indigo-200", blob: "bg-indigo-300/40" },
];

const STEPS = [
  { Icon: Sparkles, title: "আবেদন করুন", desc: "সংক্ষিপ্ত ফর্ম পূরণ করে আবেদন সাবমিট করুন।" },
  { Icon: ShieldCheck, title: "রিভিউ", desc: "আমাদের টিম আপনার তথ্য যাচাই করবে।" },
  { Icon: Zap, title: "অ্যাপ্রুভাল", desc: "অ্যাপ্রুভ হলে লগইন তথ্য পাঠানো হবে।" },
  { Icon: Trophy, title: "ইনকাম শুরু", desc: "৳২৫,০০০ ব্যালেন্স ও প্যানেলে ঢুকে কাজ শুরু।" },
];

const ELIGIBILITY = [
  "বয়স ন্যূনতম ১৮ বছর",
  "স্মার্টফোন ও ইন্টারনেট সংযোগ",
  "নিজের এলাকায় পরিচিতি ও বিশ্বাসযোগ্যতা",
  "প্রতিদিন কমপক্ষে ২-৩ ঘণ্টা সময়",
  "বিকাশ / নগদ / রকেট একাউন্ট",
  "সৎ ও দায়িত্বশীল মনোভাব",
];

const FAQ = [
  { q: "আবেদন করতে কি টাকা লাগবে?", a: "না, আবেদন সম্পূর্ণ ফ্রি। কোনো প্রকার ফি প্রদানের প্রয়োজন নেই।" },
  { q: "কত দিনে অ্যাপ্রুভ হবে?", a: "সাধারণত ২৪ ঘণ্টার মধ্যে আপনার আবেদন রিভিউ করে সিদ্ধান্ত জানানো হয়।" },
  { q: "৳২৫,০০০ ব্যালেন্স কি সরাসরি তোলা যাবে?", a: "এই ব্যালেন্স ডিস্ট্রিবিউটর প্যানেলে ব্যবহারযোগ্য — কমিশন যোগ হওয়ার পর নির্দিষ্ট নিয়মে উইথড্র করা যাবে।" },
  { q: "কমিশন কিভাবে পাব?", a: "আপনার রেফারেন্সে হওয়া প্রতিটি প্যাকেজ বিক্রয়ে ৫% কমিশন সরাসরি ডিস্ট্রিবিউটর ব্যালেন্সে যোগ হবে।" },
  { q: "একাধিক জেলায় কাজ করা যাবে?", a: "হ্যাঁ, তবে প্রাথমিকভাবে আপনার নির্ধারিত এলাকায় ফোকাস করা বাঞ্ছনীয়।" },
];
