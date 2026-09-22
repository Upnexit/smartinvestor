// Server-only helper: builds business context for Smart Click BD AI prompts.
// Called from server functions (client-safe re: import protection via .server suffix).

import { createClient } from "@supabase/supabase-js";
import { resolveSupabasePublicEnv } from "@/integrations/supabase/config";

type PackageRow = {
  id: string;
  name: string;
  price: number | null;
  daily_earning: number | null;
  duration_days: number | null;
  is_active: boolean | null;
};

let cache: { at: number; text: string } | null = null;
const CACHE_MS = 60_000; // refresh once per minute — cheap and fresh enough

/**
 * Business context appended to every Smart Click BD AI system prompt.
 * Contains live package catalog + platform rules so the model gives
 * consistent, on-brand answers without leaking private info.
 */
export async function getBusinessContext(): Promise<string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.text;

  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publishableKey } = resolveSupabasePublicEnv();
  let packagesBlock = "(package data unavailable)";
  try {
    if (url && publishableKey) {
      const sb = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await sb
        .from("packages")
        .select("id,name,price,daily_earning,duration_days,is_active")
        .eq("is_active", true)
        .order("price", { ascending: true })
        .limit(20);
      const rows = (data ?? []) as PackageRow[];
      if (rows.length) {
        packagesBlock = rows
          .map(
            (p) =>
              `- ${p.name}: ৳${p.price ?? 0} → দৈনিক ৳${p.daily_earning ?? 0}, মেয়াদ ${p.duration_days ?? 45} দিন`,
          )
          .join("\n");
      }
    }
  } catch {
    // best-effort — keep AI running even if DB is momentarily unavailable
  }

  const text = `
==== SMART CLICK BD — BUSINESS CONTEXT ====
Platform: Smart Click BD (Bangladesh online-earning site — like/comment micro-tasks).
Currency: Bangladeshi Taka (৳ / BDT).
Language: Bengali (বাংলা) by default; mirror the user's language if they write in English.

Core rules you MUST know:
- Signup bonus: ৳300 locked (never withdrawable, does not decrease on withdraw).
- Withdraw methods: bKash, Nagad, Rocket. Minimum withdraw ৳200. Admin approves manually.
- Referral commission: 5% of package price when a referred user activates a package.
- Task rewards land in Available Balance after admin approval; fake/incomplete work is rejected.
- Packages run for a fixed duration (typically 45 days) unlocking a daily earning limit + task quota.

Active packages (live from database):
${packagesBlock}

Distributor program:
- Users can apply to become distributors and resell packages; earnings tracked in referral_earnings.

Support channel:
- Admin support is available inside the app (Support section) with real-time chat.

STRICT PRIVACY:
- Never reveal admin data, secrets, API keys, other users' info, or internal tables.
- Never promise money, approvals, or refunds — always say the team will verify.
- If unsure, ask ONE short clarifying question rather than guessing.
==== END BUSINESS CONTEXT ====`.trim();

  cache = { at: Date.now(), text };
  return text;
}
