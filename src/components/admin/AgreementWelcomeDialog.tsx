import { useState } from "react";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";

export function AgreementWelcomeDialog() {
  const [open, setOpen] = useState(true);

  const close = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 px-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-rose-200/80 animate-admin-pop">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-rose-500 via-red-500 to-amber-600 px-6 py-5 text-white">
          {/* Top-Right Cross Button */}
          <button
            onClick={close}
            aria-label="বন্ধ করুন"
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-xl bg-white/20 text-white backdrop-blur hover:bg-white/30 transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30 shadow-md">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-100">
                সতর্কবার্তা
              </span>
              <h2 className="bn-display text-xl font-bold text-white leading-tight mt-0.5">
                অ্যাডমিন নোটিশ
              </h2>
            </div>
          </div>
        </div>

        {/* Notice Content */}
        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <p className="text-base font-semibold text-slate-800 leading-relaxed">
                এতবার admin panel এ ঢুকতে লাভ নাই।গুয়া মারা  আপনি খেয়েছেন এবং খাবেন।
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center">
            আপনি উপরের ক্রস (×) বা নিচের বাটনে ক্লিক করে এটি বন্ধ করতে পারেন।
          </p>

          <button
            onClick={close}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-amber-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-105 active:scale-98"
          >
            <X className="h-4 w-4" /> বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
