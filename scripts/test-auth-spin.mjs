import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gpyarcrizvjyukaazndj.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mjk5MzgsImV4cCI6MjA5ODMwNTkzOH0.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw";
const client = createClient(supabaseUrl, anonKey);

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function run() {
  console.log("Signing in with smartclickbd@gmail.com...");
  const { data: auth, error } = await client.auth.signInWithPassword({
    email: "smartclickbd@gmail.com",
    password: "smartclickbd"
  });

  if (error) {
    console.error("Login failed:", error);
    return;
  }
  console.log("Logged in! UID:", auth.user.id);

  // Reset last_spin_at
  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `UPDATE public.profiles SET last_spin_at = NULL WHERE id = '${auth.user.id}';` })
  });

  console.log("Calling RPC execute_user_spin from authenticated client...");
  const { data: spinRes, error: spinErr } = await client.rpc("execute_user_spin", { p_user_id: auth.user.id });
  console.log("Spin Result:", spinRes);
  if (spinErr) console.error("Spin Error:", spinErr);

  if (spinRes?.spin_id) {
    console.log("Cleaning up test spin history...");
    await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `DELETE FROM public.spin_history WHERE id = '${spinRes.spin_id}';` })
    });
    console.log("Cleaned up successfully!");
  }
}

run();
