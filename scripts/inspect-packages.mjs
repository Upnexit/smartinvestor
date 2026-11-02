const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function inspectPackages() {
  const query = `
    SELECT 
      up.id,
      up.user_id,
      up.package_id,
      up.status,
      up.created_at,
      p.full_name,
      p.phone,
      p.email,
      pkg.name as pkg_name,
      pkg.price as pkg_price
    FROM public.user_packages up
    LEFT JOIN public.profiles p ON p.id = up.user_id
    LEFT JOIN public.packages pkg ON pkg.id = up.package_id
    ORDER BY up.created_at DESC;
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
  console.log("Total user packages in DB:", data.length);
  console.log("User packages:", data);
}

inspectPackages().catch(console.error);
