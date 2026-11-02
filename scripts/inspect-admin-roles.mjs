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
    SELECT u.id, u.email, ur.role 
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id
    WHERE u.email ILIKE '%admin%' OR u.email ILIKE '%smartclick%' OR ur.role = 'admin';
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  console.log("Admin users in DB:", await res.json());

  // Also check policies on user_roles
  const query2 = `
    SELECT policyname, permissive, roles, cmd, qual 
    FROM pg_policies 
    WHERE tablename = 'user_roles';
  `;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: query2 }),
  });
  console.log("user_roles policies:", await res2.json());
}
check();

