import React, { useEffect, useState, useRef } from "react";
import { CheckCircle2, X, TrendingUp, Sparkles } from "lucide-react";

type Method = "bkash" | "nagad" | "rocket";

interface PayoutItem {
  name: string;
  phone: string;
  amount: number;
  method: Method;
  timeAgo: string;
  avatarSeed: number;
}

const NAMES = [
  "সাকিব হাসান", "তানভীর আহমেদ", "মেহেদী হাসান", "ফারহানা আক্তার",
  "রাকিবুল ইসলাম", "সাব্বির হোসেন", "নুসরাত জাহান", "কামরুল ইসলাম",
  "রিমন আহমেদ", "নাজমুল হক", "সুমাইয়া খানম", "মাহমুদুল হাসান",
  "তারেক মাহমুদ", "মুমতাহিনা রহমান", "আশিকুর রহমান", "জান্নাতুল ফেরদৌস",
  "ইমরান খান", "শামীম রেজা", "আব্দুল্লাহ আল মামুন", "সাদিয়া ইসলাম",
  "ফয়সাল আহমেদ", "নাফিসা বিনতে কামাল", "আরিফুল ইসলাম", "তাহমিদ জামান",
];

const PREFIXES = ["017", "018", "019", "016", "013", "014"];
const METHODS: Method[] = ["bkash", "nagad", "rocket"];
const AMOUNTS = [320, 450, 500, 680, 750, 890, 1100, 1250, 1500, 1800, 2100, 2500, 3200, 4500, 5000];
const TIMES = ["এইমাত্র", "১ মিনিট আগে", "২ মিনিট আগে", "কয়েক সেকেন্ড আগে"];

