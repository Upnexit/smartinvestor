const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function checkProfiles() {
  const query = 'SELECT id, email, full_name, phone, balance, locked_balance, total_earned, status, created_at FROM profiles ORDER BY created_at DESC;';
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.table(data);
}
checkProfiles();
