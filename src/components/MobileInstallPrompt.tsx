import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, X, Smartphone } from "lucide-react";

const STORAGE_KEY = "si_mobile_install_prompt_seen";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  return uaMobile || window.matchMedia("(max-width: 767px)").matches;
}

function isAlreadyInstalled() {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

// Routes where the install modal must NOT auto-open (would block CTAs)
const BLOCKED_PATHS = ["/our-packages", "/packages", "/checkout", "/auth", "/register", "/install"];

export function MobileInstallPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAlreadyInstalled()) return;
    if (!isMobileViewport()) return;
    // Do not interrupt the purchase / auth flow
    const path = window.location.pathname;
    if (BLOCKED_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch { /* ignore */ }

    const t = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(t);
  }, []);


  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* ignore */ }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-5 backdrop-blur-sm md:hidden"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="বন্ধ করুন"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-slate-500 shadow ring-1 ring-slate-200 hover:bg-white hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-6 pb-8 pt-9 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/40">
            <Smartphone className="h-8 w-8" />
          </div>
          <h2 className="bn-display mt-4 text-xl font-bold leading-tight">
            অ্যাপটি ইনস্টল করুন
          </h2>
          <p className="mt-1.5 text-sm text-white/90">
            দ্রুত ও সহজে ব্যবহারের জন্য
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5 text-center">
          <p className="text-sm leading-relaxed text-slate-600">
            Smart Investor অ্যাপটি আপনার ফোনে ইনস্টল করুন এবং হোম স্ক্রিন থেকে সরাসরি
            চালু করুন — দ্রুত, স্মুথ এবং সবসময় হাতের কাছে।
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            <Link
              to="/install"
              onClick={dismiss}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/30 transition active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              এখনই ইনস্টল করুন
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              পরে করবো
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
