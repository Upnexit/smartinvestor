import { useState, useEffect } from "react";
import {
  Sparkles,
  Zap,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Rocket,
  X,
  ExternalLink,
} from "lucide-react";
import { APP_VERSION, CURRENT_RELEASE_INFO } from "@/config/version";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "si_admin_seen_version";

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function AdminVersionWelcomeModal({ forceOpen = false, onClose }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (forceOpen) {
      setOpen(true);
      return;
    }

    // Check if the current version has already been acknowledged by the admin
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== APP_VERSION) {
      // Small delay to render smoothly after admin authentication
      const timer = setTimeout(() => {
        setOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, APP_VERSION);
    }
    setOpen(false);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-amber-200/80 animate-admin-pop transition-all">
        {/* Top Gradient Banner */}
        <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 px-6 py-7 text-white overflow-hidden">
          {/* Decorative background glow circles */}
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            aria-label="বন্ধ করুন"
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-xl bg-white/15 text-white backdrop-blur hover:bg-white/25 transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-lg">
              <Rocket className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase text-white/95 border border-white/20">
                <Sparkles className="h-3 w-3 text-amber-200" />
                সিস্টেম আপডেট রিলিজ • v{APP_VERSION}
              </div>
              <h2 className="bn-display text-xl sm:text-2xl text-white mt-1 leading-tight font-bold">
                অ্যাডমিন কন্ট্রোল প্যানেলে স্বাগতম!
              </h2>
            </div>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-white/90 leading-relaxed max-w-md">
            {CURRENT_RELEASE_INFO.summary}
          </p>
        </div>

        {/* Modal Body: Highlights & Features */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              প্রধান প্রধান ফিচার ও সমাধানসমূহ
            </p>
            <span className="text-[11px] font-medium text-slate-500">
              তারিখ: {CURRENT_RELEASE_INFO.date}
            </span>
          </div>

          <div className="grid gap-3">
            {CURRENT_RELEASE_INFO.highlights.map((item, idx) => {
              const icons = {
                zap: <Zap className="h-4 w-4 text-amber-500" />,
                camera: <Camera className="h-4 w-4 text-sky-500" />,
                shield: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
                sparkles: <Sparkles className="h-4 w-4 text-purple-500" />,
              };
              const iconEl = icons[item.icon as keyof typeof icons] ?? (
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
              );

              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50 hover:border-amber-200"
                >
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white shadow-sm border border-slate-100">
                    {iconEl}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 leading-snug">
                        {item.title}
                      </p>
                      {item.tag && (
                        <span className="rounded-md bg-amber-100/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 flex items-center gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              সিস্টেমের সমস্ত সার্ভিস ওয়ার্কার ও ব্রাউজার ক্যাশ কনফিগারেশন স্বয়ংক্রিয়ভাবে সিঙ্কড করা হয়েছে।
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <p className="text-[11px] text-slate-500">
            ভার্সন: <span className="font-bold text-slate-700">v{APP_VERSION}</span> • লাইভ
          </p>
          <button
            onClick={handleDismiss}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/30 hover:opacity-95 hover:shadow-lg transition active:scale-98"
          >
            ধন্যবাদ, ড্যাশবোর্ডে যান
          </button>
        </div>
      </div>
    </div>
  );
}
