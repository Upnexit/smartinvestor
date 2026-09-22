import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";

type Method = "bkash" | "nagad" | "rocket";

interface PayoutItem {
  name: string;
  phone: string;
  amount: number;
  method: Method;
  methodLabel: string;
  avatarSeed: number;
}

const NAMES = [
  "জান্নাতুল ফেরদৌস",
  "সাকিব হাসান",
  "তানভীর আহমেদ",
  "মেহেদী হাসান",
  "ফারহানা আক্তার",
  "রাকিবুল ইসলাম",
  "সাব্বির হোসেন",
  "নুসরাত জাহান",
  "কামরুল ইসলাম",
  "রিমন আহমেদ",
  "নাজমুল হক",
  "সুমাইয়া খানম",
  "মাহমুদুল হাসান",
  "তারেক মাহমুদ",
  "মুমতাহিনা রহমান",
  "আশিকুর রহমান",
  "ইমরান খান",
  "শামীম রেজা",
  "আব্দুল্লাহ আল মামুন",
  "সাদিয়া ইসলাম",
];

const PREFIXES = ["017", "018", "019", "016", "013", "014"];
const METHODS: Array<{ key: Method; label: string }> = [
  { key: "nagad", label: "নগদ" },
  { key: "bkash", label: "বিকাশ" },
  { key: "rocket", label: "রকেট" },
];
const AMOUNTS = [480, 650, 850, 1150, 1420, 1680, 1940, 2200, 2550, 2800, 3100, 3500, 4200, 5000];

