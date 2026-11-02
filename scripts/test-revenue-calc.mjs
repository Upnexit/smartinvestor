const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function testCalculations() {
  const query = `
    SELECT 
      up.id,
      up.user_id,
      up.status,
      up.created_at,
      p.price,
      p.name as pkg_name,
      prof.full_name
    FROM user_packages up
    JOIN packages p ON p.id = up.package_id
    JOIN profiles prof ON prof.id = up.user_id
    ORDER BY up.created_at DESC;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const pkgs = await res.json();
  console.log('Active packages count:', pkgs.length);

  const now = Date.now();
  for (const days of [7, 30, 90, 365]) {
    const since = now - days * 86400000;
    const filtered = pkgs.filter(p => p.status === 'active' && new Date(p.created_at).getTime() >= since);
    const sum = filtered.reduce((acc, p) => acc + Number(p.price || 0), 0);
    console.log(`[${days} Days] Active Pkg Count: ${filtered.length}, Total Revenue: ৳${sum.toLocaleString('en-IN')}`);
  }
}
testCalculations();
