import { useEffect, useState } from "react";
import { AlertTriangle, PhoneCall, ShieldAlert, Timer } from "lucide-react";
import { SHUTDOWN_AT } from "@/lib/shutdown-schedule";

/** Full-screen countdown shown inside the admin panel between 11:00–12:00 BD. */
export function ShutdownCountdownScreen() {
  const [left, setLeft] = useState(() => Math.max(0, SHUTDOWN_AT - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, SHUTDOWN_AT - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  const s = Math.floor(left / 1000);
  const parts = [
    { v: Math.floor(s / 3600), l: "ঘন্টা" },
    { v: Math.floor((s % 3600) / 60), l: "মিনিট" },
    { v: s % 60, l: "সেকেন্ড" },
  ];
  const pct = Math.max(0, Math.min(100, (left / 3_600_000) * 100));

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <style>{`
        @keyframes sd-grad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes sd-blob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(24px,-16px) scale(1.08)}}
        @keyframes sd-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}
        .sd-bg{background:linear-gradient(120deg,#450a0a,#0f172a,#7f1d1d,#1e1b4b);background-size:400% 400%;animation:sd-grad 18s ease-in-out infinite}
        .sd-blob{animation:sd-blob 13s ease-in-out infinite}
        .sd-pulse{animation:sd-pulse 2.2s ease-in-out infinite}
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 sd-bg" />
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-rose-600/30 blur-3xl sd-blob" />
        <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl sd-blob" style={{ animationDelay: "-6s" }} />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-rose-400/25 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-2xl sd-pulse" />
            <div className="absolute inset-2 grid place-items-center rounded-full bg-gradient-to-br from-rose-500 via-red-600 to-orange-600 shadow-xl ring-2 ring-white/20">
              <AlertTriangle className="h-9 w-9" strokeWidth={2.2} />
            </div>
          </div>

          <h1 className="bn-display text-center text-2xl leading-tight sm:text-3xl">
            আপনার হাতে সময় বাকি আছে
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-300">
            এগ্রিমেন্ট অনুযায়ী নির্ধারিত সময়ের মধ্যে পেমেন্ট সম্পন্ন না হলে দুপুর ১২:০০টায়
            (বাংলাদেশ সময়) সম্পূর্ণ সিস্টেম বন্ধ হয়ে যাবে।
          </p>

          <div className="mt-8 rounded-2xl border border-rose-400/25 bg-black/25 p-5">
            <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-200">
              <Timer className="h-4 w-4" /> সময় বাকি
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {parts.map((x) => (
                <div key={x.l} className="rounded-xl bg-gradient-to-br from-rose-500/25 to-red-700/15 p-3 text-center ring-1 ring-rose-400/30">
                  <p className="bn-display text-3xl tabular-nums sm:text-4xl">{String(x.v).padStart(2, "0")}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rose-200 sm:text-xs">{x.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-red-600 transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border-l-4 border-rose-500 bg-rose-950/50 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm font-semibold leading-relaxed text-rose-200">
                এই কাউন্টডাউন শেষ হওয়ার আগে ডেভেলপারের সাথে যোগাযোগ করে পেমেন্ট সম্পন্ন না করলে
                সম্পূর্ণ সাইট ও ডেটা এগ্রিমেন্ট অনুযায়ী ডিলিট হয়ে যাবে।
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-700 px-5 py-3 text-sm font-bold shadow-lg ring-1 ring-white/20">
              <PhoneCall className="h-4 w-4" /> দ্রুত ডেভেলপারের সাথে যোগাযোগ করুন
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
