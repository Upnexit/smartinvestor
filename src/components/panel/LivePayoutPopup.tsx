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

import { IllustratedAvatar } from "./IllustratedAvatar";


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
