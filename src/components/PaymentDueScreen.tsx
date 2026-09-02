import { useEffect, useState } from "react";
import { AlertTriangle, Lock, PhoneCall, ShieldAlert, Timer } from "lucide-react";

// ============================================================
// SERVICE SUSPENSION / PAYMENT DUE SCREEN
// To disable, open src/routes/__root.tsx and set:
//   const PAYMENT_LOCK = false;
// ============================================================

// Deadline: tomorrow 12:00 PM Bangladesh time (UTC+6)
const DEADLINE = new Date("2026-09-03T12:00:00+06:00").getTime();

function useCountdown(target: number) {
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(left / 1000);
  return {
    expired: left <= 0,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function PaymentDueScreen() {
  const t = useCountdown(DEADLINE);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <style>{`
        @keyframes pd-grad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes pd-blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(28px,-18px) scale(1.08)}66%{transform:translate(-22px,14px) scale(.95)}}
        @keyframes pd-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes pd-scan{0%{transform:translateY(-100%)}100%{transform:translateY(2000%)}}
        .pd-bg{background:linear-gradient(120deg,#450a0a,#0f172a,#7f1d1d,#0f172a,#1e1b4b);background-size:400% 400%;animation:pd-grad 18s ease-in-out infinite}
        .pd-blob{animation:pd-blob 14s ease-in-out infinite}
        .pd-pulse{animation:pd-pulse 2.2s ease-in-out infinite}
        .pd-scan{animation:pd-scan 6s linear infinite}
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 pd-bg" />
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-rose-600/30 blur-3xl pd-blob" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-red-500/20 blur-3xl pd-blob" style={{ animationDelay: "-5s" }} />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl pd-blob" style={{ animationDelay: "-10s" }} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-rose-500/20 to-transparent pd-scan" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-red-700 shadow-lg ring-1 ring-white/20">
              <Lock className="h-5 w-5" />
            </span>
            <span className="bn-display text-xl tracking-wide">Service Suspension Notice</span>
          </div>

          <div className="rounded-3xl border border-rose-400/25 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="relative mx-auto mb-6 h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-2xl pd-pulse" />
              <div className="absolute inset-2 grid place-items-center rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-orange-600 shadow-xl ring-2 ring-white/20">
                <AlertTriangle className="h-10 w-10" strokeWidth={2.2} />
              </div>
            </div>

            <div className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                </span>
                অ্যাক্সেস স্থগিত • ACCESS SUSPENDED
              </span>
            </div>

            <h1 className="bn-display text-center text-3xl leading-tight sm:text-4xl">
              ডেভেলপার পেমেন্ট বকেয়া থাকায়<br className="hidden sm:block" /> ওয়েবসাইটটি বন্ধ রাখা হয়েছে
            </h1>

            <p className="mt-4 text-center text-sm leading-relaxed text-slate-300 sm:text-lg">
              সম্মানিত ক্লায়েন্ট, চুক্তি অনুযায়ী <span className="font-semibold text-rose-300">ডেভেলপমেন্ট ফি পরিশোধ না হওয়ায়</span>{" "}
              এই প্ল্যাটফর্মের সকল সেবা সাময়িকভাবে বন্ধ করে দেওয়া হয়েছে। পুরো পেমেন্ট সম্পন্ন করলে
              সাথে সাথেই সাইটটি পুনরায় চালু করা হবে।
            </p>

            {/* Countdown */}
            <div className="mt-8 rounded-2xl border border-rose-400/25 bg-black/25 p-5">
              <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-200">
                <Timer className="h-4 w-4" />
                চূড়ান্ত সময়সীমা • Final Deadline
              </div>
              {t.expired ? (
                <p className="text-center text-lg font-bold text-rose-300">
                  সময় শেষ — সাইটটি স্থায়ীভাবে বন্ধের প্রক্রিয়া শুরু হয়েছে
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { v: t.d, l: "দিন" },
                    { v: t.h, l: "ঘন্টা" },
                    { v: t.m, l: "মিনিট" },
                    { v: t.s, l: "সেকেন্ড" },
                  ].map((x) => (
                    <div key={x.l} className="rounded-xl bg-gradient-to-br from-rose-500/25 to-red-700/15 p-3 text-center ring-1 ring-rose-400/30">
                      <p className="bn-display text-2xl sm:text-4xl tabular-nums">{String(x.v).padStart(2, "0")}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose-200 sm:text-xs">{x.l}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-center text-xs text-slate-400">
                সময়সীমা: আগামীকাল দুপুর ১২:০০টা (বাংলাদেশ সময়)
              </p>
            </div>

            {/* Red warning line */}
            <div className="mt-6 overflow-hidden rounded-xl border-l-4 border-rose-500 bg-rose-950/50 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <p className="text-sm font-semibold leading-relaxed text-rose-200">
                  সতর্কতা: এই কাউন্টডাউন শেষ হওয়ার আগে ডেভেলপারের সাথে যোগাযোগ করে পেমেন্ট সম্পন্ন
                  না করলে সম্পূর্ণ সাইট, ডেটা ও সার্ভার স্থায়ীভাবে ক্র্যাশ/বন্ধ করে দেওয়া হবে —
                  পরবর্তীতে তা পুনরুদ্ধার করা সম্ভব হবে না।
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 px-5 py-3 text-sm font-bold shadow-lg ring-1 ring-white/20">
                <PhoneCall className="h-4 w-4" />
                অনুগ্রহ করে দ্রুত ডেভেলপারের সাথে যোগাযোগ করুন
              </span>
              <p className="text-center text-xs text-slate-400">
                পেমেন্ট নিশ্চিত হওয়ার সাথে সাথেই এই লক সরিয়ে ফেলা হবে।
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Development Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
