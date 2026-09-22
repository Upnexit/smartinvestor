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
function IllustratedAvatar({ className }: { seed?: number; className?: string }) {
  return (
    <div
      className={`relative rounded-full overflow-hidden p-[2.5px] bg-[#E0852B] shadow-xs flex items-center justify-center shrink-0 ${
        className || "w-12 h-12"
      }`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#D3EEFB] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          {/* Base background circle */}
          <circle cx="50" cy="50" r="50" fill="#D3EEFB" />

          {/* Blue Suit Jacket - Shoulders */}
          <path
            d="M 12 100 C 13 75 32 64 50 64 C 68 64 87 75 88 100 Z"
            fill="#2970BF"
          />

          {/* Darker lapel shadows on jacket sides */}
          <path
            d="M 18 100 C 20 80 32 68 44 65 L 37 84 L 26 100 Z"
            fill="#1E5799"
          />
          <path
            d="M 82 100 C 80 80 68 68 56 65 L 63 84 L 74 100 Z"
            fill="#1E5799"
          />

          {/* Crisp White Shirt Collar (V shape) */}
          <polygon points="41,64 50,88 59,64" fill="#FFFFFF" />
          <polygon points="36,65 44,65 41,74" fill="#FFFFFF" />
          <polygon points="64,65 56,65 59,74" fill="#FFFFFF" />

          {/* Red/Orange Tie Knot */}
          <polygon points="46,67 54,67 53,74 47,74" fill="#C93D17" />

          {/* Red/Orange Tie Blade */}
          <polygon points="47,74 53,74 55,95 50,100 45,95" fill="#E85626" />

          {/* Neck */}
          <rect x="44" y="54" width="12" height="13" rx="1" fill="#F8D3B7" />

          {/* Ears */}
          <circle cx="33" cy="46" r="4" fill="#F8D3B7" />
          <circle cx="67" cy="46" r="4" fill="#F8D3B7" />

          {/* Head / Face */}
          <ellipse cx="50" cy="45" rx="17" ry="19" fill="#FFDFC6" />

          {/* Hair - exact smooth side-parted hairstyle from reference image */}
          <path
            d="M 31 43 C 30 24 43 17 53 17 C 66 17 71 24 69 43 C 65 31 56 28 47 28 C 37 28 33 34 31 43 Z"
            fill="#2E373F"
          />
          {/* Clean sideburns */}
          <path d="M 31 41 L 33 46 L 35 44" fill="#2E373F" />
          <path d="M 69 41 L 67 46 L 65 44" fill="#2E373F" />

          {/* Eyes */}
          <circle cx="43.5" cy="44.5" r="1.8" fill="#262F36" />
          <circle cx="56.5" cy="44.5" r="1.8" fill="#262F36" />

          {/* Eyebrows */}
          <path d="M 40.5 41 Q 43.5 39 46.5 41" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 53.5 41 Q 56.5 39 59.5 41" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />

          {/* Nose */}
          <path d="M 50 47.5 L 49 51 L 51 51" stroke="#E2A684" strokeWidth="1.2" strokeLinecap="round" />

          {/* Friendly Smile */}
          <path d="M 46 55 Q 50 57.5 54 55" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />
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

    // Quick initial popup after 1.2 seconds of page load
    const initialTimer = setTimeout(() => {
      if (!unmounted) scheduleNext();
    }, 1200);

    function scheduleNext() {
      if (unmounted) return;
      const nextPayout = getRandomPayout();
      setCurrent(nextPayout);
      setIsVisible(true);

      // Visible for 4.5 seconds
      timerRef.current = setTimeout(() => {
        if (!isHovered.current) {
          setIsVisible(false);
        }

        // Fast & lively interval: repeat every 6 to 10 seconds
        const waitMs = Math.floor(6000 + Math.random() * 4000);
        setTimeout(() => {
          if (!unmounted) scheduleNext();
        }, waitMs);
      }, 4500);
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
      className={`fixed z-40 left-3 sm:left-6 bottom-[92px] sm:bottom-24 lg:bottom-8 max-w-[315px] sm:max-w-[330px] w-[calc(100vw-24px)] sm:w-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
