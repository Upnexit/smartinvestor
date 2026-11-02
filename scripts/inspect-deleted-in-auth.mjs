const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function run() {
  const query = `
    SELECT 
      (SELECT count(*) FROM user_packages up WHERE up.user_id IN (SELECT u.id FROM auth.users u LEFT JOIN profiles p ON p.id = u.id WHERE p.id IS NULL)) as up_count,
      (SELECT count(*) FROM withdrawals w WHERE w.user_id IN (SELECT u.id FROM auth.users u LEFT JOIN profiles p ON p.id = u.id WHERE p.id IS NULL)) as with_count,
      (SELECT count(*) FROM task_submissions t WHERE t.user_id IN (SELECT u.id FROM auth.users u LEFT JOIN profiles p ON p.id = u.id WHERE p.id IS NULL)) as task_count;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  console.log('Orphan transactions:', await res.json());
}
run();
