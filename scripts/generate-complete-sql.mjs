import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/db-schema-dump.json', 'utf8'));

const tableOrder = [
  'profiles',
  'user_roles',
  'packages',
  'distributor_packages',
  'site_settings',
  'notices',
  'notice_deletion_log',
  'notice_dismissals',
  'communities',
  'community_bans',
  'community_messages',
  'link_tasks',
  'task_submissions',
  'user_packages',
  'user_payment_methods',
  'referral_earnings',
  'withdrawals',
  'shop_products',
  'shop_orders',
  'distributors',
  'distributor_applications',
  'distributor_earnings',
  'distributor_leads',
  'distributor_package_orders',
  'distributor_tasks',
  'distributor_withdrawals',
  'deleted_users_archive',
  'spin_wheel_slices',
  'spin_history',
  'support_messages',
  'push_subscriptions',
  'email_otps',
  'activity_logs',
  'error_logs'
];

// Helper to format columns
function formatDataType(col) {
  if (col.data_type === 'USER-DEFINED') {
    return `public.${col.udt_name}`;
  }
  if (col.data_type === 'ARRAY') {
    if (col.udt_name === '_text') return 'text[]';
    if (col.udt_name === '_uuid') return 'uuid[]';
    return `${col.udt_name.replace('_', '')}[]`;
  }
  if (col.data_type === 'timestamp with time zone') {
    return 'timestamptz';
  }
  if (col.data_type === 'timestamp without time zone') {
    return 'timestamp';
  }
  if (col.data_type === 'character varying') {
    return col.character_maximum_length ? `varchar(${col.character_maximum_length})` : 'varchar';
  }
  if (col.data_type === 'numeric') {
    if (col.numeric_precision && col.numeric_scale) {
      return `numeric(${col.numeric_precision},${col.numeric_scale})`;
    }
    return 'numeric';
  }
  return col.data_type;
}

// Build table DDL
function buildTableDDL(tableName) {
  const cols = raw.columns.filter(c => c.table_name === tableName);
  const pks = raw.constraints.filter(c => c.table_name === tableName && c.constraint_type === 'PRIMARY KEY');
  const uniqueCons = raw.constraints.filter(c => c.table_name === tableName && c.constraint_type === 'UNIQUE');
  const checkCons = raw.constraints.filter(c => c.table_name === tableName && c.constraint_type === 'CHECK' && !c.constraint_name.endsWith('_not_null'));

  let lines = [];
  for (const col of cols) {
    let line = `    ${col.column_name} ${formatDataType(col)}`;
    if (col.column_default) {
      line += ` DEFAULT ${col.column_default}`;
    }
    if (col.is_nullable === 'NO') {
      line += ' NOT NULL';
    }
    lines.push(line);
  }

  // Primary Key
  if (pks.length > 0) {
    const pkCols = [...new Set(pks.map(p => p.column_name))].join(', ');
    lines.push(`    CONSTRAINT ${tableName}_pkey PRIMARY KEY (${pkCols})`);
  }

  // Unique Constraints
  const seenUniq = new Set();
  for (const u of uniqueCons) {
    if (!seenUniq.has(u.constraint_name)) {
      seenUniq.add(u.constraint_name);
      lines.push(`    CONSTRAINT ${u.constraint_name} ${u.constraint_def}`);
    }
  }

  // Check Constraints
  const seenCheck = new Set();
  for (const chk of checkCons) {
    if (!seenCheck.has(chk.constraint_name)) {
      seenCheck.add(chk.constraint_name);
      lines.push(`    CONSTRAINT ${chk.constraint_name} ${chk.constraint_def}`);
    }
  }

  return `CREATE TABLE IF NOT EXISTS public.${tableName} (\n${lines.join(',\n')}\n);`;
}

