import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf-8");
let token = "";
let ref = "gpyarcrizvjyukaazndj";

for (const line of env.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("SUPABASE_ACCESS_TOKEN=")) {
    token = trimmed.slice("SUPABASE_ACCESS_TOKEN=".length).replace(/["']/g, "").trim();
  }
}

async function testSelect() {
  const query = `
    SELECT uav.id, uav.user_id, uav.reward_amount, uav.created_at, p.full_name, p.phone, p.user_code
    FROM user_ad_views uav
    LEFT JOIN profiles p ON p.id = uav.user_id
    ORDER BY uav.created_at DESC
    LIMIT 10;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log("Recent ad views from DB:", await res.json());

  // Also check count
  const countQuery = `SELECT count(*) FROM user_ad_views;`;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: countQuery }),
  });
  console.log("Total ad views count:", await res2.json());
}
testSelect();

