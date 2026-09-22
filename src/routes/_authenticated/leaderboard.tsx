import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, ArrowRight, Bell, Trophy, Users, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { IllustratedAvatar } from "@/components/panel/IllustratedAvatar";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "লিডারবোর্ড — Smart Click BD" }] }),
  component: LeaderboardPage,
});

interface LeaderboardUser {
  rank: number;
  name: string;
  earningAmount: number;
  referralCount: number;
  avatarSeed: number;
}

// Seed list with exact reference names and realistic top earner / referrer usernames
const BASE_NAMES = [
  "HUXXHOOCKER",
  "MD ARIYAN",
  "ARIYAN AHEMD",
  "MD.SOJIB KHAN",
  "RAJONKUMAR58",
  "RATUL",
  "SAJIB",
  "ABDULLAH_99",
  "SHAKIB_75",
  "TANVIR_ROY",
  "MEHEDI_HASAN",
  "FARHANA_AKTER",
  "KABIR_HOSSAIN",
  "SUMON_AHMED",
  "JANNATUL_F",
  "NAZMUL_HQ",
  "RAKIB_KHAN",
  "MOMINUL_ISLAM",
  "SABBIR_CHOWDHURY",
  "NUSRAT_JAHAN",
  "KAMRUL_HASAN",
  "RIMON_ISLAM",
  "TARIQUL_ISLAM",
  "ALAMGIR_H",
  "SHOHAG_MIA",
  "ASRAFUL_ALAM",
  "HASIBUL_SHANTO",
  "MAHMUD_HASAN",
  "EMRAN_KHAN",
  "SALMAN_FARS",
  "SHOHIDUL_ISLAM",
  "ZAHID_HASAN",
  "ROBIUL_AWAL",
  "RUBEL_HOSSAIN",
  "SHAMIM_REZA",
  "MUKTADIR_RAHMAN",
  "ARIFUR_RAHMAN",
  "BADHON_ROY",
  "BIPLOB_KUMAR",
  "CHOWDHURY_SAHEB",
  "DIPU_SARKAR",
  "ENAMUL_HAQUE",
  "FAYSAL_AHMED",
  "GOLAM_RABBANI",
  "HABIB_WAHID",
  "IQBAL_HOSSAIN",
  "JAMIL_AHMED",
  "KHALID_HASAN",
  "LITON_DAS",
  "MANIK_MIA",
  "NASIR_HOSSAIN",
  "OVI_AHMED",
  "PARVEZ_MOSHARRAF",
  "QUAMRUL_ISLAM",
  "RASHED_KHAN",
  "SOHEL_RANA",
  "TUSHAR_AHMED",
  "UTHPOL_ROY",
  "VASKAR_SAHA",
  "WASIM_AKRAM",
  "YASIN_ARAFAT",
  "ZAKIR_HOSSAIN",
  "ANISUR_RAHMAN",
  "BABUL_AKTER",
  "CHANDAN_DAS",
  "DELWAR_HOSSAIN",
  "EKRAMUL_HAQUE",
  "FARUK_HOSSAIN",
  "GAZI_SALAHUDDIN",
  "HARUN_OR_RASHID",
  "IMRUL_KAYES",
  "JAHANGIR_ALAM",
  "KAMAL_HOSSAIN",
  "LUTFOR_RAHMAN",
  "MOSTAFIZUR_R",
  "NURUL_ISLAM",
  "OBIDUR_RAHMAN",
  "PANKAJ_KUMAR",
  "QUAZI_NAZIM",
  "REZAUL_KARIM",
  "SHAHIN_ALAM",
  "TAREQ_ZIA",
  "UMMAR_FARUK",
  "WALID_BIN_TALAL",
  "YEAMIN_HOSSAIN",
  "ZIAUR_RAHMAN",
  "ASIF_IQBAL",
  "BASHIR_AHMED",
  "CHONCHOL_CHOWDHURY",
  "DURJOY_BISWAS",
  "EMDADUL_HAQUE",
  "FAHMIDA_NABI",
  "GOLAM_MUSTAFA",
  "HIMEL_AHMED",
  "IMTIAZ_BULBUL",
  "JUEL_RANA",
  "KAZI_SHARIF",
  "LOKMAN_HAKIM",
  "MUNNA_KHAN",
  "NAZMUL_HUDA",
  "POLY_AKTER",
  "RAFIQUL_ISLAM",
];

