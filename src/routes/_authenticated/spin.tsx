import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fireConfetti } from "@/lib/confetti";
import {
  Sparkles, Clock, AlertCircle, CheckCircle2, ChevronRight,
  Headphones, ArrowRight, X, RotateCcw, Trophy, RefreshCw, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  getActiveSpinSlices,
  getUserSpinEligibility,
  executeUserSpin,
  getUserSpinHistory,
  type SpinSlice,
  type SpinHistoryItem,
  type SpinEligibility,
} from "@/lib/spin-client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/_authenticated/spin")({
  head: () => ({ meta: [{ title: "চাকা ঘুরিয়ে ইনকাম — Smart Click BD" }] }),
  component: LuckySpinPage,
});

function formatCountdown(totalSec: number) {
  if (totalSec <= 0) return "00:00:00";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function LuckySpinPage() {
  const navigate = useNavigate();
  const site = useSiteSettings();

  const [userId, setUserId] = useState<string | null>(null);
  const [slices, setSlices] = useState<SpinSlice[]>([]);
  const [eligibility, setEligibility] = useState<SpinEligibility>({
    canSpin: false,
    remainingSeconds: 0,
    lastSpinAt: null,
    totalSpins: 0,
    balance: 0,
    totalEarned: 0,
  });
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);

  // Wheel rotation state
  const [rotation, setRotation] = useState(0);

  // Win Modal state
  const [winModalOpen, setWinModalOpen] = useState(false);
  const [activeWin, setActiveWin] = useState<{
    spinId: string;
    wonAmount: number;
    depositRequired: number;
    sliceLabel: string;
  } | null>(null);

  // Countdown timer tick
  useEffect(() => {
    if (eligibility.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setEligibility((prev) => {
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0, canSpin: true };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [eligibility.remainingSeconds]);

  // Load user, slices, eligibility, history
  const loadData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const uid = authData.user.id;
      setUserId(uid);

      const [loadedSlices, elig, hist] = await Promise.all([
        getActiveSpinSlices(),
        getUserSpinEligibility(uid),
        getUserSpinHistory(uid),
      ]);

      setSlices(loadedSlices);
      setEligibility(elig);
      setHistory(hist);
    } catch (err) {
      console.error("Error loading spin page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization for spin wheel slices
  useEffect(() => {
    const channel = supabase
      .channel("realtime-spin-slices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spin_wheel_slices" },
        () => {
          getActiveSpinSlices().then(setSlices);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle Wheel Spin
  const handleSpinClick = async () => {
    if (isSpinning || !eligibility.canSpin || !userId || slices.length === 0) {
      if (!eligibility.canSpin) {
        toast.error(`পরবর্তী স্পিনের জন্য অপেক্ষা করুন: ${formatCountdown(eligibility.remainingSeconds)}`);
      }
      return;
    }

    setIsSpinning(true);

    try {
      const res = await executeUserSpin(userId);

      if (!res.success || !res.slice) {
        toast.error(res.error || "স্পিন সম্পন্ন করা সম্ভব হয়নি");
        setIsSpinning(false);
        return;
      }

      const wonSlice = res.slice;
      const wonAmount = Number(res.won_amount);
      const depositRequired = Number(res.deposit_required);
      const spinId = res.spin_id!;

      // Find slice index
      const sliceIndex = slices.findIndex((s) => s.id === wonSlice.id);
      const totalSlices = slices.length;
      const sliceAngle = 360 / totalSlices;

      // In the wheel SVG, slices start from 0 deg at top.
      // Top indicator is at 0 degrees (12 o'clock).
      // Center of slice i is at (i + 0.5) * sliceAngle.
      // To bring slice i under the top indicator, we rotate wheel by:
      // Target Angle = 360 - ((i + 0.5) * sliceAngle)
      const targetSliceCenter = (sliceIndex + 0.5) * sliceAngle;
      const targetAngle = 360 - targetSliceCenter;

      // Add 7 full rotations (360 * 7) for dramatic effect
      const extraSpins = 360 * 7;
      const currentNormalized = rotation % 360;
      const newRotation = rotation + (360 - currentNormalized) + extraSpins + targetAngle;

      setRotation(newRotation);

      // Duration is 6.5s to match CSS transition
      setTimeout(() => {
        setIsSpinning(false);

        // Fire celebration confetti
        fireConfetti();

        // Set active win and show congratulations modal
        setActiveWin({
          spinId,
          wonAmount,
          depositRequired,
          sliceLabel: wonSlice.label,
        });
        setWinModalOpen(true);

        // Refresh eligibility and history
        getUserSpinEligibility(userId).then(setEligibility);
        getUserSpinHistory(userId).then(setHistory);
      }, 6700);
    } catch (err: any) {
      console.error("Spin error:", err);
      toast.error(err.message || "স্পিন করতে সমস্যা হয়েছে");
      setIsSpinning(false);
    }
  };

  // Direct redirect to unified checkout for 50% deposit payment
  const handleProceedToDeposit = (claim: { spinId: string; wonAmount: number; depositRequired: number }) => {
    setWinModalOpen(false);
    navigate({
      to: "/checkout",
      search: {
        spin: claim.spinId,
        amount: claim.depositRequired,
        won: claim.wonAmount,
      },
    });
  };

  // Wheel slice angles
  const sliceCount = slices.length || 11;
  const sliceAngle = 360 / sliceCount;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
        <p className="text-sm font-semibold text-slate-500">স্পিন লোড হচ্ছে…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-2 py-4 sm:py-6">
      {/* Live User Balance Card */}
      <div className="mb-4 rounded-3xl p-4 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 text-white shadow-xl shadow-rose-500/15 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-2xl shadow-inner">
            💰
          </div>
          <div>
            <p className="text-xs font-semibold text-white/80">আপনার মূল ব্যালেন্স</p>
            <p className="text-2xl font-black tracking-tight text-white">
              ৳ {eligibility.balance.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-white/80">মোট আয়</p>
          <p className="text-lg font-bold text-amber-200">
            ৳ {eligibility.totalEarned.toFixed(2)}
          </p>
          <Link
            to="/withdraw"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold bg-white text-slate-900 px-2.5 py-0.5 rounded-full hover:bg-amber-100 transition shadow-sm"
          >
            উইথড্র করুন <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Wheel Card matching Reference Image */}
      <div className="relative rounded-[36px] bg-white border-4 border-rose-400/80 shadow-2xl p-4 sm:p-7 text-center overflow-hidden">
        {/* Soft background tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50/40 via-white to-amber-50/30 pointer-events-none" />

        <div className="relative z-10">
          {/* Header Title */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl text-rose-600">☸️</span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-rose-600">
              চাকা ঘুরিয়ে ইনকাম
            </h1>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-3 sm:mb-4">
            প্রতি ২৪ ঘণ্টায় একবার স্পিন করুন এবং জিতে নিন ক্যাশ!
          </p>

          {/* Countdown / Ready Badge */}
          <div className="flex justify-center mb-3 sm:mb-4">
            {eligibility.canSpin ? (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500 text-white font-extrabold text-sm shadow-md animate-pulse">
                <CheckCircle2 className="w-4 h-4" />
                <span>আপনার স্পিন প্রস্তুত! এখনই ঘুরান</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-extrabold text-sm shadow-sm">
                <Clock className="w-4 h-4 text-rose-500 animate-spin" style={{ animationDuration: "12s" }} />
                <span>পরবর্তী স্পিন: {formatCountdown(eligibility.remainingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Info Notice Box */}
          <div className="mb-4 sm:mb-6 p-3 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-left flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed shadow-sm">
            <span className="text-rose-500 font-bold text-base shrink-0 mt-0.5">ℹ️</span>
            <div>
              <strong className="text-slate-900">SPIN বাটনে চাপ দিন।</strong> চাকা থামলেই ফলাফল দেখতে পাবেন এবং পুরস্কার ক্লেইম করতে পারবেন!
            </div>
          </div>

          {/* Wheel Container with Pointer (Enlarged Wheel + Outward Text + Compact Button) */}
          <div className="relative mx-auto w-[330px] h-[330px] sm:w-[380px] sm:h-[380px] md:w-[410px] md:h-[410px] flex items-center justify-center my-3">
            {/* Outer Decorative Ring & Shadow */}
            <div className="absolute inset-0 rounded-full border-8 sm:border-[10px] border-amber-400 shadow-[0_12px_40px_rgba(234,88,12,0.3)] ring-4 ring-rose-200" />

            {/* Top Indicator / Pointer Arrow (Fixed at 12 o'clock pointing down) */}
            <div className="absolute -top-3 sm:-top-3.5 z-30 flex flex-col items-center">
              <div className="w-6 h-8 sm:w-7 sm:h-9 bg-rose-600 rounded-b-full shadow-lg flex items-center justify-center text-white text-[11px] font-black border-2 border-white">
                ▼
              </div>
            </div>

            {/* Rotating SVG Wheel */}
            <div
              className="w-[310px] h-[310px] sm:w-[360px] sm:h-[360px] md:w-[390px] md:h-[390px] rounded-full overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: isSpinning ? "6.5s" : "0s",
                transitionTimingFunction: "cubic-bezier(0.12, 0.96, 0.32, 1)",
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <g transform="translate(200, 200)">
                  {slices.map((s, i) => {
                    const startAngle = (i * sliceAngle) * (Math.PI / 180);
                    const endAngle = ((i + 1) * sliceAngle) * (Math.PI / 180);

                    // Radius is 200
                    const x1 = 200 * Math.sin(startAngle);
                    const y1 = -200 * Math.cos(startAngle);
                    const x2 = 200 * Math.sin(endAngle);
                    const y2 = -200 * Math.cos(endAngle);

                    const largeArc = sliceAngle > 180 ? 1 : 0;
                    const pathData = `M 0 0 L ${x1} ${y1} A 200 200 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    // Middle angle for text rotation
                    const midDeg = (i + 0.5) * sliceAngle;

                    return (
                      <g key={s.id}>
                        {/* Slice Sector */}
                        <path
                          d={pathData}
                          fill={s.color}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                        />
                        {/* Slice Label: Pushed outwards to y="-146" with bold enlarged typography */}
                        <g transform={`rotate(${midDeg})`}>
                          <text
                            x="0"
                            y="-146"
                            fill={s.text_color || "#FFFFFF"}
                            fontSize={sliceCount > 10 ? "21" : "24"}
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.75))",
                              fontFamily: "var(--font-sans, sans-serif)",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {s.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Center SPIN Button (Proportionately compact so it does not crowd slice text) */}
            <button
              onClick={handleSpinClick}
              disabled={isSpinning || !eligibility.canSpin}
              className={cn(
                "absolute z-20 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex flex-col items-center justify-center font-black transition-all",
                "bg-gradient-to-b from-white via-slate-100 to-slate-200 border-4 border-slate-300 shadow-xl",
                eligibility.canSpin && !isSpinning
                  ? "hover:scale-105 active:scale-95 cursor-pointer shadow-rose-500/30 ring-4 ring-rose-400/50 animate-pulse"
                  : "cursor-not-allowed opacity-80"
              )}
            >
              <span className="text-lg sm:text-xl font-black text-slate-700 tracking-wider">
                {isSpinning ? "..." : "SPIN"}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 -mt-0.5">
                {isSpinning ? "ঘুরছে" : "চাপ দিন"}
              </span>
            </button>
          </div>

          {/* Footer Warning & Notice */}
          <div className="mt-3">
            <p className="text-sm font-extrabold text-rose-600">
              {eligibility.canSpin
                ? "চাকা ঘুরিয়ে নিশ্চিত নগদ পুরস্কার জিতে নিন!"
                : "সময় শেষ না হওয়া পর্যন্ত স্পিন করা যাবে না।"}
            </p>
          </div>

          {/* Bottom Counter */}
          <div className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>মোট স্পিন করেছেন: <strong className="text-slate-800 font-bold">{eligibility.totalSpins} বার</strong></span>
            <Link to="/support" className="inline-flex items-center gap-1 text-rose-600 hover:underline">
              <Headphones className="w-3.5 h-3.5" /> সাপোর্ট
            </Link>
          </div>
        </div>

        {/* Floating Support Icon */}
        <Link
          to="/support"
          className="absolute bottom-4 right-4 z-20 w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition"
          aria-label="Support"
        >
          <Headphones className="w-5 h-5" />
        </Link>
      </div>

      {/* User Spin History Section */}
      <div className="mt-8 rounded-3xl bg-white border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900">স্পিন হিস্ট্রি ও আয়ের বিবরণ</h2>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">আপনি এখনও কোনো স্পিন করেননি। এখনই স্পিন করুন!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => {
              const won = Number(item.won_amount);
              const dep = Number(item.deposit_required);

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-sm">
                      ৳
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-900">
                          পুরস্কার: ৳ {won.toFixed(2)}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                          {item.slice_label || "স্পিন"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleString("bn-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500">
                        প্রয়োজনীয় ডিপোজিট: <strong className="text-slate-800">৳{dep.toFixed(2)}</strong>
                      </p>

                      {/* Status Badges */}
                      {item.status === "pending_deposit" && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          ডিপোজিট বাকি
                        </span>
                      )}
                      {item.status === "deposit_submitted" && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                          অ্যাডমিন পর্যালোচনায়
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          অনুমোদিত ও ব্যালেন্সে যুক্ত ✅
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded-full">
                          বাতিল করা হয়েছে
                        </span>
                      )}
                    </div>

                    {/* Action button if deposit is still pending -> Redirects to /checkout */}
                    {item.status === "pending_deposit" && (
                      <button
                        onClick={() =>
                          handleProceedToDeposit({
                            spinId: item.id,
                            wonAmount: won,
                            depositRequired: dep,
                          })
                        }
                        className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold shadow-sm active:scale-95 transition"
                      >
                        ডিপোজিট করুন
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
       * DIALOG: Win Congratulations & 50% Deposit Notice Modal
       * ========================================================= */}
      <Dialog open={winModalOpen} onOpenChange={setWinModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-3xl shadow-2xl bg-white text-slate-900">
          <div className="relative p-6 sm:p-8 text-center bg-gradient-to-b from-amber-50 via-white to-rose-50">
            {/* Top Close */}
            <button
              onClick={() => setWinModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Big Trophy / Emoji */}
            <div className="w-20 h-20 mx-auto mb-3 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center text-4xl shadow-xl shadow-rose-500/20 animate-bounce">
              🎉
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> দুর্দান্ত জয়!
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
              অভিনন্দন!
            </h2>
            <p className="text-base font-bold text-rose-600 mb-4">
              আপনি জিতেছেন ৳ {activeWin?.wonAmount.toFixed(2)}!
            </p>

            {/* Condition Notice Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left mb-5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  স্পিন-এ জেতা এই মূল্যটি পেতে হলে এর অর্ধেক সমপরিমাণ{" "}
                  <strong className="text-rose-600 font-extrabold text-base">
                    (৳ {activeWin?.depositRequired.toFixed(2)})
                  </strong>{" "}
                  ডিপোজিট করুন। তাহলে আপনার স্পিন-এর পুরো{" "}
                  <strong className="text-emerald-700 font-extrabold text-base">
                    ৳ {activeWin?.wonAmount.toFixed(2)}
                  </strong>{" "}
                  টাকা আপনার একাউন্ট ব্যালেন্সে সরাসরি যুক্ত হয়ে যাবে!
                </div>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 mb-6 text-xs space-y-2">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>স্পিনে জিতেছেন:</span>
                <span className="text-slate-900 font-bold">৳ {activeWin?.wonAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600">
                <span>প্রয়োজনীয় ডিপোজিট (৫০%):</span>
                <span className="text-rose-600 font-bold">৳ {activeWin?.depositRequired.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-emerald-700">
                <span>ব্যালেন্সে যুক্ত হবে:</span>
                <span>৳ {activeWin?.wonAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => activeWin && handleProceedToDeposit(activeWin)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-base shadow-lg shadow-rose-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                <span>টাকা ডিপোজিট করুন (৳ {activeWin?.depositRequired.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setWinModalOpen(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
              >
                পরে করব (হিস্ট্রিতে সংরক্ষিত থাকবে)
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