// Build FK statements
function buildFKStatements() {
  const fks = raw.constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
  const statements = [];
  const seen = new Set();

  for (const fk of fks) {
    if (seen.has(fk.constraint_name)) continue;
    seen.add(fk.constraint_name);
    statements.push(
      `DO $$ BEGIN\n` +
      `    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fk.constraint_name}') THEN\n` +
      `        ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} ${fk.constraint_def};\n` +
      `    END IF;\n` +
      `END $$;`
    );
  }
  return statements.join('\n\n');
}

// Build Indexes
function buildIndexes() {
  const stmts = [];
  for (const idx of raw.indexes) {
    // Skip auto-generated PK indexes
    if (idx.indexname.endsWith('_pkey')) continue;
    // Replace "CREATE INDEX" or "CREATE UNIQUE INDEX" with "CREATE INDEX IF NOT EXISTS"
    let def = idx.indexdef;
    if (def.startsWith('CREATE UNIQUE INDEX ')) {
      def = def.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ');
    } else if (def.startsWith('CREATE INDEX ')) {
      def = def.replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS ');
    }
    stmts.push(def + ';');
  }
  return stmts.join('\n');
}

// Build Functions
function buildFunctions() {
  const stmts = [];
  for (const f of raw.functions) {
    stmts.push(f.definition.trim() + ';');
  }
  return stmts.join('\n\n');
}

// Build Triggers
function buildTriggers() {
  const stmts = [];
  const seen = new Set();
  for (const t of raw.triggers) {
    const key = `${t.table_name}.${t.trigger_name}`;
    if (seen.has(key)) continue;
    seen.add(key);

    stmts.push(
      `DROP TRIGGER IF EXISTS ${t.trigger_name} ON public.${t.table_name};\n` +
      `CREATE TRIGGER ${t.trigger_name}\n` +
      `    ${t.action_timing} ${t.event_manipulation} ON public.${t.table_name}\n` +
      `    FOR EACH ${t.action_orientation}\n` +
      `    ${t.action_statement};`
    );
  }
  return stmts.join('\n\n');
}

// Build RLS Policies
function buildPolicies() {
  const stmts = [];
  
  // First enable RLS on all tables
  for (const t of tableOrder) {
    stmts.push(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`);
  }
  stmts.push('');

  // Add policies
  for (const p of raw.policies) {
    let sql = `DROP POLICY IF EXISTS "${p.policyname}" ON public.${p.tablename};\n`;
    sql += `CREATE POLICY "${p.policyname}" ON public.${p.tablename}\n`;
    if (p.cmd !== 'ALL') {
      sql += `    FOR ${p.cmd}\n`;
    }
    if (p.roles) {
      const rolesFormatted = p.roles.replace('{', '').replace('}', '').split(',').join(', ');
      sql += `    TO ${rolesFormatted}\n`;
    }
    if (p.qual) {
      sql += `    USING (${p.qual})\n`;
    }
    if (p.with_check) {
      sql += `    WITH CHECK (${p.with_check})\n`;
    }
    sql = sql.trim() + ';';
    stmts.push(sql);
  }
  return stmts.join('\n\n');
}

// Build Storage Buckets & Policies
function buildStorage() {
  return `
-- =========================================================================
-- SECTION 7: STORAGE BUCKETS & STORAGE RLS POLICIES
-- =========================================================================

-- Insert Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, null, null),
    ('package-images', 'package-images', true, null, null),
    ('payment-logos', 'payment-logos', true, null, null),
    ('community-voice', 'community-voice', false, null, null),
    ('payment-screenshots', 'payment-screenshots', false, null, null)
ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public;

-- Note: RLS is already enabled by default on storage.objects in Supabase.
-- Attempting ALTER TABLE storage.objects requires supabase_storage_admin owner, so we omit that command.

-- Storage Policies: avatars
DROP POLICY IF EXISTS "read avatars" ON storage.objects;
CREATE POLICY "read avatars" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "user write own avatar" ON storage.objects;
CREATE POLICY "user write own avatar" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid())
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

-- Storage Policies: package-images
DROP POLICY IF EXISTS "read package images" ON storage.objects;
CREATE POLICY "read package images" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'package-images');

