import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Database, Cookie, Share2, ShieldCheck, UserCog, Mail, FileKey, Baby } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "প্রাইভেসি পলিসি — Smart Click BD" },
      { name: "description", content: "Smart Click BD আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সুরক্ষিত রাখে জানুন।" },
      { property: "og:title", content: "প্রাইভেসি পলিসি — Smart Click BD" },
      { property: "og:description", content: "আপনার ডেটা সুরক্ষা ও গোপনীয়তা সংক্রান্ত সম্পূর্ণ নীতিমালা।" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { site_name } = useSiteSettings();
  const brand = site_name || "Smart Click BD";
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
            <ShieldCheck className="h-4 w-4" /> গোপনীয়তা নীতিমালা
          </div>
          <h1 className="bn-display mt-4 text-4xl leading-tight text-white sm:text-5xl">
            প্রাইভেসি পলিসি
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
            আপনার ব্যক্তিগত তথ্যের সুরক্ষা আমাদের কাছে সর্বোচ্চ অগ্রাধিকার।
          </p>
          <p className="mt-2 text-sm text-white/80">সর্বশেষ আপডেট: {updated}</p>
        </div>
      </section>

      {/* Intro card */}
      <section className="px-4 sm:px-6">
        <div className="relative z-10 -mt-8 mx-auto max-w-4xl rounded-3xl border border-emerald-200 bg-white p-6 shadow-pop ring-4 ring-emerald-50 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h2 className="bn-display text-xl text-emerald-900 sm:text-2xl">
                আমরা আপনার গোপনীয়তায় বিশ্বাসী
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
                {brand} প্ল্যাটফর্ম ব্যবহার করার সময় আপনার যে তথ্য আমরা সংগ্রহ করি, তা
                <b> শুধুমাত্র সেবা প্রদানের উদ্দেশ্যে</b> ব্যবহার করা হয়। আপনার সম্মতি ছাড়া
                কোনো তৃতীয় পক্ষের কাছে আপনার ব্যক্তিগত তথ্য <b>বিক্রি বা হস্তান্তর করা হয় না</b>।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <Section n="১" icon={<Database className="h-5 w-5" />} color="amber" title="আমরা যে তথ্য সংগ্রহ করি">
            <li><b>একাউন্ট তথ্য:</b> নাম, মোবাইল নম্বর, ইমেইল, পাসওয়ার্ড (এনক্রিপ্টেড)।</li>
            <li><b>পেমেন্ট তথ্য:</b> bKash / Nagad / Bank একাউন্ট নম্বর (উইথড্রয়ের জন্য)।</li>
            <li><b>অ্যাক্টিভিটি ডেটা:</b> লগইন সময়, IP address, ডিভাইস তথ্য, ব্রাউজার।</li>
            <li><b>টাস্ক ডেটা:</b> সম্পন্ন টাস্ক, স্ক্রিনশট, রেফারেল লিঙ্ক।</li>
            <li><b>যোগাযোগ:</b> সাপোর্টে পাঠানো মেসেজ ও অভিযোগ।</li>
          </Section>

          <Section n="২" icon={<UserCog className="h-5 w-5" />} color="sky" title="তথ্য কীভাবে ব্যবহার করা হয়">
            <li>একাউন্ট তৈরি, লগইন ও পরিচয় যাচাই করার জন্য।</li>
            <li>টাস্ক অ্যাসাইন, আয় হিসাব ও উইথড্র প্রসেস করার জন্য।</li>
            <li>প্রতারণা, স্প্যাম ও নিরাপত্তা লঙ্ঘন সনাক্ত করার জন্য।</li>
            <li>গুরুত্বপূর্ণ নোটিফিকেশন, আপডেট ও অফার পাঠানোর জন্য।</li>
            <li>প্ল্যাটফর্মের সেবা উন্নয়ন ও পরিসংখ্যান বিশ্লেষণের জন্য।</li>
          </Section>

          <Section n="৩" icon={<FileKey className="h-5 w-5" />} color="emerald" title="তথ্য সুরক্ষা">
            <li>সকল পাসওয়ার্ড <b>হ্যাশ (bcrypt)</b> আকারে সংরক্ষিত হয় — plain text নয়।</li>
            <li>ডেটাবেস <b>Row Level Security (RLS)</b> দ্বারা সুরক্ষিত — প্রতিটি ইউজার শুধু নিজের ডেটা দেখতে পারেন।</li>
            <li>পেমেন্ট তথ্য এনক্রিপ্টেড কানেকশন (HTTPS/TLS) দিয়ে ট্রান্সমিট হয়।</li>
            <li>নিয়মিত সিকিউরিটি অডিট ও ব্যাকআপ পরিচালনা করা হয়।</li>
          </Section>

          <Section n="৪" icon={<Share2 className="h-5 w-5" />} color="violet" title="তৃতীয় পক্ষের সাথে শেয়ারিং">
            <li>আমরা আপনার ব্যক্তিগত তথ্য <b>বিক্রি করি না</b>।</li>
            <li>শুধুমাত্র নিম্নলিখিত ক্ষেত্রে তৃতীয় পক্ষের সাথে শেয়ার হতে পারে:
              <ul className="mt-2 space-y-1 pl-5 text-[13px]">
                <li>• পেমেন্ট গেটওয়ে (bKash, Nagad ইত্যাদি) — উইথড্র প্রসেসের জন্য</li>
                <li>• হোস্টিং সার্ভিস (Supabase, Cloudflare) — ডেটা সংরক্ষণের জন্য</li>
                <li>• আইনগত বাধ্যবাধকতা — সরকারি সংস্থার আদেশ পাওয়া গেলে</li>
              </ul>
            </li>
          </Section>

          <Section n="৫" icon={<Cookie className="h-5 w-5" />} color="amber" title="কুকিজ ও লোকাল স্টোরেজ">
            <li>লগইন সেশন বজায় রাখতে ব্রাউজার কুকিজ / লোকাল স্টোরেজ ব্যবহার করা হয়।</li>
            <li>প্ল্যাটফর্মের কার্যক্ষমতা উন্নত করতে অ্যানালিটিক্স ডেটা সংগ্রহ করা হতে পারে।</li>
            <li>ব্রাউজার সেটিংস থেকে কুকিজ ব্লক করা যায় — তবে কিছু ফিচার কাজ নাও করতে পারে।</li>
          </Section>

          <Section n="৬" icon={<UserCog className="h-5 w-5" />} color="sky" title="আপনার অধিকার">
            <li>যেকোনো সময় নিজের প্রোফাইল তথ্য দেখতে, সম্পাদনা করতে পারবেন।</li>
            <li>একাউন্ট মুছে ফেলতে চাইলে সাপোর্টে অনুরোধ পাঠান।</li>
            <li>প্রমোশনাল নোটিফিকেশন বন্ধ করতে সেটিংস থেকে অপশন নির্বাচন করুন।</li>
            <li>আপনার সম্পর্কে সংগৃহীত তথ্যের কপি চাইতে পারেন।</li>
          </Section>

          <Section n="৭" icon={<Baby className="h-5 w-5" />} color="rose" title="অপ্রাপ্তবয়স্ক ব্যবহারকারী">
            <li>{brand} শুধুমাত্র ১৮ বছর বা তার বেশি বয়সী ব্যবহারকারীদের জন্য।</li>
            <li>জেনেশুনে ১৮ বছরের কম বয়সীদের থেকে তথ্য সংগ্রহ করা হয় না।</li>
            <li>এমন কিছু চিহ্নিত হলে সংশ্লিষ্ট একাউন্ট ও ডেটা তৎক্ষণাৎ মুছে ফেলা হবে।</li>
          </Section>

          {/* Contact */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 ring-1 ring-amber-200 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-amber-600 shadow-soft">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h3 className="bn-display text-lg text-slate-900">প্রাইভেসি সংক্রান্ত প্রশ্ন?</h3>
                <p className="mt-1 text-sm text-slate-700">
                  আপনার গোপনীয়তা সম্পর্কে কোনো প্রশ্ন বা উদ্বেগ থাকলে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/terms"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-50"
                  >
                    শর্তাবলী দেখুন
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition-transform hover:scale-105"
                  >
                    হোমে ফিরুন
                  </Link>
                </div>
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
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-red-500",
    emerald: "from-emerald-500 to-teal-500",
    sky: "from-sky-500 to-indigo-500",
    violet: "from-violet-500 to-fuchsia-500",
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
        {children}
      </ul>
    </div>
  );
}
