const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function inspectDb() {
  console.log("Checking deleted_users_archive...");
  const res1 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: "SELECT count(*) FROM public.deleted_users_archive; SELECT * FROM public.deleted_users_archive LIMIT 5;" })
  });
  console.log("Archive count & sample:", await res1.json());

  console.log("\nChecking RLS policies on deleted_users_archive...");
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: "SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'deleted_users_archive';" })
  });
  console.log("RLS Policies:", await res2.json());

  console.log("\nChecking orphaned records in operational tables whose user_id is NOT in profiles...");
  const res3 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: `
      SELECT 'user_packages' as tbl, count(*) FROM public.user_packages WHERE user_id NOT IN (SELECT id FROM public.profiles)
      UNION ALL
      SELECT 'withdrawals' as tbl, count(*) FROM public.withdrawals WHERE user_id NOT IN (SELECT id FROM public.profiles)
      UNION ALL
      SELECT 'task_submissions' as tbl, count(*) FROM public.task_submissions WHERE user_id NOT IN (SELECT id FROM public.profiles)
      UNION ALL
      SELECT 'referral_earnings' as tbl, count(*) FROM public.referral_earnings WHERE user_id NOT IN (SELECT id FROM public.profiles) OR referrer_id NOT IN (SELECT id FROM public.profiles);
    ` })
  });
  console.log("Orphaned records count:", await res3.json());
}

inspectDb().catch(console.error);
