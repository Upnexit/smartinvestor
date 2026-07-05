import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldAlert, FileText, AlertTriangle, ScrollText, Scale, UserCheck, Wallet, Ban, RefreshCw, Mail } from "lucide-react";
import { useState } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "শর্তাবলী — Smart Investor" },
      { name: "description", content: "Smart Investor প্ল্যাটফর্ম ব্যবহারের শর্তাবলী, বিনিয়োগ ঝুঁকি ও দায়বদ্ধতা সংক্রান্ত তথ্য।" },
      { property: "og:title", content: "শর্তাবলী — Smart Investor" },
      { property: "og:description", content: "প্ল্যাটফর্ম ব্যবহারের সম্পূর্ণ শর্তাবলী পড়ুন।" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { site_name } = useSiteSettings();
  const brand = site_name || "Smart Investor";
  const updated = "৫ জুলাই, ২০২৬";

  return (
    <div className="bg-app min-h-screen">
      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 pt-8 pb-14 sm:px-6 sm:pt-12 sm:pb-20"
        style={{ backgroundImage: "linear-gradient(135deg, #f59e0b 0%, #f97316 55%, #e11d48 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -right-16 h-72 w-72 rounded-full bg-yellow-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" /> হোমে ফিরুন
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm sm:text-sm">
            <ScrollText className="h-4 w-4" /> লিগ্যাল ডকুমেন্ট
          </div>
          <h1 className="bn-display mt-4 text-4xl leading-tight text-white sm:text-5xl">
            শর্তাবলী ও নিয়মাবলী
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
            {brand} প্ল্যাটফর্ম ব্যবহারের আগে অনুগ্রহ করে নিচের শর্তাবলী মনোযোগ সহকারে পড়ুন।
          </p>
          <p className="mt-2 text-sm text-white/80">সর্বশেষ আপডেট: {updated}</p>
        </div>
      </section>

      {/* Investor risk disclaimer — prominent */}
      <section className="px-4 sm:px-6">
        <div className="relative z-10 -mt-8 mx-auto max-w-4xl rounded-3xl border-2 border-rose-300 bg-white p-6 shadow-pop ring-4 ring-rose-100 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h2 className="bn-display text-xl text-rose-900 sm:text-2xl">
                গুরুত্বপূর্ণ বিনিয়োগ সতর্কতা
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
                আপনি {brand} প্ল্যাটফর্মে যে কোনো পরিমাণ অর্থ <b>বিনিয়োগ (Invest)</b> করলে,
                সেই বিনিয়োগ সম্পূর্ণভাবে <b>আপনার নিজস্ব সিদ্ধান্ত ও দায়িত্বে</b> করবেন।
                কোনো কারণে আর্থিক ক্ষতি, লোকসান, প্যাকেজ পরিবর্তন, প্রতিষ্ঠান বন্ধ,
                টেকনিক্যাল ত্রুটি অথবা তৃতীয় পক্ষের কারণে সৃষ্ট যেকোনো ক্ষতির জন্য
                <b> {brand} কর্তৃপক্ষ কোনোভাবেই দায়ী থাকবে না।</b> বিনিয়োগের পূর্বে
                নিজে ভালোভাবে যাচাই করুন — এই প্ল্যাটফর্মে অংশগ্রহণ করার অর্থ আপনি
                এই শর্ত মেনে নিয়েছেন।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <Section n="1" icon={<UserCheck className="h-5 w-5" />} color="amber" title="একাউন্ট ও যোগ্যতা">
            <li>{brand} ব্যবহার করতে হলে আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।</li>
            <li>একজন ব্যবহারকারী শুধুমাত্র একটি একাউন্ট খুলতে পারবেন। একাধিক একাউন্ট শনাক্ত হলে সেগুলো ব্যান করা হবে।</li>
            <li>একাউন্ট খোলার সময় সঠিক নাম, মোবাইল নম্বর ও তথ্য প্রদান বাধ্যতামূলক।</li>
            <li>একাউন্টের পাসওয়ার্ড, OTP ও ব্যক্তিগত তথ্য গোপন রাখার দায়িত্ব সম্পূর্ণ ব্যবহারকারীর।</li>
          </Section>

          <Section n="2" icon={<Wallet className="h-5 w-5" />} color="rose" title="বিনিয়োগ ও দায়বদ্ধতা">
            <li>
              প্ল্যাটফর্মে যেকোনো ধরনের প্যাকেজ বা প্ল্যানে অর্থ বিনিয়োগ করা <b>সম্পূর্ণ ব্যবহারকারীর নিজস্ব ঝুঁকি ও সিদ্ধান্ত</b>।
            </li>
            <li>
              বিনিয়োগকৃত অর্থ কোনো কারণে ফেরত না পাওয়া, প্যাকেজ বাতিল, লোকসান
              বা প্রত্যাশিত মুনাফা না আসলে তার জন্য <b>{brand} কর্তৃপক্ষ দায়ী থাকবে না</b>।
            </li>
            <li>
              বাংলাদেশ ব্যাংক বা অন্য কোনো আর্থিক নিয়ন্ত্রক সংস্থার নীতি পরিবর্তন হলে,
              সেই অনুযায়ী প্ল্যাটফর্মের কার্যক্রমও পরিবর্তিত হতে পারে।
            </li>
            <li>
              বিনিয়োগের পূর্বে নিজের সামর্থ্য অনুযায়ী সিদ্ধান্ত নিন — আপনার আর্থিক সক্ষমতার
              বাইরে বিনিয়োগ করা থেকে বিরত থাকুন।
            </li>
          </Section>

          <Section n="৩" icon={<FileText className="h-5 w-5" />} color="emerald" title="আয় ও উইথড্র">
            <li>টাস্ক সম্পন্ন, রেফারেল ও প্যাকেজ থেকে অর্জিত আয়ের হিসাব প্ল্যাটফর্মে দেখানো হবে।</li>
            <li>উইথড্র রিকোয়েস্ট প্রসেসিং-এ ২৪–৭২ ঘণ্টা পর্যন্ত সময় লাগতে পারে।</li>
            <li>ভুল bKash / Nagad / Bank তথ্য দিলে দায়ভার সম্পূর্ণ ব্যবহারকারীর।</li>
            <li>প্রতারণা, ভুয়া টাস্ক বা কারচুপি প্রমাণিত হলে ব্যালেন্স জব্দ ও একাউন্ট বাতিল করা হতে পারে।</li>
          </Section>

          <Section n="৪" icon={<Ban className="h-5 w-5" />} color="rose" title="নিষিদ্ধ কার্যক্রম">
            <li>বট, স্ক্রিপ্ট, VPN বা কোনো অটোমেশন টুল ব্যবহার করা যাবে না।</li>
            <li>ভুয়া লাইক / কমেন্ট / ফেক টাস্ক জমা দেওয়া কঠোরভাবে নিষিদ্ধ।</li>
            <li>অন্য ব্যবহারকারীর একাউন্ট, তথ্য বা রেফারেল লিঙ্কে হস্তক্ষেপ করা নিষিদ্ধ।</li>
            <li>{brand}-এর নাম, লোগো বা ব্র্যান্ড অবৈধভাবে ব্যবহার করা যাবে না।</li>
          </Section>

          <Section n="৫" icon={<Scale className="h-5 w-5" />} color="sky" title="দায় সীমাবদ্ধতা">
            <li>
              টেকনিক্যাল ত্রুটি, সার্ভার ডাউন, ইন্টারনেট সমস্যা বা তৃতীয় পক্ষের (bKash, Nagad,
              সোশ্যাল মিডিয়া API ইত্যাদি) কারণে সৃষ্ট ক্ষতির জন্য {brand} দায়ী নয়।
            </li>
            <li>
              প্রাকৃতিক দুর্যোগ, সরকারি নিষেধাজ্ঞা বা Force Majeure পরিস্থিতিতে সেবা
              সাময়িকভাবে বন্ধ থাকতে পারে।
            </li>
            <li>
              প্ল্যাটফর্মে দেখানো আয়ের উদাহরণ শুধুমাত্র রেফারেন্স — বাস্তব আয় ব্যবহারকারীর
              পরিশ্রম ও সক্রিয়তার ওপর নির্ভরশীল।
            </li>
          </Section>

          <Section n="৬" icon={<RefreshCw className="h-5 w-5" />} color="violet" title="পরিবর্তন ও আপডেট">
            <li>{brand} যেকোনো সময় শর্তাবলী, প্যাকেজ মূল্য, কমিশন হার বা নিয়ম পরিবর্তন করার অধিকার রাখে।</li>
            <li>পরিবর্তন প্ল্যাটফর্মে আপডেট করার পর থেকেই কার্যকর ধরা হবে।</li>
            <li>ব্যবহারকারীদের নিয়মিতভাবে এই পেজটি ভিজিট করে আপডেট দেখার অনুরোধ করা হচ্ছে।</li>
          </Section>

          <Section n="৭" icon={<AlertTriangle className="h-5 w-5" />} color="amber" title="একাউন্ট বাতিল">
            <li>শর্তাবলী লঙ্ঘন করলে পূর্ব নোটিশ ছাড়াই একাউন্ট স্থগিত / বাতিল হতে পারে।</li>
            <li>বাতিলকৃত একাউন্টের অবশিষ্ট ব্যালেন্স ফেরত দেওয়া বা না দেওয়ার সিদ্ধান্ত কর্তৃপক্ষের।</li>
          </Section>

          {/* Contact */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-600 shadow-soft">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="bn-display text-lg text-slate-900">যোগাযোগ</h3>
                <p className="mt-1 text-sm text-slate-700">
                  উপরের কোনো শর্ত সম্পর্কে প্রশ্ন থাকলে সাপোর্ট টিমের সাথে যোগাযোগ করুন।
                </p>
                <Link
                  to="/"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition-transform hover:scale-105"
                >
                  হোমে ফিরুন
                </Link>
              </div>
            </div>
          </div>

          <p className="pt-4 text-center text-xs text-slate-500">
            © 2026 {brand} — সকল অধিকার সংরক্ষিত।
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({
  n, icon, title, color, children,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  color: "amber" | "rose" | "emerald" | "sky" | "violet";
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    amber: "from-amber-500 to-orange-500 ring-amber-100",
    rose: "from-rose-500 to-red-500 ring-rose-100",
    emerald: "from-emerald-500 to-teal-500 ring-emerald-100",
    sky: "from-sky-500 to-indigo-500 ring-sky-100",
    violet: "from-violet-500 to-fuchsia-500 ring-violet-100",
  };
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-100 sm:p-8">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ধারা {n}</span>
          <h2 className="bn-display text-xl text-slate-900 sm:text-2xl">{title}</h2>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5 pl-2 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
        {Array.isArray(children)
          ? children
          : children}
      </ul>
    </div>
  );
}