// Generate consistent 100 leaderboard users
function generate100Users(): LeaderboardUser[] {
  // Exact top figures from reference screenshot for the top ranks
  const topEarnings = [
    1172250.0,
    134081.0,
    44840.0,
    24717.0,
    10096.0,
    8950.0,
    7820.0,
    6940.0,
    6250.0,
    5800.0,
  ];

  const topRefers = [
    39068,
    3028,
    706,
    174,
    154,
    132,
    118,
    105,
    94,
    82,
  ];

  const list: LeaderboardUser[] = [];

  for (let i = 0; i < 100; i++) {
    const name = BASE_NAMES[i % BASE_NAMES.length];

    // Calculate earning amount descending
    let earningAmount: number;
    if (i < topEarnings.length) {
      earningAmount = topEarnings[i];
    } else {
      // Smooth decay between 5,500 down to 1,200
      earningAmount = Math.max(1200, Math.round(5500 - (i - 10) * 45 + ((i * 17) % 30)));
    }

    // Calculate referral count descending
    let referralCount: number;
    if (i < topRefers.length) {
      referralCount = topRefers[i];
    } else {
      // Smooth decay between 78 down to 12
      referralCount = Math.max(12, Math.round(78 - (i - 10) * 0.7 + ((i * 3) % 4)));
    }

    list.push({
      rank: i + 1,
      name,
      earningAmount,
      referralCount,
      avatarSeed: i,
    });
  }

  return list;
}

