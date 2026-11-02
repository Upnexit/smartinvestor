import fs from "node:fs";

const file = "src/routes/admin.tasks.ads.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Update AdSettings type
const oldType = `type AdSettings = {
  direct_link: string;
  reward_per_ad: number;
  daily_limit: number;
  timer_seconds: number;
  enabled: boolean;
};`;

const newType = `type AdSettings = {
  direct_link: string;
  reward_per_ad: number;
  daily_limit: number;
  timer_seconds: number;
  enabled: boolean;
  min_referrals?: number;
  verification_fee?: number;
};`;

content = content.replace(oldType, newType);

// Update initial state
const oldState = `  const [settings, setSettings] = useState<AdSettings>({
    direct_link: "https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b",
    reward_per_ad: 0.20,
    daily_limit: 50,
    timer_seconds: 20,
    enabled: true,
  });`;

const newState = `  const [settings, setSettings] = useState<AdSettings>({
    direct_link: "https://auctionr.org/4/a57f46755b9994875871cd40067a3d6b",
    reward_per_ad: 0.20,
    daily_limit: 50,
    timer_seconds: 20,
    enabled: true,
    min_referrals: 10,
    verification_fee: 150,
  });`;

content = content.replace(oldState, newState);

// In handleSave, make sure package 00000000-0000-0000-0000-000000000001 price is also updated
const oldHandleSave = `      const { error } = await supabase.from("site_settings").upsert({
        key: "ad_settings",
        value: settings,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success("অ্যাড সেটিংস সফলভাবে সেভ করা হয়েছে!");`;

const newHandleSave = `      const { error } = await supabase.from("site_settings").upsert({
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

      toast.success("অ্যাড ও উইথড্র ভেরিফিকেশন সেটিংস সফলভাবে সেভ করা হয়েছে!");`;

content = content.replace(oldHandleSave, newHandleSave);

// Add the 2 new fields in the UI right below the timer/daily_limit
const oldGrid = `              <div className="grid grid-cols-2 gap-3">
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
              </div>`;

const newGrid = `              <div className="grid grid-cols-2 gap-3">
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
              </div>`;

content = content.replace(oldGrid, newGrid);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated admin.tasks.ads.tsx successfully");

