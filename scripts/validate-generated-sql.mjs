import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function testSQL() {
  const sql = fs.readFileSync('complete_database.sql', 'utf8');

  // Supabase management API allows queries.
  // Let's test a transaction that parses and executes, then rolls back.
  // Note: DDL in Postgres is transactional!
  console.log('Validating complete_database.sql with BEGIN ... ROLLBACK...');
  
  const testQuery = `
    BEGIN;
    ${sql}
    ROLLBACK;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: testQuery })
  });

  const body = await res.json();
  if (!res.ok || (body && body.error)) {
    console.error('Validation FAILED:', JSON.stringify(body, null, 2));
    process.exit(1);
  } else {
    console.log('Validation PASSED! The complete database SQL script is 100% syntactically valid and executes without error!');
  }
}

testSQL().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
