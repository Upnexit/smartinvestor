import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function sqlQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed (${res.status}): ${text}`);
  }
  return await res.json();
}

async function inspectAll() {
  console.log('Querying enums...');
  const enums = await sqlQuery(`
    SELECT t.typname as enum_name, e.enumlabel as enum_value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);

  console.log('Querying tables & columns...');
  const columns = await sqlQuery(`
    SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  console.log('Querying constraints (PK, FK, Unique, Check)...');
  const constraints = await sqlQuery(`
    SELECT 
      tc.table_name, 
      tc.constraint_name, 
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule,
      pg_get_constraintdef(pgc.oid) as constraint_def
    FROM information_schema.table_constraints AS tc 
    JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
    LEFT JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `);

  console.log('Querying indexes...');
  const indexes = await sqlQuery(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);

  console.log('Querying RLS policies...');
  const policies = await sqlQuery(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);

  console.log('Querying functions...');
  const functions = await sqlQuery(`
    SELECT 
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as definition,
      p.prosecdef as is_security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);

  console.log('Querying triggers...');
  const triggers = await sqlQuery(`
    SELECT 
      event_object_table as table_name,
      trigger_name,
      event_manipulation,
      action_statement,
      action_timing,
      action_orientation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `);

  console.log('Querying seed data from packages, spin_wheel_slices, site_settings...');
  const packages = await sqlQuery(`SELECT * FROM public.packages;`);
  const slices = await sqlQuery(`SELECT * FROM public.spin_wheel_slices ORDER BY sort_order;`);
  const settings = await sqlQuery(`SELECT * FROM public.site_settings;`);

  const output = {
    enums,
    columns,
    constraints,
    indexes,
    policies,
    functions,
    triggers,
    seed: {
      packages,
      slices,
      settings
    }
  };

  fs.writeFileSync('scripts/db-schema-dump.json', JSON.stringify(output, null, 2));
  console.log('Successfully saved db-schema-dump.json! Tables count:', new Set(columns.map(c => c.table_name)).size, 'Functions count:', functions.length);
}

inspectAll().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
