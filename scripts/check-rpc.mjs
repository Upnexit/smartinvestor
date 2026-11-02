const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function checkRpc() {
  const query = "SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_name = 'admin_delete_user_data';";
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  console.log(await res.json());
}
checkRpc();
