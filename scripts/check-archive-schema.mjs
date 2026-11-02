const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function checkSchema() {
  const query = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'deleted_users_archive' ORDER BY ordinal_position;";
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  console.log(await res.json());
}
checkSchema();