function LeaderboardPage() {
  const site = useSiteSettings();
  const [activeTab, setActiveTab] = useState<"earners" | "referrers">("earners");
  const [userName, setUserName] = useState<string>("Hasan");
  const [balance, setBalance] = useState<number>(131.5);
  const [loading, setLoading] = useState(true);

  // 100 Leaderboard list memoized
  const allUsers = useMemo(() => generate100Users(), []);

  // Sorted list depending on active tab
  const displayedUsers = useMemo(() => {
    if (activeTab === "earners") {
      return [...allUsers].sort((a, b) => b.earningAmount - a.earningAmount).map((u, idx) => ({
        ...u,
        rank: idx + 1,
      }));
    } else {
      return [...allUsers].sort((a, b) => b.referralCount - a.referralCount).map((u, idx) => ({
        ...u,
        rank: idx + 1,
      }));
    }
  }, [activeTab, allUsers]);

  useEffect(() => {
    (async () => {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s.session?.user?.id;
        if (!uid) return;

        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, balance")
          .eq("id", uid)
          .maybeSingle();

        if (p) {
          if (p.full_name) {
            // First name or full name
            const first = p.full_name.trim().split(" ")[0];
            setUserName(first || p.full_name);
          }
          if (typeof p.balance === "number") {
            setBalance(p.balance);
          }
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const siteName = site.site_name || "NEXORA PAY BD";

  return (
    <div className="min-h-screen pb-28 -mx-4 sm:-mx-6 -mt-5 sm:-mt-8 bg-gradient-to-b from-amber-400 via-amber-200/50 to-amber-50/20">
      {/* 1. Header Banner matching reference screenshot */}
      <div className="bg-gradient-to-b from-amber-400 via-amber-300 to-amber-400/90 px-4 pt-4 pb-6 rounded-b-[2rem] shadow-sm">
        {/* Top greeting bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1.5 -ml-1 text-red-900 hover:bg-black/5 rounded-lg transition"
              aria-label="মেনু"
            >
              <span className="text-2xl font-black leading-none select-none">☰</span>
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-red-900 tracking-tight leading-tight">
                Hi, {userName}
              </h2>
              <p className="text-xs font-semibold text-red-900/80 leading-tight">
                Welcome to {siteName}!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white/90 shadow-sm border border-amber-300 flex items-center justify-center text-red-600 hover:bg-white transition"
              aria-label="নোটিফিকেশন"
            >
              <Bell className="w-5 h-5 fill-red-600/20" />
            </button>

            {/* Profile Avatar with amber ring */}
            <IllustratedAvatar className="w-10 h-10 sm:w-11 sm:h-11" seed={0} />
          </div>
        </div>

        {/* 2. Total Balance (Taka) Card matching reference screenshot */}
        <div className="mt-5 rounded-3xl bg-[#D32F2F] p-6 text-center text-white shadow-xl ring-1 ring-red-700/30">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-white/90">
            Total Balance (Taka)
          </p>
          <h3 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-white">
            ৳ {balance.toFixed(2)}
          </h3>
        </div>

        {/* 3. Withdraw Money Button Card */}
        <Link
          to="/withdraw"
          className="mt-3.5 flex items-center justify-between rounded-2xl bg-white px-5 py-3.5 shadow-md hover:shadow-lg transition active:scale-[0.99] border border-amber-200/60 group"
        >
          <div className="flex items-center gap-3">
            <div className="text-red-600">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-base font-extrabold text-red-700">
              Withdraw Money
            </span>
          </div>
          <ArrowRight className="w-5 h-5 text-red-700 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* 4. Controls & Leaderboard Body */}
      <div className="px-4 sm:px-6 mt-4 max-w-2xl mx-auto">
        {/* Switch Buttons: Top Earners & Top Referrers */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("earners")}
            className={`py-3 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
              activeTab === "earners"
                ? "bg-[#DC2626] text-white shadow-md shadow-red-500/20 scale-[1.01]"
                : "bg-white text-red-600 border-2 border-red-600 hover:bg-red-50/50"
            }`}
          >
            <span>🏆</span>
            <span>Top Earners</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("referrers")}
            className={`py-3 px-3 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-sm ${
              activeTab === "referrers"
                ? "bg-[#DC2626] text-white shadow-md shadow-red-500/20 scale-[1.01]"
                : "bg-white text-red-600 border-2 border-red-600 hover:bg-red-50/50"
            }`}
          >
            <span>👥</span>
            <span>Top Referrers</span>
          </button>
        </div>

        {/* Total Count Banner: মোট লিডার বোর্ড ১০০ জন */}
        <div className="mt-4 rounded-2xl bg-white/95 border border-red-100 py-3 px-4 text-center shadow-xs">
          <span className="text-sm sm:text-base font-black text-red-600 tracking-wide">
            মোট লিডার বোর্ড ১০০ জন
          </span>
        </div>

        {/* 5. Ranked List of 100 Users */}
        <div className="mt-4 space-y-3">
          {displayedUsers.map((item) => {
            const isRank1 = item.rank === 1;
            const isRank2 = item.rank === 2;
            const isRank3 = item.rank === 3;
            const isTop3 = isRank1 || isRank2 || isRank3;

            return (
              <div
                key={`${activeTab}-${item.rank}`}
                className={`rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm flex items-center gap-3.5 transition-all duration-200 hover:shadow-md ${
                  isRank1
                    ? "border-2 border-amber-300 ring-1 ring-amber-400/20"
                    : isRank2
                    ? "border-2 border-slate-200"
                    : isRank3
                    ? "border-2 border-amber-200/80"
                    : "border border-slate-100"
                }`}
              >
                {/* Left: Medal Crown or Rank Number */}
                <div className="w-10 sm:w-11 shrink-0 flex items-center justify-center">
                  {isRank1 && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-md ring-2 ring-amber-200 flex items-center justify-center text-white">
                      <Crown className="w-5 h-5 fill-white" />
                    </div>
                  )}

                  {isRank2 && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 shadow-md ring-2 ring-slate-100 flex items-center justify-center text-white">
                      <Crown className="w-5 h-5 fill-white" />
                    </div>
                  )}

                  {isRank3 && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 shadow-md ring-2 ring-amber-500/20 flex items-center justify-center text-amber-100">
                      <Crown className="w-5 h-5 fill-amber-100" />
                    </div>
                  )}

                  {!isTop3 && (
                    <span className="text-lg sm:text-xl font-black text-red-600 select-none">
                      {item.rank}
                    </span>
                  )}
                </div>

                {/* Center-Left: Exact Avatar with amber circle ring */}
                <IllustratedAvatar
                  seed={item.avatarSeed}
                  className="w-11 h-11 sm:w-12 sm:h-12 shrink-0"
                />

                {/* Details: Name & Earning or Refer count */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-black text-slate-800 tracking-tight truncate leading-tight uppercase">
                    {item.name}
                  </h4>

                  <p className="text-xs sm:text-sm font-extrabold text-slate-600 mt-0.5 leading-snug">
                    {activeTab === "earners" ? (
                      <span>
                        {item.earningAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        টাকা
                      </span>
                    ) : (
                      <span>{item.referralCount} রেফার</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
