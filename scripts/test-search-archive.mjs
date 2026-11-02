const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function testSearch(num) {
  const query = `
    SELECT id, full_name, phone, email, registered_at, deleted_at, payment_method, payment_number, archive_notes
    FROM public.deleted_users_archive
    WHERE phone ILIKE '%${num}%' OR full_name ILIKE '%${num}%'
    LIMIT 5;
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  console.log(`\n--- Search for ${num} ---`);
  console.log(await res.json());
}

async function main() {
  await testSearch('01759246396');
  await testSearch('01635298128');
  await testSearch('01799498078');
}
main();
