const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function testWithdrawals() {
  const query = `
    SELECT 
      w.id,
      w.user_id,
      w.status,
      w.created_at,
      w.amount,
      w.method,
      prof.full_name
    FROM withdrawals w
    JOIN profiles prof ON prof.id = w.user_id
    ORDER BY w.created_at DESC;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const withs = await res.json();
  console.log('Total withdrawals count:', withs.length);

  const now = Date.now();
  for (const days of [7, 30, 90, 365]) {
    const since = now - days * 86400000;
    const filtered = withs.filter(w => w.status === 'approved' && new Date(w.created_at).getTime() >= since);
    const sum = filtered.reduce((acc, w) => acc + Number(w.amount || 0), 0);
    console.log(`[${days} Days] Approved Withdraw Count: ${filtered.length}, Total Amount: ৳${sum.toLocaleString('en-IN')}`);
  }
}
testWithdrawals();
