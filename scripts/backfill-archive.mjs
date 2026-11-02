const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gpyarcrizvjyukaazndj';

async function backfillArchive() {
  const query = `
    INSERT INTO public.deleted_users_archive (
      original_user_id,
      full_name,
      phone,
      email,
      user_code,
      referral_code,
      payment_method,
      payment_number,
      registered_at,
      deleted_at,
      deleted_by,
      total_packages_amount,
      packages_count,
      packages_details,
      tasks_completed_count,
      total_tasks_reward,
      total_withdrawn_amount,
      withdrawals_count,
      withdrawals_details,
      balance_at_deletion,
      locked_balance_at_deletion,
      lifetime_earned,
      archive_notes
    )
    SELECT 
      u.id as original_user_id,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
      COALESCE(u.raw_user_meta_data->>'phone', u.phone, '') as phone,
      u.email as email,
      COALESCE(u.raw_user_meta_data->>'user_code', u.raw_user_meta_data->>'ref', '') as user_code,
      COALESCE(u.raw_user_meta_data->>'ref', '') as referral_code,
      COALESCE(u.raw_user_meta_data->>'payment_method', 'bkash') as payment_method,
      COALESCE(u.raw_user_meta_data->>'payment_number', u.raw_user_meta_data->>'phone', '') as payment_number,
      u.created_at as registered_at,
      COALESCE(u.updated_at, u.created_at, NOW()) as deleted_at,
      NULL as deleted_by,
      0 as total_packages_amount,
      0 as packages_count,
      '[]'::jsonb as packages_details,
      0 as tasks_completed_count,
      0 as total_tasks_reward,
      0 as total_withdrawn_amount,
      0 as withdrawals_count,
      '[]'::jsonb as withdrawals_details,
      0 as balance_at_deletion,
      0 as locked_balance_at_deletion,
      0 as lifetime_earned,
      'পূর্বে ডিলিটকৃত অ্যাকাউন্ট হিস্ট্রি ব্যাকফিল' as archive_notes
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
      AND u.id NOT IN (SELECT original_user_id FROM public.deleted_users_archive)
    RETURNING id, full_name, phone, email;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log('Backfill result length:', Array.isArray(data) ? data.length : data);
  if (Array.isArray(data)) {
    console.table(data.slice(0, 10));
  }
}
backfillArchive();
