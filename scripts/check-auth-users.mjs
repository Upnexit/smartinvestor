const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function checkAuthUsers() {
  const query = `
    SELECT id, email, phone, raw_user_meta_data, created_at, deleted_at 
    FROM auth.users 
    ORDER BY created_at DESC;
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
  console.log("Total auth users:", data.length);
  console.log("Auth users list:", data.map(u => ({ id: u.id, email: u.email, phone: u.phone, meta: u.raw_user_meta_data })));
}

checkAuthUsers().catch(console.error);
