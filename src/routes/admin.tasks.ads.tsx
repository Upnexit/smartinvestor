import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  Save,
  Tv,
  Users,
  Eye,
  Coins,
  Link as LinkIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
} from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tasks/ads")({
  head: () => ({ meta: [{ title: "অ্যাড টাস্ক কন্ট্রোল - Smart Click BD" }] }),
  component: AdminAdsControlPage,
});

type AdSettings = {
  direct_link: string;
  reward_per_ad: number;
  daily_limit: number;
  timer_seconds: number;
  enabled: boolean;
  min_referrals?: number;
  verification_fee?: number;
};

type RecentView = {
  id: string;
  user_id: string;
  reward_amount: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    phone: string | null;
    user_code: string | null;
  } | null;
};

function AdminAdsControlPage() {
  const [settings, setSettings] = useState<AdSettings>({
    direct_link: "https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b",
    reward_per_ad: 0.20,
    daily_limit: 50,
    timer_seconds: 20,
    enabled: true,
    min_referrals: 10,
    verification_fee: 150,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Statistics
  const [todayViews, setTodayViews] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch site settings
      const { data: setRes } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "ad_settings")
        .maybeSingle();

      if (setRes?.value) {
        setSettings((prev) => ({ ...prev, ...(setRes.value as Partial<AdSettings>) }));
      }

      // 2. Fetch stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [todayRes, totalRes, recentViewsRes] = await Promise.all([
        supabase
          .from("user_ad_views")
          .select("reward_amount")
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("user_ad_views")
          .select("reward_amount"),
        supabase
          .from("user_ad_views")
          .select("id, user_id, reward_amount, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      let formattedRecent: RecentView[] = [];
      if (recentViewsRes.data && recentViewsRes.data.length > 0) {
        const uids = [...new Set(recentViewsRes.data.map((r) => r.user_id))];
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, phone, user_code")
          .in("id", uids);

        const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
        formattedRecent = recentViewsRes.data.map((r) => ({
          ...r,
          profiles: profMap.get(r.user_id) || null,
        }));
      }

      const tViews = todayRes.data?.length ?? 0;
      const tExp = (todayRes.data ?? []).reduce((acc, r) => acc + Number(r.reward_amount || 0), 0);
      setTodayViews(tViews);
      setTodayExpense(tExp);

      const allViews = totalRes.data?.length ?? 0;
      const allExp = (totalRes.data ?? []).reduce((acc, r) => acc + Number(r.reward_amount || 0), 0);
      setTotalViews(allViews);
      setTotalExpense(allExp);

      setRecentViews(formattedRecent);
    } catch (err: any) {
      toast.error(err.message || "ডাটা লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({
        key: "ad_settings",
        value: settings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Also update verification package price
      if (settings.verification_fee != null) {
        await supabase.from("packages").update({
          price: settings.verification_fee,
        }).eq("id", "00000000-0000-0000-0000-000000000001");
      }

      toast.success("অ্যাড ও উইথড্র ভেরিফিকেশন সেটিংস সফলভাবে সেভ করা হয়েছে!");
    } catch (err: any) {
      toast.error(err.message || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        accent="rose"
        Icon={Tv}
        title="অ্যাড কন্ট্রোল প্যানেল"
        subtitle="Adsterra / রিওয়ার্ডেড ডিরেক্ট লিংক নিয়ন্ত্রণ, রিওয়ার্ড ও ইউজারদের অ্যাড দেখার হিস্ট্রি"
        action={
          <GradientButton accent="rose" busy={saving} onClick={handleSave}>
            <Save className="h-4 w-4" /> সেটিংস সংরক্ষণ
          </GradientButton>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminCard accent="amber">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-bold uppercase tracking-wider">আজকের অ্যাড ভিউ</span>
              <Eye className="h-5 w-5" />
            </div>
            <p className="bn-display mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800">
              {todayViews}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">আজকে দেখা মোট অ্যাড</p>
          </div>
        </AdminCard>

        <AdminCard accent="emerald">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-xs font-bold uppercase tracking-wider">আজকের পেআউট খরচ</span>
              <Coins className="h-5 w-5" />
            </div>
            <p className="bn-display mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600">
              ৳{todayExpense.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">ইউজারদের ওয়ালেটে যুক্ত হয়েছে</p>
          </div>
        </AdminCard>

        <AdminCard accent="blue">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-xs font-bold uppercase tracking-wider">সর্বমোট অ্যাড ভিউ</span>
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="bn-display mt-2 text-2xl sm:text-3xl font-extrabold text-slate-800">
              {totalViews}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">শুরু থেকে আজ পর্যন্ত</p>
          </div>
        </AdminCard>

        <AdminCard accent="purple">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-xs font-bold uppercase tracking-wider">সর্বমোট বিতরণকৃত</span>
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="bn-display mt-2 text-2xl sm:text-3xl font-extrabold text-purple-700">
              ৳{totalExpense.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">অ্যাড রিওয়ার্ড বাবদ প্রদান</p>
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Box */}
        <div className="lg:col-span-1 space-y-4">
          <AdminCard accent="rose">
            <div className="p-5 border-b border-rose-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Tv className="h-5 w-5 text-rose-600" /> অ্যাড কনফিগারেশন
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className={settings.enabled ? "text-emerald-600" : "text-rose-600"}>
                  {settings.enabled ? "চালু আছে" : "বন্ধ"}
                </span>
              </label>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Adsterra Smart Direct Link URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={settings.direct_link}
                    onChange={(e) => setSettings({ ...settings, direct_link: e.target.value })}
                    placeholder="https://auctionr.org/..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <LinkIcon className="h-4 w-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ইউজার যখন অ্যাড দেখতে ক্লিক করবে তখন এই লিংকটি নতুন উইন্ডোতে ওপেন হবে।
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  প্রতি বিজ্ঞাপনে ইউজারকে কত টাকা দিবেন? (৳)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.reward_per_ad}
                    onChange={(e) =>
                      setSettings({ ...settings, reward_per_ad: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="absolute right-3 top-2 font-bold text-slate-400">৳</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  উদাহরণ: ০.১০ বা ০.২০ টাকা (আপনার সুবিধামত পরিবর্তন করতে পারেন)।
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    দৈনিক সর্বোচ্চ লিমিট
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={settings.daily_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, daily_limit: parseInt(e.target.value) || 50 })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">প্রতি ইউজার দিনে কতটি দেখবে</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    কাউন্টডাউন টাইমার (সেকেন্ড)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.timer_seconds}
                    onChange={(e) =>
                      setSettings({ ...settings, timer_seconds: parseInt(e.target.value) || 20 })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">কত সেকেন্ড পর টাকা জমা হবে</span>
                </div>
              </div>

              {/* Withdraw Requirements Settings */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-3">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  উইথড্র শর্তাবলী ও অ্যাকাউন্ট ভেরিফিকেশন ফি
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1 text-xs">
                      বাধ্যতামূলক রেফারেল সংখ্যা
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.min_referrals ?? 10}
                      onChange={(e) =>
                        setSettings({ ...settings, min_referrals: parseInt(e.target.value) || 0 })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
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
                        value={settings.verification_fee ?? 150}
                        onChange={(e) =>
                          setSettings({ ...settings, verification_fee: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                      />
                      <span className="absolute right-3 top-2 font-bold text-slate-400">৳</span>
                    </div>
                    <span className="text-[10px] text-slate-500">অ্যাকাউন্ট ভেরিফাই করার জন্য কত টাকা দিতে হবে</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <GradientButton
                  accent="rose"
                  busy={saving}
                  onClick={handleSave}
                  className="w-full justify-center"
                >
                  <Save className="h-4 w-4" /> সেটিংস সেভ করুন
                </GradientButton>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Realtime User Ad Activity List */}
        <div className="lg:col-span-2">
          <AdminCard accent="slate">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" /> সম্প্রতি দেখা বিজ্ঞাপনের হিস্ট্রি
              </h3>
              <button
                onClick={loadData}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                রিফ্রেশ করুন
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">ইউজার</th>
                    <th className="px-4 py-3">কোড / ফোন</th>
                    <th className="px-4 py-3 text-right">রিওয়ার্ড (৳)</th>
                    <th className="px-4 py-3 text-right">সময়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentViews.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-400">
                        এখনও কেউ অ্যাড দেখেনি।
                      </td>
                    </tr>
                  ) : (
                    recentViews.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {v.profiles?.full_name || "ইউজার"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.profiles?.user_code || v.profiles?.phone || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          +৳{Number(v.reward_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {new Date(v.created_at).toLocaleTimeString("bn-BD", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

