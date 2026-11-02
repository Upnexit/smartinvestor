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

async function check() {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE '%ad%' OR table_name LIKE '%setting%');
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log("Tables:", await res.json());

  // Also check site_settings value for ad_settings
  const query2 = `SELECT key, value FROM site_settings WHERE key = 'ad_settings';`;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query2 }),
  });
  console.log("ad_settings:", await res2.json());

  // Check user_ad_views count and structure
  const query3 = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_ad_views';`;
  const res3 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query3 }),
  });
  console.log("user_ad_views columns:", await res3.json());
}
check();
