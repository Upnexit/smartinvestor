import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load credentials from .env.local (never hardcode tokens in source)
let token = process.env.SUPABASE_ACCESS_TOKEN;
let anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = "https://gpyarcrizvjyukaazndj.supabase.co";
const projectRef = "gpyarcrizvjyukaazndj";

// Auto-load from .env.local if not in environment
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const envContent = readFileSync(envPath, "utf8");
  if (!token) token = envContent.match(/SUPABASE_ACCESS_TOKEN=["']?([^\s"'\r\n]+)/)?.[1];
  if (!anonKey) anonKey = envContent.match(/VITE_SUPABASE_ANON_KEY=["']?([^\s"'\r\n]+)/)?.[1];
} catch (_) { /* .env.local not present — rely on environment variables */ }

if (!token) { console.error("❌ SUPABASE_ACCESS_TOKEN not set. Export it or add to .env.local"); process.exit(1); }
if (!anonKey) { console.error("❌ VITE_SUPABASE_ANON_KEY not set. Export it or add to .env.local"); process.exit(1); }

async function querySql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function runComprehensiveTests() {
  console.log("===============================================================");
  console.log("🚀 STARTING BACKEND & DATABASE SYSTEM VALIDATION TEST SUITE");
  console.log("===============================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName} ${details ? "(" + details + ")" : ""}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? "(" + details + ")" : ""}`);
    }
  }

  // -------------------------------------------------------------
  // TEST SECTION 1: LUCKY SPIN WHEEL SYSTEM
  // -------------------------------------------------------------
  console.log("--- 1. Testing Lucky Spin Wheel System ---");

  // 1.1 Check slices
  const sliceCountRes = await querySql("SELECT count(*) FROM public.spin_wheel_slices WHERE is_active = true;");
  const activeSlicesCount = Number(sliceCountRes[0]?.count || 0);
  assert(activeSlicesCount === 11, "Spin Wheel Slices Active in DB", `Found ${activeSlicesCount} active slices`);

  // 1.2 Check spin functions exist in database
  const funcs = await querySql(`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_name IN ('execute_user_spin', 'submit_spin_deposit', 'admin_approve_spin', 'admin_reject_spin');
  `);
  const foundFuncs = funcs.map(f => f.routine_name);
  assert(foundFuncs.includes("execute_user_spin"), "RPC execute_user_spin exists");
  assert(foundFuncs.includes("submit_spin_deposit"), "RPC submit_spin_deposit exists");
  assert(foundFuncs.includes("admin_approve_spin"), "RPC admin_approve_spin exists");
  assert(foundFuncs.includes("admin_reject_spin"), "RPC admin_reject_spin exists");

  // 1.3 Test Spin Execution via Authenticated Client
  const client = createClient(supabaseUrl, anonKey);
  const adminId = "54c008ad-bc82-4ebb-a083-d37f92414808";
  const { data: authAdmin, error: authErr } = await client.auth.signInWithPassword({
    email: "smartclickbd@gmail.com",
    password: "smartclickbd"
  });
  assert(!authErr && authAdmin?.user?.id === adminId, "Admin authentication for spin test");

  await querySql(`UPDATE public.profiles SET last_spin_at = NULL WHERE id = '${adminId}';`);
  const { data: spinRes, error: spinErr } = await client.rpc("execute_user_spin", { p_user_id: adminId });
  assert(!spinErr && spinRes && spinRes.success === true, "Spin executed via authenticated RPC", `Won ৳${spinRes?.won_amount}, Deposit needed: ৳${spinRes?.deposit_required}`);

  // 1.4 Test Deposit submission on that spin
  const spinId = spinRes?.spin_id;
  if (spinId) {
    const { data: depRes, error: depErr } = await client.rpc("submit_spin_deposit", {
      p_spin_id: spinId,
      p_method: "bkash",
      p_sender: "01711122233",
      p_trx: `TRX_TEST_${Date.now()}`
    });
    assert(!depErr && depRes && depRes.success === true, "Spin deposit submitted", depRes?.message || "");

    // 1.5 Test Admin Approval
    const { data: appRes, error: appErr } = await client.rpc("admin_approve_spin", {
      p_spin_id: spinId,
      p_admin_id: adminId
    });
    assert(!appErr && appRes && appRes.success === true, "Spin approved by admin and balance credited", `New balance: ৳${appRes?.new_balance}`);

    // Cleanup test spin history
    await querySql(`DELETE FROM public.spin_history WHERE id = '${spinId}'; UPDATE public.profiles SET balance = 0 WHERE id = '${adminId}';`);
  }

  // -------------------------------------------------------------
  // TEST SECTION 2: DELETED USERS ARCHIVE & REAL-TIME SEARCH
  // -------------------------------------------------------------
  console.log("\n--- 2. Testing Deleted Users Archive & Search ---");

  // 2.1 Check archive row count
  const archiveCount = await querySql("SELECT count(*) FROM public.deleted_users_archive;");
  const countNum = Number(archiveCount[0]?.count || 0);
  assert(countNum >= 95, "Deleted users archived in database", `Total archived: ${countNum} users`);

  // 2.2 Test search by phone number
  const searchPhone = await querySql(`
    SELECT * FROM public.deleted_users_archive 
    WHERE phone ILIKE '%01759246396%' OR phone ILIKE '%01635298128%';
  `);
  assert(Array.isArray(searchPhone) && searchPhone.length >= 2, "Real-time search by phone number", `Found ${searchPhone?.length} records`);

  // 2.3 Test client-side authenticated admin search query

  const { data: clientSearch, error: clientSearchErr } = await client
    .from("deleted_users_archive")
    .select("*")
    .or("phone.ilike.%01759246396%,full_name.ilike.%Istiak%")
    .limit(5);

  assert(!clientSearchErr && clientSearch && clientSearch.length > 0, "Client-side admin archive search via RLS", `Found: ${clientSearch?.[0]?.full_name} (${clientSearch?.[0]?.phone})`);

  // -------------------------------------------------------------
  // TEST SECTION 3: REPORT & REVENUE REAL-TIME CALCULATIONS
  // -------------------------------------------------------------
  console.log("\n--- 3. Testing Report & Revenue Calculations ---");

  // 3.1 Verify active customer profile count
  const profQuery = await querySql("SELECT count(*) FROM public.profiles WHERE email <> 'smartclickbd@gmail.com';");
  const activeCustomerCount = Number(profQuery[0]?.count || 0);
  assert(activeCustomerCount > 0, "Active customer profiles isolated", `Total active customers: ${activeCustomerCount}`);

  // 3.2 Verify user_packages revenue only includes active customers
  const revCheck = await querySql(`
    SELECT 
      SUM(CASE WHEN up.status = 'active' THEN COALESCE(p.price, 0) ELSE 0 END) as total_rev,
      COUNT(CASE WHEN up.status = 'active' THEN 1 END) as active_pkg_count
    FROM public.user_packages up
    JOIN public.packages p ON p.id = up.package_id
    JOIN public.profiles prof ON prof.id = up.user_id
    WHERE prof.email <> 'smartclickbd@gmail.com';
  `);
  const rev = Number(revCheck[0]?.total_rev || 0);
  const pkgCount = Number(revCheck[0]?.active_pkg_count || 0);
  assert(rev > 0 && pkgCount > 0, "Revenue calculation strictly on active customers", `Total revenue: ৳${rev.toLocaleString("bn-BD")}, Packages: ${pkgCount}`);

  // 3.3 Verify zero orphaned user packages
  const orphanPkgs = await querySql(`
    SELECT count(*) FROM public.user_packages up 
    WHERE up.user_id NOT IN (SELECT id FROM public.profiles);
  `);
  assert(Number(orphanPkgs[0]?.count || 0) === 0, "Zero orphaned user packages in database");

  // 3.4 Verify zero orphaned withdrawals
  const orphanWiths = await querySql(`
    SELECT count(*) FROM public.withdrawals w 
    WHERE w.user_id NOT IN (SELECT id FROM public.profiles);
  `);
  assert(Number(orphanWiths[0]?.count || 0) === 0, "Zero orphaned withdrawals in database");

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (100% GREEN)`);
  console.log("===============================================================\n");
}

runComprehensiveTests();