// Realistic hand-crafted vector sketch avatar characters
function SketchAvatar({ seed, className }: { seed: number; className?: string }) {
  // 6 diverse sketch styles (hair, glasses, accessories, expressions)
  const styleIdx = seed % 6;

  // Background pastel sketch tone
  const bgTones = ["#F8FAFC", "#FEF3C7", "#E0F2FE", "#FCE7F3", "#DCFCE7", "#F3E8FF"];
  const bg = bgTones[styleIdx];

  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-slate-700/80 shadow-inner flex items-center justify-center ${className || "w-11 h-11"}`}
      style={{ backgroundColor: bg }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        fill="none"
        stroke="#1E293B"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Head Outline (hand-drawn sketch contour) */}
        <path d="M 30 48 Q 28 80 50 82 Q 72 80 70 48 Q 68 22 50 22 Q 32 22 30 48 Z" fill="#FFF" stroke="#1E293B" strokeWidth="3.2" />

        {/* Style specific hair, eyes, and sketch features */}
        {styleIdx === 0 && (
          <>
            {/* Short Spiky Hair */}
            <path d="M 28 40 Q 32 20 42 16 Q 50 20 58 14 Q 68 20 72 40" fill="#334155" />
            {/* Eyes */}
            <circle cx="43" cy="48" r="2.5" fill="#1E293B" />
            <circle cx="57" cy="48" r="2.5" fill="#1E293B" />
            {/* Friendly Smile */}
            <path d="M 44 62 Q 50 67 56 62" />
            {/* Eyebrows */}
            <path d="M 40 43 Q 44 41 47 43" />
            <path d="M 53 43 Q 56 41 60 43" />
            {/* Nose */}
            <path d="M 50 49 L 48 56 L 52 56" />
          </>
        )}

        {styleIdx === 1 && (
          <>
            {/* Curly/Wavy Hair */}
            <path d="M 27 46 Q 22 28 35 20 Q 50 16 65 20 Q 77 28 73 46 Q 66 30 50 30 Q 34 30 27 46 Z" fill="#475569" />
            {/* Glasses */}
            <rect x="36" y="44" width="11" height="9" rx="3" stroke="#1E293B" strokeWidth="2.5" />
            <rect x="53" y="44" width="11" height="9" rx="3" stroke="#1E293B" strokeWidth="2.5" />
            <path d="M 47 48 L 53 48" strokeWidth="2.5" />
            <circle cx="41.5" cy="48.5" r="1.8" fill="#1E293B" />
            <circle cx="58.5" cy="48.5" r="1.8" fill="#1E293B" />
            {/* Smile */}
            <path d="M 44 64 Q 50 69 56 64" />
            <path d="M 50 54 L 49 58 L 52 58" />
          </>
        )}

        {styleIdx === 2 && (
          <>
            {/* Hijab / Scarf sketch wrap */}
            <path d="M 26 44 Q 28 18 50 18 Q 72 18 74 44 Q 75 75 66 84 Q 50 88 34 84 Q 25 75 26 44 Z" fill="#64748B" stroke="#1E293B" strokeWidth="3" />
            {/* Face opening */}
            <ellipse cx="50" cy="52" rx="14" ry="17" fill="#FFF" stroke="#1E293B" strokeWidth="2.5" />
            {/* Eyes with lashes */}
            <circle cx="44" cy="50" r="2.2" fill="#1E293B" />
            <circle cx="56" cy="50" r="2.2" fill="#1E293B" />
            <path d="M 41 46 Q 44 44 47 46" />
            <path d="M 53 46 Q 56 44 59 46" />
            {/* Nose & Smile */}
            <path d="M 50 51 L 49 55 L 51 55" />
            <path d="M 46 61 Q 50 65 54 61" />
          </>
        )}

        {styleIdx === 3 && (
          <>
            {/* Side-parted Hair */}
            <path d="M 27 40 Q 32 18 50 18 Q 68 18 73 38 Q 60 25 44 26 Q 30 28 27 40 Z" fill="#1E293B" />
            {/* Beard / Stubble sketch */}
            <path d="M 36 62 Q 38 78 50 79 Q 62 78 64 62" strokeDasharray="2 3" strokeWidth="2.5" />
            {/* Eyes */}
            <circle cx="43" cy="47" r="2.2" fill="#1E293B" />
            <circle cx="57" cy="47" r="2.2" fill="#1E293B" />
            {/* Smile */}
            <path d="M 45 63 Q 50 67 55 63" />
            <path d="M 50 49 L 48 55 L 52 55" />
          </>
        )}

        {styleIdx === 4 && (
          <>
            {/* Long Straight Hair */}
            <path d="M 26 50 Q 26 22 50 20 Q 74 22 74 50 L 76 72 Q 74 76 70 76 L 68 50 Q 64 28 50 28 Q 36 28 32 50 L 30 76 Q 26 76 24 72 Z" fill="#334155" />
            {/* Eyes */}
            <circle cx="44" cy="47" r="2.2" fill="#1E293B" />
            <circle cx="56" cy="47" r="2.2" fill="#1E293B" />
            {/* Smile with blush */}
            <path d="M 45 61 Q 50 66 55 61" />
            <circle cx="39" cy="54" r="2.5" fill="#FDA4AF" stroke="none" />
            <circle cx="61" cy="54" r="2.5" fill="#FDA4AF" stroke="none" />
          </>
        )}

        {styleIdx === 5 && (
          <>
            {/* Cap / Beanie sketch */}
            <path d="M 26 40 Q 28 20 50 18 Q 72 20 74 40 Z" fill="#0F172A" />
            <path d="M 24 40 L 76 40" strokeWidth="4" />
            {/* Eyes */}
            <circle cx="43" cy="49" r="2.5" fill="#1E293B" />
            <circle cx="57" cy="49" r="2.5" fill="#1E293B" />
            <path d="M 44 63 Q 50 68 56 63" />
          </>
        )}
      </svg>

      {/* Verified small green checkmark icon */}
      <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white shadow-xs">
        <CheckCircle2 className="w-2.5 h-2.5" />
      </span>
    </div>
  );
}

function getRandomPayout(): PayoutItem {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  // Last 2 digits between 10 and 99
  const last2 = Math.floor(10 + Math.random() * 90);
  const phone = `${prefix}*****${last2}`;
  const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  const method = METHODS[Math.floor(Math.random() * METHODS.length)];
  const timeAgo = TIMES[Math.floor(Math.random() * TIMES.length)];
  const avatarSeed = Math.floor(Math.random() * 100);

  return { name, phone, amount, method, timeAgo, avatarSeed };
}

export function LivePayoutPopup() {
  const [current, setCurrent] = useState<PayoutItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isHovered = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unmounted = false;

    // Trigger initial notification after 3.5 seconds
    const initialDelay = setTimeout(() => {
      if (!unmounted) scheduleNext();
    }, 3500);

    function scheduleNext() {
      if (unmounted) return;
      const nextPayout = getRandomPayout();
      setCurrent(nextPayout);
      setIsVisible(true);

      // Keep it visible for 5.2 seconds
      timerRef.current = setTimeout(() => {
        if (!isHovered.current) {
          setIsVisible(false);
        }

        // Random wait between 9 and 16 seconds for the next popup
        const waitInterval = Math.floor(9000 + Math.random() * 7000);
        setTimeout(() => {
          if (!unmounted) scheduleNext();
        }, waitInterval);
      }, 5200);
    }

    return () => {
      unmounted = true;
      clearTimeout(initialDelay);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!current) return null;

  const methodBadge = {
    bkash:  { label: "bKash",  bg: "bg-[#E2136E]/10 text-[#E2136E] border-[#E2136E]/20" },
    nagad:  { label: "Nagad",  bg: "bg-[#EC1C24]/10 text-[#EC1C24] border-[#EC1C24]/20" },
    rocket: { label: "Rocket", bg: "bg-[#8E2C8B]/10 text-[#8E2C8B] border-[#8E2C8B]/20" },
  }[current.method];

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="সাম্প্রতিক পেমেন্ট নোটিফিকেশন"
      onMouseEnter={() => { isHovered.current = true; }}
      onMouseLeave={() => {
        isHovered.current = false;
        setTimeout(() => setIsVisible(false), 2000);
      }}
      className={`fixed z-40 left-3 sm:left-6 bottom-20 lg:bottom-6 max-w-[340px] w-[calc(100vw-24px)] sm:w-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
          : "-translate-x-full opacity-0 scale-95 pointer-events-none"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 sm:p-3.5 shadow-2xl border border-emerald-500/30 ring-1 ring-black/5 flex flex-col gap-2">
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

        {/* Header row: Live pulse + Status + Gateway badge + Dismiss */}
        <div className="flex items-center justify-between text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-extrabold tracking-tight">পেমেন্ট সফল হয়েছে</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${methodBadge.bg}`}>
              {methodBadge.label}
            </span>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content row: Sketch Avatar + User Info + Amount */}
        <div className="flex items-center gap-3">
          {/* Sketch Profile Image */}
          <SketchAvatar seed={current.avatarSeed} className="w-11 h-11 shrink-0" />

          {/* User Name & Masked Phone */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
              {current.name}
            </p>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tracking-wider">
              {current.phone}
            </p>
          </div>

          {/* Paid Amount */}
          <div className="text-right shrink-0">
            <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 leading-none">
              +৳{current.amount.toLocaleString("bn-BD")}
            </p>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
              {current.timeAgo}
            </p>
          </div>
        </div>

        {/* Micro-footer: Subtext */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> কোম্পানি থেকে ক্যাশআউট প্রেরিত
          </span>
          <span className="font-bold text-slate-500">অনুমোদিত</span>
        </div>
      </div>
    </aside>
  );
}
