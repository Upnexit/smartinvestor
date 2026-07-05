import { createFileRoute, Link } from "@tanstack/react-router";
import {
  UserPlus,
  MousePointerClick,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Gift,
  Clock,
  Smartphone,
  ArrowRight,
  Sparkles,
  BadgeDollarSign,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "কিভাবে কাজ করে — Smart Investor" },
      {
        name: "description",
        content:
          "মাত্র ৩ ধাপে Smart Investor শুরু করুন — একাউন্ট তৈরি, প্রতিদিনের টাস্ক এবং ইনস্ট্যান্ট পেমেন্ট। বিস্তারিত পদ্ধতি ও আয়ের হিসাব দেখুন।",
      },
      { property: "og:title", content: "কিভাবে কাজ করে — Smart Investor" },
      {
        property: "og:description",
        content:
          "একাউন্ট তৈরি থেকে টাকা তোলা পর্যন্ত সম্পূর্ণ গাইড — সহজ ভাষায়, বিস্তারিতভাবে।",
      },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    id: 1,
    Icon: UserPlus,
    tone: "amber",
    title: "একাউন্ট তৈরি করুন",
    subtitle: "মাত্র ১ মিনিটে ফ্রি রেজিস্ট্রেশন",
    intro:
      "Smart Investor-এ যাত্রা শুরু করতে প্রথমে একটি ফ্রি একাউন্ট তৈরি করতে হবে। কোনো ফি বা চার্জ নেই।",
    details: [
      "হোমপেজে গিয়ে “রেজিস্টার” বাটনে ক্লিক করুন।",
      "আপনার পূর্ণ নাম, ফোন নম্বর/ইমেইল ও একটি শক্তিশালী পাসওয়ার্ড দিন।",
      "যদি কারো রেফার কোড থাকে, সেটি বসিয়ে দিন — আপনি ও আপনার রেফারার উভয়েই বোনাস পাবেন।",
      "একাউন্ট তৈরি হলে সরাসরি ড্যাশবোর্ডে প্রবেশ করবেন।",
      "প্রথম লগইনের পর প্রোফাইল সম্পূর্ণ করুন এবং পেমেন্ট মেথড (bKash / Nagad / Rocket) যুক্ত করুন।",
    ],
    tip: "সঠিক পেমেন্ট নম্বর দিন — যেই নম্বরে টাকা তুলতে চান শুধু সেটিই ব্যবহার করবেন।",
    ctaLabel: "এখনই একাউন্ট তৈরি করুন",
    ctaTo: "/auth",
  },
  {
    id: 2,
    Icon: MousePointerClick,
    tone: "emerald",
    title: "টাস্ক সম্পন্ন করুন",
    subtitle: "প্রতিদিন সহজ কাজ, ঘরে বসেই আয়",
    intro:
      "লগইনের পর ড্যাশবোর্ডে প্রতিদিন নতুন টাস্ক দেখতে পাবেন — লাইক, কমেন্ট, ফলো, ভিডিও দেখা ইত্যাদি।",
    details: [
      "ড্যাশবোর্ড থেকে “Available Tasks” সেকশনে যান।",
      "যেকোনো একটি টাস্কে ক্লিক করুন — নির্দেশনা পড়ুন।",
      "নির্দেশনা অনুযায়ী কাজ সম্পন্ন করুন (যেমন: লিংকে গিয়ে লাইক/ফলো করা)।",
      "কাজ শেষে “Submit” বাটনে ক্লিক করুন — সাথে সাথে ব্যালেন্স যোগ হবে।",
      "প্রতিটি টাস্কের পাশে নির্দিষ্ট আয় (৳) দেখানো থাকে, বুঝে-শুনে পছন্দমতো নিন।",
    ],
    tip: "প্রতিদিন লগইন করলে ডেইলি বোনাস পাবেন — সাথে সাথে আয় বাড়বে।",
    ctaLabel: "টাস্ক শুরু করুন",
    ctaTo: "/dashboard",
  },
  {
    id: 3,
    Icon: Wallet,
    tone: "rose",
    title: "ইনস্ট্যান্ট পেমেন্ট নিন",
    subtitle: "মাত্র ১০০ টাকা থেকেই উইথড্র",
    intro:
      "আপনার ব্যালেন্স ১০০ টাকা বা তার বেশি হলেই যেকোনো সময় উইথড্র রিকোয়েস্ট দিতে পারবেন।",
    details: [
      "ড্যাশবোর্ড থেকে “Withdraw” অপশনে যান।",
      "পেমেন্ট মেথড সিলেক্ট করুন — bKash, Nagad বা Rocket।",
      "যত টাকা তুলতে চান সেই এমাউন্ট লিখুন (সর্বনিম্ন ১০০৳)।",
      "রিকোয়েস্ট Submit করুন — সাধারণত কয়েক মিনিটের মধ্যেই টাকা চলে আসবে।",
      "পেমেন্ট হিস্ট্রি সবসময় “Transactions” পেজে দেখতে পাবেন।",
    ],
    tip: "একই দিনে একাধিকবারও উইথড্র করা যায় — কোনো লুকানো চার্জ নেই।",
    ctaLabel: "উইথড্র পদ্ধতি দেখুন",
    ctaTo: "/dashboard",
  },
] as const;

