import fs from "node:fs";

const file = "src/routes/_authenticated/withdraw.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Add Link to import
if (!content.includes('Link,')) {
  content = content.replace('import { createFileRoute }', 'import { createFileRoute, Link }');
}
if (!content.includes('Users,')) {
  content = content.replace('AlertCircle, Smartphone, ShieldCheck,', 'AlertCircle, Smartphone, ShieldCheck, Users, ShieldAlert, Sparkles, ExternalLink,');
}

// Add state for eligibility
const oldStates = `  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);`;

const newStates = `  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [eligibility, setEligibility] = useState<{
    referrals_count: number;
    required_referrals: number;
    referrals_completed: boolean;
    is_verified: boolean;
    verification_status: "unpaid" | "pending" | "verified";
    verification_fee: number;
    verification_pkg_id: string;
    can_withdraw: boolean;
  } | null>(null);`;

content = content.replace(oldStates, newStates);

// Inside useEffect, load eligibility
const oldFetch = `      const [{ data: p }, { data: w }] = await Promise.all([
        supabase.from("profiles").select("balance,locked_balance,payment_method,payment_number,email_verified")
          .eq("id", u.user.id).maybeSingle(),
        supabase.from("withdrawals").select("*").eq("user_id", u.user.id)
          .order("created_at", { ascending: false }).limit(20),
      ]);`;

const newFetch = `      const [{ data: p }, { data: w }, { data: elig }] = await Promise.all([
        supabase.from("profiles").select("balance,locked_balance,payment_method,payment_number,email_verified")
          .eq("id", u.user.id).maybeSingle(),
        supabase.from("withdrawals").select("*").eq("user_id", u.user.id)
          .order("created_at", { ascending: false }).limit(20),
        supabase.rpc("check_withdraw_eligibility"),
      ]);
      if (elig && typeof elig === "object") {
        setEligibility(elig as any);
      }`;

content = content.replace(oldFetch, newFetch);

// Modify handleSubmit to check can_withdraw
const oldHandleSubmitCheck = `  async function handleSubmit() {
    if (!userId || !phoneValid || !amountValid) return;`;

const newHandleSubmitCheck = `  async function handleSubmit() {
    if (!userId || !phoneValid || !amountValid) return;
    if (eligibility && !eligibility.can_withdraw) {
      if (!eligibility.referrals_completed) {
        toast.error(\`উইথড্র করতে কমপক্ষে \${eligibility.required_referrals} জন বন্ধুকে সফল রেফার করতে হবে।\`);
        return;
      }
      if (!eligibility.is_verified) {
        toast.error("উইথড্র করার পূর্বে আপনার অ্যাকাউন্টটি ভেরিফাই করতে হবে।");
        return;
      }
    }`;

content = content.replace(oldHandleSubmitCheck, newHandleSubmitCheck);

// Insert Eligibility Card right above the withdraw form
const formTarget = `      {/* Form */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">`;

const eligibilityCard = `      {/* Withdraw Requirements Progress & Verification Card */}
      {eligibility && (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/50 p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="bn-display text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              উইথড্র করার আবশ্যিক শর্তাবলী
            </h3>
            <span className={cn(
              "rounded-full px-3 py-1 text-xs font-bold ring-1",
              eligibility.can_withdraw
                ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                : "bg-rose-100 text-rose-800 ring-rose-300"
            )}>
              {eligibility.can_withdraw ? "উইথড্র করার যোগ্য ✅" : "শর্ত বাকি আছে ⚠️"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Condition 1: 10 Referrals */}
            <div className={cn(
              "rounded-2xl border p-4 transition-all",
              eligibility.referrals_completed
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-white"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl font-bold",
                    eligibility.referrals_completed
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">১. ১০ জন বন্ধুকে রেফার</h4>
                    <p className="text-xs text-slate-500">আপনার কোড দিয়ে যুক্ত করুন</p>
                  </div>
                </div>
                <span className={cn(
                  "font-bold text-xs px-2.5 py-1 rounded-lg",
                  eligibility.referrals_completed
                    ? "bg-emerald-200/80 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                )}>
                  {eligibility.referrals_count} / {eligibility.required_referrals}
                </span>
              </div>

              {!eligibility.referrals_completed && (
                <div className="mt-3">
                  <Link
                    to="/referral"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 underline hover:text-amber-900"
                  >
                    রেফারেল লিংক ও কোড শেয়ার করুন →
                  </Link>
                </div>
              )}
            </div>

            {/* Condition 2: Account Verification Payment */}
            <div className={cn(
              "rounded-2xl border p-4 transition-all",
              eligibility.is_verified
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-white"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl font-bold",
                    eligibility.is_verified
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-100 text-rose-700"
                  )}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">২. অ্যাকাউন্ট ভেরিফিকেশন ফি</h4>
                    <p className="text-xs text-slate-500">
                      এককালীন ফি: <span className="font-bold text-rose-600">৳{eligibility.verification_fee}</span>
                    </p>
                  </div>
                </div>

                <span className={cn(
                  "font-bold text-xs px-2.5 py-1 rounded-lg",
                  eligibility.is_verified
                    ? "bg-emerald-200/80 text-emerald-800"
                    : eligibility.verification_status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-rose-100 text-rose-800"
                )}>
                  {eligibility.is_verified
                    ? "ভেরিফাইড ✅"
                    : eligibility.verification_status === "pending"
                    ? "যাচাই চলমান ⏳"
                    : "অপরিশোধিত ❌"}
                </span>
              </div>

              {!eligibility.is_verified && (
                <div className="mt-3">
                  {eligibility.verification_status === "pending" ? (
                    <p className="text-[11px] text-amber-700 font-medium">
                      পেমেন্ট সাবমিট হয়েছে — অ্যাডমিন অনুমোদনের অপেক্ষা করছে।
                    </p>
                  ) : (
                    <Link
                      to="/checkout"
                      search={{ pkg: eligibility.verification_pkg_id }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
                    >
                      ভেরিফিকেশন ফি প্রদান করুন (৳{eligibility.verification_fee}) <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

` + formTarget;

content = content.replace(formTarget, eligibilityCard);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated withdraw.tsx successfully");

