const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function check() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment FROM information_schema.sequences WHERE sequence_schema = 'public';`
    })
  });
  console.log('Sequences:', await res.json());
}

check().catch(console.error);
