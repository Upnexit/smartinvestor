const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = "gpyarcrizvjyukaazndj";

async function inspectOrphans() {
  const query = `
    SELECT 'user_packages' as tbl, count(*) FROM public.user_packages WHERE user_id NOT IN (SELECT id FROM public.profiles)
    UNION ALL
    SELECT 'withdrawals' as tbl, count(*) FROM public.withdrawals WHERE user_id NOT IN (SELECT id FROM public.profiles)
    UNION ALL
    SELECT 'task_submissions' as tbl, count(*) FROM public.task_submissions WHERE user_id NOT IN (SELECT id FROM public.profiles);
  `;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  console.log("Orphan counts in operational tables:", await res.json());

  // Also check if there are distinct user_ids in user_packages or withdrawals that don't exist in profiles!
  const query2 = `
    SELECT DISTINCT up.user_id, up.sender_number, up.payment_txn, up.created_at
    FROM public.user_packages up
    WHERE up.user_id NOT IN (SELECT id FROM public.profiles)
    LIMIT 20;
  `;
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: query2 })
  });
  console.log("Orphaned user_packages sample:", await res2.json());

  // Also check withdrawals
  const query3 = `
    SELECT DISTINCT w.user_id, w.account_number, w.amount, w.status, w.created_at
    FROM public.withdrawals w
    WHERE w.user_id NOT IN (SELECT id FROM public.profiles)
    LIMIT 20;
  `;
  const res3 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: query3 })
  });
  console.log("Orphaned withdrawals sample:", await res3.json());
}

inspectOrphans().catch(console.error);