// Illustrated character avatar with amber circle ring (exact match to reference screenshot)
function IllustratedAvatar({ seed, className }: { seed: number; className?: string }) {
  const styleIdx = seed % 4;

  return (
    <div
      className={`relative rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-amber-400 to-orange-400 shadow-sm flex items-center justify-center ${
        className || "w-12 h-12"
      }`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#DFF2FE] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          {/* Circular background */}
          <circle cx="50" cy="50" r="48" fill="#DFF2FE" />

          {/* Shoulders / Suit */}
          <path
            d="M 16 98 C 18 78 32 68 50 68 C 68 68 82 78 84 98 Z"
            fill={styleIdx % 2 === 0 ? "#1E40AF" : "#0F172A"}
          />

          {/* White Collar / Shirt V */}
          <polygon points="40,68 50,88 60,68 54,68 50,82 46,68" fill="#FFFFFF" />

          {/* Tie (Orange / Amber / Red) */}
          <polygon
            points="48,74 52,74 54,92 50,97 46,92"
            fill={styleIdx === 0 ? "#EA580C" : styleIdx === 1 ? "#DC2626" : "#F59E0B"}
          />
          <polygon points="47,72 53,72 52,76 48,76" fill="#C2410C" />

          {/* Neck */}
          <rect x="44" y="56" width="12" height="15" rx="2" fill="#F8D2B1" />

          {/* Head & Face */}
          <ellipse cx="50" cy="45" rx="16" ry="18" fill="#F8D2B1" />

          {/* Ears */}
          <circle cx="34" cy="46" r="3.5" fill="#F8D2B1" />
          <circle cx="66" cy="46" r="3.5" fill="#F8D2B1" />

          {/* Eyes & Eyebrows */}
          <circle cx="44" cy="44" r="1.8" fill="#1E293B" />
          <circle cx="56" cy="44" r="1.8" fill="#1E293B" />
          <path d="M 41 40 Q 44 38 47 40" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 53 40 Q 56 38 59 40" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />

          {/* Gentle Smile & Nose */}
          <path d="M 49 46 L 48 50 L 51 50" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 45 54 Q 50 57 55 54" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />

          {/* Hair Variations */}
          {styleIdx === 0 && (
            // Classic Dark Side-part Hair
            <path
              d="M 32 44 C 30 28 42 22 52 22 C 64 22 70 28 68 44 C 64 34 56 32 48 32 C 38 32 34 38 32 44 Z"
              fill="#1E293B"
            />
          )}

          {styleIdx === 1 && (
            // Modern Styled Haircut
            <path
              d="M 33 42 C 32 26 44 20 54 20 C 66 20 68 28 67 42 C 63 32 55 30 46 30 C 37 30 35 36 33 42 Z"
              fill="#334155"
            />
          )}

          {styleIdx === 2 && (
            // Short Crop with sideburns
            <path
              d="M 33 46 C 31 30 40 24 50 24 C 62 24 69 30 67 46 C 65 34 58 32 50 32 C 40 32 35 36 33 46 Z"
              fill="#0F172A"
            />
          )}

          {styleIdx === 3 && (
            // Voluminous Top Hair
            <path
              d="M 32 43 C 31 24 43 18 53 18 C 65 18 69 25 68 43 C 64 32 54 30 47 30 C 38 30 35 36 32 43 Z"
              fill="#1F2937"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function getRandomPayout(): PayoutItem {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  // 4 random digits for suffix e.g. 1787
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const phone = `${prefix}****${suffix}`;
  const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  const m = METHODS[Math.floor(Math.random() * METHODS.length)];
  const avatarSeed = Math.floor(Math.random() * 100);

  return {
    name,
    phone,
    amount,
    method: m.key,
    methodLabel: m.label,
    avatarSeed,
  };
}

export function LivePayoutPopup() {
  const [current, setCurrent] = useState<PayoutItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const isHovered = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let unmounted = false;

    // Initial popup after 2.8 seconds of login
    const initialTimer = setTimeout(() => {
      if (!unmounted) scheduleNext();
    }, 2800);

    function scheduleNext() {
      if (unmounted) return;
      const nextPayout = getRandomPayout();
      setCurrent(nextPayout);
      setIsVisible(true);

      // Visible for 4.8 seconds
      timerRef.current = setTimeout(() => {
        if (!isHovered.current) {
          setIsVisible(false);
        }

        // Repeat every 8 to 15 seconds
        const waitMs = Math.floor(8000 + Math.random() * 7000);
        setTimeout(() => {
          if (!unmounted) scheduleNext();
        }, waitMs);
      }, 4800);
    }

    return () => {
      unmounted = true;
      clearTimeout(initialTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!current) return null;

  // Method colors: Nagad (red/orange), bKash (magenta), Rocket (purple)
  const methodColor = {
    nagad: "text-[#EC1C24] font-bold",
    bkash: "text-[#E2136E] font-bold",
    rocket: "text-[#8E2C8B] font-bold",
  }[current.method];

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="পেমেন্ট সফল নোটিফিকেশন"
      onMouseEnter={() => {
        isHovered.current = true;
      }}
      onMouseLeave={() => {
        isHovered.current = false;
        setTimeout(() => setIsVisible(false), 2000);
      }}
      className={`fixed z-40 left-3 sm:left-6 bottom-20 lg:bottom-6 max-w-[315px] sm:max-w-[330px] w-[calc(100vw-24px)] sm:w-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible
          ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
          : "-translate-x-full opacity-0 scale-95 pointer-events-none"
      }`}
    >
      {/* Exact card matching reference screenshot: white card, rounded-2xl, red left-bottom accent border */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-3 sm:p-3.5 shadow-2xl border border-slate-200/70 border-l-[4px] border-l-red-500 border-b-[2px] border-b-red-500/80 flex items-center gap-3">
        {/* Illustrated Avatar with Amber Ring */}
        <div className="shrink-0">
          <IllustratedAvatar seed={current.avatarSeed} className="w-12 h-12" />
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Line 1: User Name & Close Button */}
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-[13px] font-black text-slate-900 truncate leading-tight">
              {current.name}
            </h4>
            <button
              onClick={() => setIsVisible(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition -mr-1 -mt-0.5"
              aria-label="বন্ধ করুন"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Line 2: সফলভাবে ৳amount উত্তোলন করেছেন। */}
          <p className="text-[11px] font-semibold text-slate-700 leading-snug mt-0.5">
            সফলভাবে{" "}
            <span className="font-black text-emerald-600">
              ৳{current.amount}
            </span>{" "}
            উত্তোলন করেছেন।
          </p>

          {/* Line 3: নগদ • 016****1787 */}
          <p className="text-[11px] font-medium text-slate-600 mt-0.5 flex items-center gap-1.5">
            <span className={methodColor}>{current.methodLabel}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-[11px] font-bold tracking-wider text-slate-700">
              {current.phone}
            </span>
          </p>

          {/* Line 4: 🟢 মাত্র সফল হয়েছে */}
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block shadow-xs" />
            <span>মাত্র সফল হয়েছে</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