const TONES: Record<string, { ring: string; bg: string; text: string; chip: string; grad: string }> = {
  amber: {
    ring: "ring-amber-200",
    bg: "bg-amber-500",
    text: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
    grad: "from-amber-400 to-orange-500",
  },
  emerald: {
    ring: "ring-emerald-200",
    bg: "bg-emerald-500",
    text: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    grad: "from-emerald-400 to-emerald-600",
  },
  rose: {
    ring: "ring-rose-200",
    bg: "bg-rose-500",
    text: "text-rose-700",
    chip: "bg-rose-100 text-rose-700",
    grad: "from-rose-400 to-rose-600",
  },
};

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-emerald-50">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" /> সম্পূর্ণ গাইড
          </span>
          <h1 className="bn-display mt-4 text-4xl leading-tight text-slate-900 sm:text-5xl">
            কিভাবে কাজ করে <span className="text-emerald-600">Smart Investor</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            মাত্র ৩টি সহজ ধাপে আপনি ঘরে বসেই আয় শুরু করতে পারবেন — একাউন্ট তৈরি,
            টাস্ক সম্পন্ন এবং ইনস্ট্যান্ট পেমেন্ট। নিচে প্রতিটি ধাপের বিস্তারিত পদ্ধতি
            দেওয়া হলো।
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition hover:brightness-110"
            >
              এখনই শুরু করুন <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
            >
              হোমে ফিরে যান
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {STEPS.map((s) => {
            const t = TONES[s.tone];
            return (
              <div
                key={s.id}
                id={`step-${s.id}`}
                className={`scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ${t.ring}`}
              >
                <div className={`bg-gradient-to-r ${t.grad} px-6 py-6 text-white sm:px-8`}>
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/40 backdrop-blur-sm">
                      <s.Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-white/80">
                        ধাপ {["১", "২", "৩"][s.id - 1]}
                      </div>
                      <h2 className="bn-display text-2xl leading-tight sm:text-3xl">
                        {s.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-white/90">{s.subtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <p className="text-slate-700">{s.intro}</p>

                  <ol className="mt-5 space-y-3">
                    {s.details.map((d, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full ${t.bg} text-xs font-bold text-white`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-slate-700">{d}</span>
                      </li>
                    ))}
                  </ol>

                  <div className={`mt-6 rounded-2xl ${t.chip} px-4 py-3 text-sm`}>
                    <span className="font-bold">💡 টিপস: </span>
                    {s.tip}
                  </div>

                  <div className="mt-5">
                    <Link
                      to={s.ctaTo}
                      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${t.grad} px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]`}
                    >
                      {s.ctaLabel} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Earnings */}
      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-700">
              <BadgeDollarSign className="h-3.5 w-3.5" /> আয়ের হিসাব
            </span>
            <h2 className="bn-display mt-3 text-3xl text-slate-900 sm:text-4xl">
              আপনি কত টাকা আয় করতে পারবেন?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              আপনার আয় নির্ভর করে প্রতিদিন কতটি টাস্ক সম্পন্ন করছেন এবং কতজনকে রেফার
              করেছেন তার উপর। নিচে একটি সাধারণ ধারণা দেওয়া হলো:
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "প্রতিদিন", amount: "৳৫০ – ৳২০০", note: "সাধারণ টাস্ক থেকে" },
              { label: "সাপ্তাহিক", amount: "৳৩৫০ – ৳১,৪০০", note: "নিয়মিত ব্যবহারে" },
              { label: "মাসিক", amount: "৳১,৫০০ – ৳৬,০০০+", note: "রেফার বোনাস সহ" },
            ].map((e) => (
              <div
                key={e.label}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/50 p-6 text-center shadow-soft"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {e.label}
                </div>
                <div className="bn-display mt-2 text-2xl text-emerald-700 sm:text-3xl">
                  {e.amount}
                </div>
                <div className="mt-1 text-xs text-slate-500">{e.note}</div>
              </div>
            ))}
          </div>

          <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
            * উপরের এমাউন্ট আনুমানিক — প্রকৃত আয় নির্ভর করে আপনার কার্যকলাপ ও উপলব্ধ টাস্কের উপর।
          </p>
        </div>
      </section>

      {/* Extras */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="bn-display text-center text-3xl text-slate-900 sm:text-4xl">
            আরও যা যা পাবেন
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { Icon: Gift, title: "রেফার বোনাস", desc: "প্রতিটি সফল রেফারের জন্য বোনাস + কমিশন।", tone: "bg-rose-500" },
              { Icon: Clock, title: "২৪/৭ টাস্ক", desc: "দিন-রাত যেকোনো সময় কাজ করুন।", tone: "bg-amber-500" },
              { Icon: ShieldCheck, title: "১০০% নিরাপদ", desc: "আপনার তথ্য ও পেমেন্ট সম্পূর্ণ সুরক্ষিত।", tone: "bg-emerald-500" },
              { Icon: Smartphone, title: "মোবাইল অ্যাপ", desc: "PWA হিসেবে হোম স্ক্রিনে ইনস্টল করুন।", tone: "bg-sky-500" },
              { Icon: CheckCircle2, title: "ইনস্ট্যান্ট পেমেন্ট", desc: "রিকোয়েস্টের সাথে সাথেই টাকা।", tone: "bg-violet-500" },
              { Icon: Users, title: "সাপোর্ট টিম", desc: "যেকোনো সমস্যায় সরাসরি যোগাযোগ।", tone: "bg-orange-500" },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
                <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl ${f.tone} text-white`}>
                  <f.Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="bn-display text-lg text-slate-900">{f.title}</h3>
                  <p className="text-sm text-slate-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-8 text-center text-white shadow-2xl sm:p-12">
          <h2 className="bn-display text-3xl leading-tight sm:text-4xl">
            আজই শুরু করুন আপনার আয়ের যাত্রা
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            ফ্রি রেজিস্ট্রেশন — কোনো ঝামেলা নেই। মাত্র ১ মিনিটে একাউন্ট তৈরি করে
            আজই প্রথম টাকা আয় করুন।
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-rose-600 shadow-lg transition hover:bg-slate-50"
            >
              রেজিস্টার করুন <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/install"
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur-sm hover:bg-white/30"
            >
              অ্যাপ ইনস্টল করুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
