const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function compareAuthAndProfiles() {
  const query = `
    SELECT 
      u.id, 
      u.email, 
      u.raw_user_meta_data->>'full_name' as meta_name,
      u.raw_user_meta_data->>'phone' as meta_phone,
      p.id as profile_id,
      p.full_name as profile_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL;
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
  console.log("Users in auth.users whose profile is MISSING or was DELETED:", data.length);
  console.log("Details:", data);
}

compareAuthAndProfiles().catch(console.error);
