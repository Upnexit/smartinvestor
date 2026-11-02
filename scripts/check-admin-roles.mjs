const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function checkAdminRoles() {
  const query = `
    SELECT ur.*, p.email, p.full_name 
    FROM public.user_roles ur 
    LEFT JOIN public.profiles p ON p.id = ur.user_id;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  console.log("User roles in DB:", await res.json());

  // Also test has_role function with admin user id
  const query2 = `
    SELECT 
      id, email,
      public.has_role(id, 'admin'::public.app_role) as is_admin
    FROM public.profiles 
    WHERE email ILIKE '%smartclickbd%';
  `;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: query2 })
  });
  console.log("Admin check for smartclickbd:", await res2.json());
}

checkAdminRoles().catch(console.error);
