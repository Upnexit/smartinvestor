const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function check() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
    })
  });
  console.log('Realtime tables:', await res.json());
}

check().catch(console.error);
