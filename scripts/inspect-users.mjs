const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function inspectUsers() {
  const query = `
    SELECT id, full_name, email, phone, user_code, balance, status, created_at 
    FROM public.profiles 
    ORDER BY created_at DESC 
    LIMIT 30;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log("Total profiles found:", data.length);
  console.log("Profiles:", data);
}

inspectUsers().catch(console.error);
