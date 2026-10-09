import { useState } from "react";
import { PhoneCall, Copy, Check, MessageSquare, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AdminNoticeLockScreenProps {
  phoneNumber?: string;
}

export function AdminNoticeLockScreen({ phoneNumber = "01720565997" }: AdminNoticeLockScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      toast.success("মোবাইল নম্বরটি কপি করা হয়েছে!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("কপি করা সম্ভব হয়নি, দয়া করে নিজে ডায়াল করুন।");
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/auth";
    } catch {
      window.location.href = "/auth";
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 text-white flex items-center justify-center px-4 py-8 select-none">
      <style>{`
        @keyframes notice-mesh {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes notice-glow {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        .notice-bg {
          background: linear-gradient(135deg, #18050e 0%, #090d16 50%, #1a0b12 100%);
          background-size: 200% 200%;
          animation: notice-mesh 14s ease infinite;
        }
        .notice-glow-anim {
          animation: notice-glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative ambient gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 notice-bg" />
        <div className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-rose-600/25 blur-3xl notice-glow-anim" />
        <div
          className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-amber-600/20 blur-3xl notice-glow-anim"
          style={{ animationDelay: "-2s" }}
        />
      </div>

      {/* Main Notice Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-rose-500/30 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 text-center animate-in fade-in zoom-in-95 duration-300">
        
        {/* Warning Icon with Pulse */}
        <div className="relative mx-auto mb-6 h-20 w-20">
          <div className="absolute inset-0 rounded-full bg-rose-500/30 blur-xl animate-ping opacity-60" />
          <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-amber-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-white/20">
            <ShieldAlert className="h-10 w-10" strokeWidth={2.2} />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/15 px-3.5 py-1 text-xs font-semibold text-rose-300 tracking-wide mb-3">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          জরুরী প্রশাসনিক নোটিশ
        </div>

        {/* Headline */}
        <h1 className="bn-display text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
          অ্যাডমিন প্যানেল স্থগিত আছে
        </h1>

        {/* Exact Core User Message */}
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 sm:p-5 text-left">
          <p className="text-base sm:text-lg font-medium leading-relaxed text-rose-100">
            “দুঃখিত ভাইয়া আমার এটি করা ছাড়া আর কোন উপায় ছিল না। আপনি আমার সাথে খুব দ্রুত যোগাযোগ করুন এবং নিচে দেওয়া মোবাইল নম্বরে কল করুন।”
          </p>
        </div>

        {/* Contact Phone Card */}
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-orange-500/5 p-4 sm:p-5">
          <p className="text-xs uppercase font-bold tracking-wider text-amber-300/90 mb-1">
            জরুরী যোগাযোগের মোবাইল নম্বর
          </p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-amber-400">
              {phoneNumber}
            </span>
            <button
              onClick={handleCopy}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition-all hover:bg-amber-400/25 active:scale-95"
              title="নম্বর কপি করুন"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-300">কপি হয়েছে</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>কপি</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`tel:${phoneNumber}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition-all hover:brightness-110 active:scale-98 ring-1 ring-white/20"
          >
            <PhoneCall className="h-4 w-4" />
            সরাসরি কল করুন
          </a>

          <a
            href={`https://wa.me/88${phoneNumber}?text=${encodeURIComponent("আসসালামু আলাইকুম, আমি Smart Click BD এডমিন প্যানেল থেকে যোগাযোগ করছি।")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-teal-700/30 transition-all hover:brightness-110 active:scale-98 ring-1 ring-white/20"
          >
            <MessageSquare className="h-4 w-4" />
            হোয়াটসঅ্যাপে মেসেজ
          </a>
        </div>

        {/* Footer info & Logout */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Smart Click BD Administration</span>
          <button
            onClick={handleLogout}
            type="button"
            className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            লগআউট করুন
          </button>
        </div>

      </div>
    </div>
  );
}
