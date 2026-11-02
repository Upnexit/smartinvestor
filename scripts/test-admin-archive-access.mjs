import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gpyarcrizvjyukaazndj.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdweWFyY3JpenZqeXVrYWF6bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mjk5MzgsImV4cCI6MjA5ODMwNTkzOH0.iI3hMWQxrwYVuAz-Lxkq257Be-Rn1GXCjF0hVPLzupw";

const client = createClient(supabaseUrl, anonKey);

async function testAdminLoginAndArchive() {
  console.log("Logging in as admin...");
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: "smartclickbd@gmail.com",
    password: "smartclickbd"
  });

  if (authError) {
    console.error("Auth error:", authError);
    return;
  }
  console.log("Admin logged in successfully! UID:", authData.user.id);

  console.log("\nQuerying deleted_users_archive with anon client as authenticated admin...");
  const { data: archive, error: arcError } = await client
    .from("deleted_users_archive")
    .select("*")
    .order("deleted_at", { ascending: false })
    .limit(5);

  if (arcError) {
    console.error("Archive query error:", arcError);
  } else {
    console.log(`Successfully fetched ${archive.length} archive records! Sample:`, archive[0]);
  }

  console.log("\nSearching for phone '01759246396'...");
  const { data: searchRes, error: searchErr } = await client
    .from("deleted_users_archive")
    .select("*")
    .or("phone.ilike.%01759246396%,full_name.ilike.%01759246396%")
    .limit(5);

  if (searchErr) {
    console.error("Search error:", searchErr);
  } else {
    console.log(`Found ${searchRes.length} records matching phone!`, searchRes);
  }
}

testAdminLoginAndArchive();