DROP POLICY IF EXISTS "admin write package images" ON storage.objects;
CREATE POLICY "admin write package images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'package-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'package-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies: payment-logos
DROP POLICY IF EXISTS "read payment logos" ON storage.objects;
CREATE POLICY "read payment logos" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'payment-logos');

DROP POLICY IF EXISTS "admin write payment logos" ON storage.objects;
CREATE POLICY "admin write payment logos" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies: community-voice
DROP POLICY IF EXISTS "auth read community voice" ON storage.objects;
CREATE POLICY "auth read community voice" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-voice');

DROP POLICY IF EXISTS "auth upload own community voice" ON storage.objects;
CREATE POLICY "auth upload own community voice" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth delete own community voice" ON storage.objects;
CREATE POLICY "auth delete own community voice" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-voice' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage Policies: payment-screenshots
DROP POLICY IF EXISTS "user read own screenshots" ON storage.objects;
CREATE POLICY "user read own screenshots" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-screenshots' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "user write own screenshots" ON storage.objects;
CREATE POLICY "user write own screenshots" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-screenshots' AND owner = auth.uid());

DROP POLICY IF EXISTS "admin delete screenshots" ON storage.objects;
CREATE POLICY "admin delete screenshots" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-screenshots' AND public.has_role(auth.uid(), 'admin'));
`;
}

// Build Seed Data
function buildSeedData() {
  const seedPackages = raw.seed.packages;
  const seedSlices = raw.seed.slices;
  const seedSettings = raw.seed.settings;

  let pkgSQL = '';
  if (seedPackages && seedPackages.length > 0) {
    pkgSQL += `INSERT INTO public.packages (id, name, price, daily_tasks, daily_income, duration_days, description, active, sort_order, image_url, featured, is_legacy)\nVALUES\n`;
    const rows = seedPackages.map(p => {
      const desc = p.description ? `'${p.description.replace(/'/g, "''")}'` : 'NULL';
      const img = p.image_url ? `'${p.image_url.replace(/'/g, "''")}'` : 'NULL';
      return `    ('${p.id}', '${p.name.replace(/'/g, "''")}', ${p.price}, ${p.daily_tasks}, ${p.daily_income}, ${p.duration_days}, ${desc}, ${p.active ? 'true' : 'false'}, ${p.sort_order || 0}, ${img}, ${p.featured ? 'true' : 'false'}, ${p.is_legacy ? 'true' : 'false'})`;
    });
    pkgSQL += rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
  }

  let sliceSQL = '';
  if (seedSlices && seedSlices.length > 0) {
    sliceSQL += `INSERT INTO public.spin_wheel_slices (id, label, amount, color, text_color, weight, is_active, sort_order)\nVALUES\n`;
    const rows = seedSlices.map(s => {
      return `    ('${s.id}', '${s.label.replace(/'/g, "''")}', ${s.amount}, '${s.color}', '${s.text_color}', ${s.weight}, ${s.is_active ? 'true' : 'false'}, ${s.sort_order})`;
    });
    sliceSQL += rows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n';
  }

  let setSQL = '';
  if (seedSettings && seedSettings.length > 0) {
    setSQL += `INSERT INTO public.site_settings (key, value)\nVALUES\n`;
    const rows = seedSettings.map(s => {
      const val = typeof s.value === 'object' ? JSON.stringify(s.value).replace(/'/g, "''") : String(s.value).replace(/'/g, "''");
      return `    ('${s.key}', '${val}'::jsonb)`;
    });
    setSQL += rows.join(',\n') + '\nON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;\n';
  }

  return `
-- =========================================================================
-- SECTION 8: SEED DATA & INITIAL CONFIGURATION
-- =========================================================================

-- 1. Default Investment Packages
${pkgSQL}

-- 2. Lucky Spin Wheel Slices (24h Lucky Spin with 50% Deposit Claim)
${sliceSQL}

-- 3. Site Settings
${setSQL}
`;
}

