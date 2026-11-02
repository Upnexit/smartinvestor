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
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'user_ad_views';
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log("Policies:", await res.json());

  // Also check RLS enabled
  const query2 = `
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'user_ad_views';
  `;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query2 }),
  });
  console.log("RLS status:", await res2.json());
}
check();

