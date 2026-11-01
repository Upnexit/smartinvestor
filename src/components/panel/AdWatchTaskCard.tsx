import { useEffect, useState } from "react";
import {
  Play,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Zap,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AdStatus = {
  authenticated: boolean;
  today_count: number;
  today_earned: number;
  total_ads: number;
  daily_limit: number;
  timer_seconds: number;
  reward_per_ad: number;
  direct_link: string;
  enabled: boolean;
};

export function AdWatchTaskCard({ onBalanceUpdated }: { onBalanceUpdated?: () => void }) {
  const [status, setStatus] = useState<AdStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWatching, setIsWatching] = useState(false);
  const [timer, setTimer] = useState(20);
  const [targetTimer, setTargetTimer] = useState(20);
  const [claiming, setClaiming] = useState(false);
  const [canClaim, setCanClaim] = useState(false);

  async function loadStatus() {
    try {
      const { data, error } = await supabase.rpc("get_my_ad_status");
      if (error) throw error;
      if (data && typeof data === "object") {
        const s = data as unknown as AdStatus;
        setStatus(s);
        setTargetTimer(s.timer_seconds || 20);
      }
    } catch (err: any) {
      console.error("Ad status load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();

    // Realtime sync for ad settings updates from admin panel
    const channel = supabase
      .channel("ad-settings-realtime-card")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.ad_settings" },
        () => {
          void loadStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatching && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanClaim(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWatching, timer]);

  function handleStartAd() {
    if (!status) return;
    if (!status.enabled) {
      toast.error("বর্তমানে অ্যাড দেখা সাময়িক বন্ধ আছে।");
      return;
    }
    if (status.today_count >= status.daily_limit) {
      toast.info("আজকের দৈনিক অ্যাড সীমা পূর্ণ হয়েছে!");
      return;
    }

    const adUrl = status.direct_link || "https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b";

    // Open direct link in a new tab
    window.open(adUrl, "_blank", "noopener,noreferrer");

    // Start timer on our app
    const waitTime = status.timer_seconds || 20;
    setTargetTimer(waitTime);
    setTimer(waitTime);
    setIsWatching(true);
    setCanClaim(false);
    toast.info(`বিজ্ঞাপন ওপেন হয়েছে! অনুগ্রহ করে ${waitTime} সেকেন্ড পেজটিতে ভিজিট করে থাকুন।`);
  }

  async function handleClaimReward() {
    if (claiming) return;
    setClaiming(true);
    const tId = toast.loading("টাকা সংগ্রহ করা হচ্ছে...");
    try {
      const { data, error } = await supabase.rpc("claim_ad_reward");
      if (error) throw error;

      const res = data as { success: boolean; message: string; reward?: number; balance?: number };
      if (!res.success) {
        toast.error(res.message, { id: tId });
      } else {
        toast.success(res.message, { id: tId });
        setIsWatching(false);
        setCanClaim(false);
        await loadStatus();
        if (onBalanceUpdated) onBalanceUpdated();
      }
    } catch (err: any) {
      toast.error(err.message || "টাকা সংগ্রহ করতে সমস্যা হয়েছে", { id: tId });
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-soft animate-pulse">
        <div className="h-6 w-1/3 bg-amber-100 rounded-lg mb-3"></div>
        <div className="h-4 w-2/3 bg-slate-100 rounded-lg"></div>
      </div>
    );
  }

  const todayCount = status?.today_count ?? 0;
  const dailyLimit = status?.daily_limit ?? 50;
  const rewardPerAd = status?.reward_per_ad ?? 0.20;
  const isLimitReached = todayCount >= dailyLimit;
  const progressPercent = Math.min(100, Math.round((todayCount / dailyLimit) * 100));

  return (
    <div className="space-y-4">
      {/* 1. Step Instructions Box */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-blue-50/50 to-indigo-50/40 p-4 shadow-sm text-xs sm:text-sm text-sky-950">
        <div className="flex items-center gap-2 font-bold text-sky-900 mb-2">
          <Info className="h-4 w-4 text-sky-600" />
          <span>বিজ্ঞাপন দেখে আয় করার সহজ নিয়মাবলী:</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside text-slate-700">
          <li>
            নিচের <strong>&ldquo;বিজ্ঞাপন দেখুন&rdquo;</strong> বাটনে চাপ দিলে নতুন ট্যাবে একটি বিজ্ঞাপন ওপেন হবে।
          </li>
          <li>
            বিজ্ঞাপন পেজে গিয়ে <strong>২-১ টি জায়গায় ক্লিক বা স্ক্রল করুন</strong> এবং কমপক্ষে <strong>{targetTimer} সেকেন্ড</strong> অবস্থান করুন।
          </li>
          <li>
            {targetTimer} সেকেন্ড পর এই পেজে ফিরে এসে সবুজ রঙের <strong>&ldquo;টাকা সংগ্রহ করুন&rdquo;</strong> বাটনে ক্লিক করলেই আপনার ব্যালেন্সে টাকা জমা হবে।
          </li>
          <li>
            প্রতিদিন সর্বোচ্চ <strong>{dailyLimit} টি</strong> বিজ্ঞাপন দেখে ফ্রি আয় করতে পারবেন।
          </li>
        </ul>
      </div>

      {/* 2. Main Rewarded Ad Watch Card */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/50 p-5 sm:p-6 shadow-pop">
        {/* Top accent badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/25">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="bn-display text-xl sm:text-2xl font-bold text-slate-900">
                  বিজ্ঞাপন দেখুন ও আয় করুন
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-500/20">
                  ফ্রি ইনকাম
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                বিজ্ঞাপন দেখা শেষে সাথে সাথে ওয়ালেটে টাকা জমা হবে।
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white px-3.5 py-2 text-right shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 block">প্রতি বিজ্ঞাপনে আয়</span>
            <span className="bn-display text-lg font-bold text-emerald-600">
              ৳{rewardPerAd.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Daily Progress Stats */}
        <div className="mt-5 rounded-2xl bg-white p-4 border border-amber-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">আজকের বিজ্ঞাপন টাস্ক</span>
            <span className="font-bold text-amber-700">
              {todayCount} / {dailyLimit} সম্পন্ন ({progressPercent}%)
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
            <span>সর্বমোট দেখা: {status?.total_ads ?? 0} টি</span>
            <span>আজকের মোট আয়: ৳{(status?.today_earned ?? 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Action Zone */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-amber-500/5 to-orange-500/10 p-6 text-center border border-amber-200/60">
          {isLimitReached ? (
            <div className="flex flex-col items-center gap-2 text-emerald-700 py-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h4 className="font-bold text-base sm:text-lg">অভিনন্দন! আজকের {dailyLimit}টি বিজ্ঞাপন সম্পন্ন হয়েছে।</h4>
              <p className="text-xs text-slate-600 max-w-sm">
                আজকের দৈনিক কোটা শেষ হয়েছে। আগামীকাল আবার নতুন {dailyLimit}টি বিজ্ঞাপন দেখে আয় করতে পারবেন!
              </p>
            </div>
          ) : isWatching ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="relative grid h-16 w-16 place-items-center">
                <Clock className="h-14 w-14 animate-spin text-amber-600 opacity-20" />
                <span className="bn-display absolute text-xl font-bold text-amber-700">
                  {timer}s
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-800 text-sm sm:text-base">
                  {canClaim ? "টাইমার সমাপ্ত! এবার টাকা সংগ্রহ করুন" : "বিজ্ঞাপন দেখা চলছে... অনুগ্রহ করে অপেক্ষা করুন"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {canClaim
                    ? "নিচের সবুজ বাটনে ক্লিক করে সাথে সাথে অ্যাকাউন্টে টাকা জমা নিন।"
                    : `বিজ্ঞাপন ট্যাবে ${timer} সেকেন্ড অবস্থান করুন।`}
                </p>
              </div>

              <button
                onClick={handleClaimReward}
                disabled={!canClaim || claiming}
                className={cn(
                  "mt-2 inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 font-bold text-white shadow-lg transition-all",
                  canClaim
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:scale-105 shadow-emerald-500/30 animate-pulse text-base cursor-pointer"
                    : "bg-slate-400 cursor-not-allowed opacity-75"
                )}
              >
                <Sparkles className="h-5 w-5" />
                {claiming
                  ? "টাকা যোগ হচ্ছে..."
                  : canClaim
                  ? `টাকা সংগ্রহ করুন (+৳${rewardPerAd.toFixed(2)})`
                  : `${timer} সেকেন্ড বাকি`}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-xs sm:text-sm text-slate-600 max-w-md">
                নিচের বাটনে ক্লিক করলে বিজ্ঞাপন নতুন উইন্ডোতে ওপেন হবে এবং {targetTimer} সেকেন্ডের কাউন্টডাউন শুরু হবে।
              </p>

              <button
                onClick={handleStartAd}
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Play className="h-5 w-5 fill-white transition-transform group-hover:scale-110" />
                বিজ্ঞাপন দেখুন ও আয় করুন (৳{rewardPerAd.toFixed(2)})
                <ExternalLink className="h-4 w-4 opacity-75" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
