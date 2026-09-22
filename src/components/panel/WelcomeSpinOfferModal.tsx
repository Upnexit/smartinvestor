import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, Gift, Zap, ArrowRight, X, Trophy, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function WelcomeSpinOfferModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user has just registered or hasn't seen the welcome spin offer yet
    const hasPendingBonus = localStorage.getItem("signup_bonus_pending") === "1";
    const hasSeenOffer = localStorage.getItem("smartclick_welcome_spin_offer_seen") === "1";

    if (hasPendingBonus || !hasSeenOffer) {
      // Delay slightly so the dashboard is mounted smoothly
      const timer = setTimeout(() => {
        setOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartclick_welcome_spin_offer_seen", "1");
      localStorage.removeItem("signup_bonus_pending");
    }
  };

  const handleGoToSpin = () => {
    handleDismiss();
    navigate({ to: "/spin" as any });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (!isOpen ? handleDismiss() : setOpen(true))}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-3xl shadow-2xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
        {/* Background decorative glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 sm:p-8 text-center">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Header Badge */}
          <div className="mx-auto w-20 h-20 relative flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 animate-spin opacity-75 blur-[2px]" style={{ animationDuration: "6s" }} />
            <div className="relative w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shadow-inner border border-amber-300/40">
              <span className="text-3xl animate-bounce">🎡</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> স্পেশাল ওয়েলকাম অফার
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            🎉 অভিনন্দন জানাই!
          </h2>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Smart Click BD-তে স্বাগতম! কোনো প্যাকেজ ক্রয় ছাড়াই আপনার জন্যে রয়েছে <strong className="text-amber-400">২৪ ঘণ্টার ফ্রি লাকি স্পিন</strong>। এখনই চাকা ঘুরিয়ে নগদ ক্যাশ পুরস্কার জিতে নিন!
          </p>

          {/* Benefits Grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 font-black text-sm">
                0৳
              </div>
              <p className="text-[11px] font-bold text-white">ফ্রি স্পিন</p>
              <p className="text-[9px] text-slate-400">প্যাকেজ লাগবে না</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 font-black text-sm">
                ২৪ঘ
              </div>
              <p className="text-[11px] font-bold text-white">দৈনিক সুযোগ</p>
              <p className="text-[9px] text-slate-400">প্রতিদিন ১ বার</p>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 font-black text-sm">
                ৫০০০৳
              </div>
              <p className="text-[11px] font-bold text-white">বড় পুরস্কার</p>
              <p className="text-[9px] text-slate-400">সর্বোচ্চ ক্যাশ</p>
            </div>
          </div>

          {/* Call to action buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoToSpin}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-400 hover:via-rose-400 hover:to-pink-500 text-white font-bold text-base shadow-lg shadow-rose-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2 group"
            >
              <span>এখনই স্পিন করুন</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              পরে করব / ড্যাশবোর্ডে যান
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