// Build Realtime
function buildRealtime() {
  return `
-- =========================================================================
-- SECTION 9: REALTIME PUBLICATIONS
-- =========================================================================

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_packages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.link_tasks;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_earnings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.distributors;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.distributor_applications;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
`;
}

// Build Admin Role assignment
function buildAdminRole() {
  return `
-- =========================================================================
-- SECTION 10: DESIGNATED SUPER ADMIN ROLE SETUP
-- =========================================================================
-- Automatically assigns 'admin' and 'user' roles to smartclickbd@gmail.com if already registered in auth.users

DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'smartclickbd@gmail.com' LIMIT 1;
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'admin'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_admin_id, 'user'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
`;
}

// Combine all sections
function generateAll() {
  const header = `/*
================================================================================
  SMART CLICK BD (BD Eran) - COMPLETE DATABASE CONSOLIDATED SCHEMA SCRIPT
================================================================================
  Project Ref: gpyarcrizvjyukaazndj
  Primary Admin: smartclickbd@gmail.com
  
  USAGE:
  1. Open a new Supabase project SQL Editor.
  2. Paste this entire script and click "Run".
  3. Every table, enum, function, trigger, policy, storage bucket, and seed
     record is created idempotently without any errors.
================================================================================
*/

-- =========================================================================
-- SECTION 1: EXTENSIONS & SEQUENCES
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.user_code_seq 
    START WITH 1000 
    INCREMENT BY 1 
    MINVALUE 1;

-- =========================================================================
-- SECTION 2: CUSTOM ENUM TYPES
-- =========================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'distributor');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
        CREATE TYPE public.package_status AS ENUM ('pending', 'active', 'rejected', 'expired');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'rocket');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'banned');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
    END IF;
END $$;
`;

  const tablesSection = `\n-- =========================================================================\n-- SECTION 3: DATABASE TABLES\n-- =========================================================================\n\n` + 
    tableOrder.map(t => buildTableDDL(t)).join('\n\n');

  const fkSection = `\n-- =========================================================================\n-- SECTION 4: FOREIGN KEY CONSTRAINTS\n-- =========================================================================\n\n` + 
    buildFKStatements();

  const indexSection = `\n-- =========================================================================\n-- SECTION 5: PERFORMANCE & SEARCH INDEXES\n-- =========================================================================\n\n` + 
    buildIndexes();

  const functionSection = `\n-- =========================================================================\n-- SECTION 6: STORED PROCEDURES & DATABASE FUNCTIONS (58 FUNCTIONS)\n-- =========================================================================\n\n` + 
    buildFunctions();

  const authTrigger = `\n-- =========================================================================\n-- AUTH TRIGGER: AUTOMATIC PROFILE & ROLE CREATION ON SIGNUP\n-- =========================================================================\n\n` +
    `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;\n` +
    `CREATE TRIGGER on_auth_user_created\n` +
    `    AFTER INSERT ON auth.users\n` +
    `    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();\n`;

  const triggerSection = `\n-- =========================================================================\n-- TABLE TRIGGERS\n-- =========================================================================\n\n` + 
    buildTriggers();

  const rlsSection = `\n-- =========================================================================\n-- ROW LEVEL SECURITY (RLS) POLICIES\n-- =========================================================================\n\n` + 
    buildPolicies();

  const storageSection = buildStorage();
  const seedSection = buildSeedData();
  const realtimeSection = buildRealtime();
  const adminSection = buildAdminRole();

  const fullSQL = [
    header,
    tablesSection,
    fkSection,
    indexSection,
    functionSection,
    authTrigger,
    triggerSection,
    rlsSection,
    storageSection,
    seedSection,
    realtimeSection,
    adminSection
  ].join('\n\n');

  fs.writeFileSync('complete_database.sql', fullSQL, 'utf8');
  fs.writeFileSync('supabase/complete_database.sql', fullSQL, 'utf8');
  console.log('Successfully generated complete_database.sql! Size:', fullSQL.length, 'bytes');
}

generateAll();
