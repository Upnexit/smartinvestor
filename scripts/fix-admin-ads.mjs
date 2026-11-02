import fs from "node:fs";

const file = "src/routes/admin.tasks.ads.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Replace the stats fetch in loadData to be resilient
const oldLoad = `      const [todayRes, totalRes, recentRes] = await Promise.all([
        supabase
          .from("user_ad_views")
          .select("reward_amount")
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("user_ad_views")
          .select("reward_amount"),
        supabase
          .from("user_ad_views")
          .select("id, user_id, reward_amount, created_at, profiles(full_name, phone, user_code)")
          .order("created_at", { ascending: false })
          .limit(15),
      ]);`;

const newLoad = `      const [todayRes, totalRes, recentViewsRes] = await Promise.all([
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
      }`;

content = content.replace(oldLoad, newLoad);
content = content.replace(
  `setRecentViews((recentRes.data as unknown as RecentView[]) ?? []);`,
  `setRecentViews(formattedRecent);`
);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated admin.tasks.ads.tsx safely");

