import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Tv,
  Save,
  Eye,
  Coins,
  Link as LinkIcon,
  TrendingUp,
  History,
  CheckCircle2,
  Users,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Radio,
  Sliders,
  DollarSign,
  ArrowDownToLine,
  Activity,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, StatTile } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "বিজ্ঞাপন (Ad) ও উইথড্র কন্ট্রোল — Smart Click BD" }] }),
  component: AdminAdsControlPage,
});

export type AdSettings = {
  direct_link: string;
  reward_per_ad: number;
  daily_limit: number;
  timer_seconds: number;
  enabled: boolean;
  first_withdraw_min: number;
  second_withdraw_min: number;
  min_referrals: number;
  verification_fee: number;
};

export type AdViewLog = {
  id: string;
  user_id: string;
  reward_amount: number;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  user_code: string | null;
  current_balance?: number | null;
};

export function AdminAdsControlPage() {
  const [settings, setSettings] = useState<AdSettings>({
    direct_link: "https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b",
    reward_per_ad: 0.2,
    daily_limit: 50,
    timer_seconds: 20,
    enabled: true,
    first_withdraw_min: 100,
    second_withdraw_min: 500,
    min_referrals: 10,
    verification_fee: 150,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"all" | "today">("all");

  // Metrics
  const [todayViews, setTodayViews] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [todayUsers, setTodayUsers] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [logs, setLogs] = useState<AdViewLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentActor = userRes.user?.id;

      // 1. Try dedicated high-performance atomic RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_get_ad_stats", {
        _actor: currentActor,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === "object") {
        const stats = rpcRes as any;
        setTodayViews(Number(stats.today_views) || 0);
        setTodayExpense(Number(stats.today_expense) || 0);
        setTodayUsers(Number(stats.today_users) || 0);
        setTotalViews(Number(stats.total_views) || 0);
        setTotalExpense(Number(stats.total_expense) || 0);
        setTotalUsers(Number(stats.total_users) || 0);

        if (stats.settings) {
          setSettings((prev) => ({
            ...prev,
            ...stats.settings,
            reward_per_ad: Number(stats.settings.reward_per_ad ?? prev.reward_per_ad),
            daily_limit: Number(stats.settings.daily_limit ?? prev.daily_limit),
            timer_seconds: Number(stats.settings.timer_seconds ?? prev.timer_seconds),
            first_withdraw_min: Number(stats.settings.first_withdraw_min ?? prev.first_withdraw_min),
            second_withdraw_min: Number(stats.settings.second_withdraw_min ?? prev.second_withdraw_min),
            min_referrals: Number(stats.settings.min_referrals ?? prev.min_referrals),
            verification_fee: Number(stats.settings.verification_fee ?? prev.verification_fee),
            enabled: stats.settings.enabled ?? prev.enabled,
          }));
        }

        if (Array.isArray(stats.recent_views)) {
          setLogs(stats.recent_views);
        }
      } else {
        // Fallback: Direct query if RPC has any error
        console.warn("RPC fallback triggered:", rpcErr?.message);

        // Fetch settings from site_settings
        const { data: setRes } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "ad_settings")
          .maybeSingle();

        if (setRes?.value) {
          setSettings((prev) => ({ ...prev, ...(setRes.value as any) }));
        }

        // Fetch ad views
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [viewsRes, recentRes] = await Promise.all([
          supabase.from("user_ad_views").select("reward_amount, created_at, user_id"),
          supabase
            .from("user_ad_views")
            .select("id, user_id, reward_amount, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        const allData = viewsRes.data ?? [];
        setTotalViews(allData.length);
        setTotalExpense(allData.reduce((acc, r) => acc + Number(r.reward_amount || 0), 0));
        setTotalUsers(new Set(allData.map((r) => r.user_id)).size);

        const todayData = allData.filter((r) => new Date(r.created_at) >= todayStart);
        setTodayViews(todayData.length);
        setTodayExpense(todayData.reduce((acc, r) => acc + Number(r.reward_amount || 0), 0));
        setTodayUsers(new Set(todayData.map((r) => r.user_id)).size);

        if (recentRes.data && recentRes.data.length > 0) {
          const uids = [...new Set(recentRes.data.map((r) => r.user_id))];
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, phone, user_code, balance")
            .in("id", uids);

          const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
          setLogs(
            recentRes.data.map((r) => {
              const p = profMap.get(r.user_id);
              return {
                id: r.id,
                user_id: r.user_id,
                reward_amount: Number(r.reward_amount) || 0,
                created_at: r.created_at,
                full_name: p?.full_name ?? null,
                phone: p?.phone ?? null,
                user_code: p?.user_code ?? null,
                current_balance: Number(p?.balance) || 0,
              };
            })
          );
        }
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Ad data load error:", err);
      toast.error(err.message || "বিজ্ঞাপন ডাটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();

    // Setup Supabase Realtime channel for live ad views
    const channel = supabase
      .channel("admin-ad-realtime-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_ad_views" },
        (payload) => {
          // New ad view received live!
          const newRow = payload.new as any;
          toast.info(`🔔 নতুন অ্যাড ভিউ! +৳${Number(newRow.reward_amount || 0).toFixed(2)}`, {
            duration: 3000,
          });
          void loadData(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings", filter: "key=eq.ad_settings" },
        () => {
          void loadData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    const tId = toast.loading("সেটিংস সেভ করা হচ্ছে...");

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const currentActor = userRes.user?.id;

      // 1. Try atomic admin RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("admin_save_ad_settings", {
        _actor: currentActor,
        _settings: settings,
      });

      if (rpcErr) {
        // Fallback: Direct upsert
        const { error: directErr } = await supabase.from("site_settings").upsert({
          key: "ad_settings",
          value: settings,
          updated_at: new Date().toISOString(),
        });
        if (directErr) throw directErr;

        if (settings.verification_fee != null) {
          await supabase
            .from("packages")
            .update({ price: settings.verification_fee, updated_at: new Date().toISOString() })
            .eq("id", "00000000-0000-0000-0000-000000000001");
        }
      }

      toast.success("বিজ্ঞাপন ও উইথড্র সেটিংস সফলভাবে আপডেট হয়েছে!", { id: tId });
      void loadData(true);
    } catch (err: any) {
      console.error("Save ad settings error:", err);
      toast.error(err.message || "সেভ করতে সমস্যা হয়েছে", { id: tId });
    } finally {
      setSaving(false);
    }
  }

  // Filter logs by search & period
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (filterPeriod === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      result = result.filter((l) => new Date(l.created_at) >= todayStart);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.user_code?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, searchTerm, filterPeriod]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        accent="amber"
        Icon={Tv}
        title="বিজ্ঞাপন (Ad) ও উইথড্র কন্ট্রোল"
        subtitle="প্রতি বিজ্ঞাপনের রিওয়ার্ড, ১ম ও ২য় বার উইথড্র লিমিট, রিয়েল-টাইম অ্যাড ভিউ ট্র্যাকিং ও ভেরিফিকেশন ফি নিয়ন্ত্রণ"
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            রিয়েল-টাইম লাইভ
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              title="রিয়েল-টাইম ডাটা রিফ্রেশ"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin text-amber-600")} />
              {refreshing ? "রিফ্রেশ হচ্ছে..." : "রিফ্রেশ"}
            </button>
            <GradientButton accent="amber" busy={saving} onClick={handleSave}>
              <Save className="h-4 w-4" /> সেটিংস সংরক্ষণ
            </GradientButton>
          </div>
        }
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          accent="amber"
          Icon={Eye}
          label="আজকের মোট অ্যাড ভিউ"
          value={loading ? "..." : todayViews.toLocaleString("bn-BD")}
          hint="আজকে ব্যবহারকারীরা মোট যতবার অ্যাড দেখেছে"
        />

        <StatTile
          accent="sky"
          Icon={Users}
          label="আজকে সক্রিয় ইউজার"
          value={loading ? "..." : `${todayUsers.toLocaleString("bn-BD")} জন`}
          hint="আজকে যারা অন্তত ১টি বিজ্ঞাপন দেখেছে"
        />

        <StatTile
          accent="emerald"
          Icon={Coins}
          label="আজকের পেআউট খরচ"
          value={loading ? "..." : `৳${todayExpense.toFixed(2)}`}
          hint="অ্যাড দেখে আজ ইউজার ওয়ালেটে যুক্ত হয়েছে"
        />

        <StatTile
          accent="purple"
          Icon={TrendingUp}
          label="সর্বমোট বিতরণকৃত রিওয়ার্ড"
          value={loading ? "..." : `৳${totalExpense.toFixed(2)}`}
          hint={`মোট ${totalViews} ভিউ (${totalUsers} জন ইউজার)`}
        />
      </div>

      {/* Main Grid: Left Column Controls, Right Column Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settings & Configuration Controls (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Ad System Configuration */}
          <AdminCard accent="amber">
            <div className="p-4 sm:p-5 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">অ্যাড সিস্টেম কনফিগারেশন</h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className={settings.enabled ? "text-emerald-600" : "text-rose-600"}>
                  {settings.enabled ? "সিস্টেম চালু" : "সিস্টেম বন্ধ"}
                </span>
              </label>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              {/* Direct Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Adsterra / Monetag Direct Smart Link
                  </label>
                  {settings.direct_link && (
                    <a
                      href={settings.direct_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:underline"
                    >
                      টেস্ট ওপেন <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={settings.direct_link}
                    onChange={(e) => setSettings({ ...settings, direct_link: e.target.value })}
                    placeholder="https://auctionr.org/..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <LinkIcon className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ইউজার যখন অ্যাড দেখতে ক্লিক করবে তখন এই ডিরেক্ট লিংকটি নতুন উইন্ডোতে ওপেন হবে।
                </p>
              </div>

              {/* Per Ad Reward */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <label className="font-bold text-slate-800 block mb-1">
                  প্রতি বিজ্ঞাপনে ইউজারকে কত টাকা দিবেন? (৳)
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.reward_per_ad}
                    onChange={(e) =>
                      setSettings({ ...settings, reward_per_ad: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-base font-bold text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-amber-700">৳</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1">
                  বর্তমানে প্রতি অ্যাডে <strong>৳{settings.reward_per_ad}</strong> প্রদান করা হচ্ছে।
                </p>
              </div>

              {/* Limits & Timer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    দৈনিক সর্বোচ্চ লিমিট
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={settings.daily_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, daily_limit: parseInt(e.target.value) || 50 })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">প্রতি ইউজার দিনে কয়টি দেখবে</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    কাউন্টডাউন টাইমার
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={settings.timer_seconds}
                      onChange={(e) =>
                        setSettings({ ...settings, timer_seconds: parseInt(e.target.value) || 20 })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">সেকেন্ড</span>
                  </div>
                  <span className="text-[10px] text-slate-500">কত সেকেন্ড পর টাকা জমা হবে</span>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Card 2: 1st & 2nd Withdraw Limits & Verification Rules */}
          <AdminCard accent="emerald">
            <div className="p-4 sm:p-5 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  উইথড্র লিমিট (১ম ও ২য় বার) ও শর্তাবলী
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5">
                Financial Gate
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
              {/* Withdraw Limits: 1st time vs 2nd time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <label className="font-bold text-slate-800 block mb-1 text-xs">
                    ১ম বার সর্বনিম্ন উইথড্র (৳)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      step="1"
                      value={settings.first_withdraw_min}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          first_withdraw_min: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2 font-bold text-emerald-600">৳</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    প্রথমবার তোলার সর্বনিম্ন সীমা
                  </span>
                </div>

                <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
                  <label className="font-bold text-slate-800 block mb-1 text-xs">
                    ২য় বার থেকে উইথড্র (৳)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      step="1"
                      value={settings.second_withdraw_min}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          second_withdraw_min: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-xl border border-purple-300 bg-white px-3 py-2 text-slate-900 font-bold focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="absolute right-3 top-2 font-bold text-purple-600">৳</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    পরবর্তী সকল উইথড্রর সর্বনিম্ন সীমা
                  </span>
                </div>
              </div>

              {/* Referrals & Verification Fee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">
                    বাধ্যতামূলক রেফারেল সংখ্যা
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.min_referrals}
                    onChange={(e) =>
                      setSettings({ ...settings, min_referrals: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">উইথড্র করার আগে কয়টি রেফার লাগবে</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1 text-xs">
                    ভেরিফিকেশন ফি (৳)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={settings.verification_fee}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          verification_fee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2 font-bold text-slate-400">৳</span>
                  </div>
                  <span className="text-[10px] text-slate-500">অ্যাকাউন্ট ভেরিফাই ফি</span>
                </div>
              </div>

              <div className="pt-2">
                <GradientButton
                  accent="amber"
                  busy={saving}
                  onClick={handleSave}
                  className="w-full justify-center"
                >
                  <Save className="h-4 w-4" /> সেটিংস সংরক্ষণ করুন
                </GradientButton>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Real-time Live Ad View History (7 columns) */}
        <div className="lg:col-span-7 space-y-4">
          <AdminCard accent="slate">
            {/* Table Header with Search & Period Filters */}
            <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-700" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      রিয়েল-টাইম বিজ্ঞাপন ভিউ হিস্ট্রি
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      কোন সময় কোন ইউজার অ্যাড দেখল তার সরাসরি লগ ও সময়
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
                    <button
                      onClick={() => setFilterPeriod("all")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 font-semibold transition",
                        filterPeriod === "all"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      সকল ({logs.length})
                    </button>
                    <button
                      onClick={() => setFilterPeriod("today")}
                      className={cn(
                        "rounded-lg px-2.5 py-1 font-semibold transition",
                        filterPeriod === "today"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      আজকের ({todayViews})
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ইউজারের নাম, ফোন নম্বর অথবা ইউজার কোড দিয়ে খুঁজুন..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    মুছে ফেলুন
                  </button>
                )}
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ইউজার তথ্য</th>
                    <th className="px-4 py-3 font-semibold">ফোন নম্বর</th>
                    <th className="px-4 py-3 text-right font-semibold">রিওয়ার্ড</th>
                    <th className="px-4 py-3 text-right font-semibold">দেখা হয়েছে (সময়)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                        বিজ্ঞাপন ডাটা লোড হচ্ছে...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400">
                        {searchTerm ? "এই নামে বা নম্বরে কোনো বিজ্ঞাপন ভিউ পাওয়া যায়নি।" : "এখনও পর্যন্ত কোনো বিজ্ঞাপন দেখা হয়নি।"}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((v) => {
                      const dt = new Date(v.created_at);
                      const timeStr = dt.toLocaleTimeString("bn-BD", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });
                      const dateStr = dt.toLocaleDateString("bn-BD", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr key={v.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-xs font-bold text-white shadow-sm">
                                {(v.full_name || "U")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {v.full_name || "নামবিহীন ইউজার"}
                                </p>
                                <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
                                  {v.user_code || "N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                            {v.phone || "ফোন নেই"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-xs sm:text-sm">
                              +৳{Number(v.reward_amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-slate-800 text-xs">{timeStr}</p>
                            <p className="text-[10px] text-slate-400">{dateStr}</p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>প্রদর্শিত হচ্ছে: <strong>{filteredLogs.length}</strong> টি রেকর্ড</span>
              <span>সর্বশেষ আপডেট: {lastUpdated.toLocaleTimeString("bn-BD")}</span>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

