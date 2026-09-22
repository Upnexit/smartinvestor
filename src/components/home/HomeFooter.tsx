import { Link } from "@tanstack/react-router";
import {
  ShieldCheck, Mail, Phone, MapPin, ExternalLink, Headphones,
  CheckCircle2, Lock, Sparkles, Send, Award, FileText, ArrowRight
} from "lucide-react";
import { FacebookIcon, YouTubeIcon, FbLikeReaction, FbLoveReaction } from "./FloatingHeroReactions";

export function HomeFooter({ siteName = "Smart Click BD" }: { siteName?: string }) {
  return (
    <footer className="relative overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-slate-100 text-slate-700 pt-16 pb-12">
      {/* Background Soft Glows */}
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/4 h-72 w-96 rounded-full bg-blue-400/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 right-10 h-72 w-80 rounded-full bg-rose-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Trust & Authorization Banner */}
        <div className="mb-12 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">
                    গণপ্রজাতন্ত্রী বাংলাদেশ সরকার ও BTCL অনুমোদিত প্ল্যাটফর্ম
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> ভেরিফাইড
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  বিটিসিএল (BTCL) নিবন্ধিত গেটওয়ে ও বাংলাদেশ ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১ অনুযায়ী সম্পূর্ণ নিরাপদ ও নিয়ন্ত্রিত।
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-200">
                <Lock className="h-3.5 w-3.5 text-emerald-600" /> SSL 256-Bit সিকিউরড
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-200">
                <Award className="h-3.5 w-3.5 text-amber-600" /> ১০০% পেমেন্ট গ্যারান্টি
              </span>
            </div>
          </div>
        </div>

        {/* Main Footer 4-Column Grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 pb-12 border-b border-slate-200/80">
          
          {/* Column 1: Brand Info, Vision & Socials (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Smart Click BD লোগো"
                className="h-11 w-11 rounded-xl object-contain ring-2 ring-amber-300 shadow-md bg-white p-1"
              />
              <div>
                <span className="bn-display text-2xl text-slate-900 leading-tight block font-extrabold">
                  {siteName}
                </span>
                <span className="text-xs text-amber-700 font-semibold tracking-wide">
                  স্মার্ট ক্লিক বিডি — বিশ্বস্ত অনলাইন আর্নিং
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-600 leading-relaxed pr-2">
              বাংলাদেশের সর্ববৃহৎ এবং সর্বাধিক বিশ্বস্ত সোশ্যাল মিডিয়া মাইক্রোটাস্ক আর্নিং প্ল্যাটফর্ম। ঘরে বসে মোবাইল দিয়ে লাইক, কমেন্ট ও সাবস্ক্রাইব করে নিরাপদে প্রতিদিন আয় করুন।
            </p>

            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                অফিসিয়াল সোশ্যাল মিডিয়া
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook Page"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:scale-110 hover:shadow-md hover:ring-blue-400"
                >
                  <FacebookIcon className="h-5 w-5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube Channel"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:scale-110 hover:shadow-md hover:ring-red-400"
                >
                  <YouTubeIcon className="h-5 w-5" />
                </a>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Telegram Community"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 text-sky-500 transition-all hover:scale-110 hover:shadow-md hover:ring-sky-400"
                >
                  <Send className="h-5 w-5" />
                </a>
                <div className="flex items-center gap-1.5 pl-2 text-xs font-bold text-slate-600">
                  <FbLikeReaction className="h-5 w-5" />
                  <FbLoveReaction className="h-5 w-5" />
                  <span>৫০k+ মেম্বার</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links & Services (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="bn-display text-base font-bold text-slate-900 border-l-2 border-amber-500 pl-2">
              প্রয়োজনীয় লিংক
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/how-it-works" className="transition hover:text-amber-600 flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  কিভাবে কাজ করে
                </Link>
              </li>
              <li>
                <a href="#earning" className="transition hover:text-amber-600 flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  আর্নিং প্যাকেজ
                </a>
              </li>
              <li>
                <Link to="/distributor-info" className="transition hover:text-amber-600 flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  ডিস্ট্রিবিউটর হোন
                </Link>
              </li>
              <li>
                <Link to="/community" className="transition hover:text-amber-600 flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  ইউজার লিডারবোর্ড
                </Link>
              </li>
              <li>
                <Link to="/install" className="transition hover:text-amber-600 flex items-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                  মোবাইল অ্যাপ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Security Policies (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="bn-display text-base font-bold text-slate-900 border-l-2 border-emerald-500 pl-2">
              আইনগত ও পলিসি
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link to="/terms" className="transition hover:text-emerald-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  ব্যবহারের সাধারণ শর্তাবলী
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="transition hover:text-emerald-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  প্রাইভেসি ও ডাটা সুরক্ষা পলিসি
                </Link>
              </li>
              <li>
                <Link to="/terms" hash="withdraw" className="transition hover:text-emerald-700 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" />
                  উইথড্র ও পেমেন্ট রুলস
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ট্রেড লাইসেন্স নং: TRAD/DNCC/029411
                </span>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  BTCL অথোরাইজড ডিজিটাল নেটওয়ার্ক
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4: Official Locations & Support (3 Cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="bn-display text-base font-bold text-slate-900 border-l-2 border-rose-500 pl-2">
              অফিস ঠিকানা ও সাপোর্ট
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">হেড অফিস (ঢাকা):</strong>
                  ই/১৩-এ, আইসিটি টাওয়ার সংলগ্ন, আগারগাঁও প্রশাসনিক এলাকা, শেরেবাংলা নগর, ঢাকা-১২০৭।
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 font-bold block">অপারেশনাল অফিস (গাজীপুর):</strong>
                  হাজী মার্কেট কমপ্লেক্স, চান্দনা চৌরাস্তা, গাজীপুর সিটি কর্পোরেশন, গাজীপুর-১৭০১।
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                <a href="mailto:support@smartclickbd.com" className="font-semibold text-slate-800 hover:text-blue-600 transition">
                  support@smartclickbd.com
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-semibold text-slate-800">
                  ২৪/৭ লাইভ চ্যাট ও সাপোর্ট টিকেট
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Payment Methods & Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="font-bold text-slate-700">অনুমোদিত পেমেন্ট গেটওয়ে:</span>
            <span className="rounded-lg bg-white px-2.5 py-1 font-bold text-pink-600 ring-1 ring-slate-200 shadow-sm">
              বিকাশ (bKash)
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 font-bold text-orange-600 ring-1 ring-slate-200 shadow-sm">
              নগদ (Nagad)
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 font-bold text-purple-600 ring-1 ring-slate-200 shadow-sm">
              রকেট (Rocket)
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 font-bold text-emerald-600 ring-1 ring-slate-200 shadow-sm">
              উপায় (Upay)
            </span>
          </div>

          <div className="text-center md:text-right font-medium">
            © {new Date().getFullYear()} <strong className="text-slate-700">{siteName}</strong> — সর্বস্বত্ব সংরক্ষিত।
          </div>
        </div>

      </div>
    </footer>
  );
}
