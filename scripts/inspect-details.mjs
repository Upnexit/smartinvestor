import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function sqlQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function run() {
  const authTriggers = await sqlQuery(`
    SELECT trigger_name, event_manipulation, event_object_schema, event_object_table, action_statement
    FROM information_schema.triggers 
    WHERE event_object_schema = 'auth';
  `);
  console.log('Auth triggers:', authTriggers);

  const storageBuckets = await sqlQuery(`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets;
  `);
  console.log('Storage buckets:', storageBuckets);

  const storagePolicies = await sqlQuery(`
    SELECT policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage';
  `);
  console.log('Storage policies count:', storagePolicies.length);

  // Check triggers in public
  const rawData = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));
  console.log('Enums:', rawData.enums.map(e => `${e.enum_name}.${e.enum_value}`).join(', '));
  console.log('Function names:', rawData.functions.map(f => f.function_name));
}

run().catch(console.error);
