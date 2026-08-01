/**
 * Auto Task Engine
 * ----------------
 * প্রতিদিন রাত ২টা (Asia/Dhaka) — যে সব package-এ active user আছে,
 * সেই প্রতিটি package-এর জন্য ওই দিনের task automatic তৈরি + active হয়ে যায়।
 *
 * Action type শুধুমাত্র: like এবং follow.
 */

import { bdDateString } from "./bd-time";
import { generateFbLinkTaskBatch } from "./admin-tasks.server";

export const AUTO_TASK_ACTIONS = ["like", "follow"] as const;
export const DEFAULT_DAILY_TASKS = 10;
const LAST_RUN_KEY = "auto_task_last_run";

export type AutoTaskPackageResult = {
  package_id: string;
  package_name: string;
  active_users: number;
  quota: number;
  existing: number;
  created: number;
  reward_each: number;
  skipped?: string;
};

export type AutoTaskRunResult = {
  date: string;
  packages: AutoTaskPackageResult[];
  total_created: number;
  ran_at: string;
};

/**
 * @param targetDate YYYY-MM-DD (BD). Default: আজকের BD তারিখ।
 * @param force  true হলে quota পূরণ থাকলেও বাকি slot গুলো ভরার চেষ্টা করে (same behaviour, শুধু log)।
 */
export async function runAutoTaskGeneration(opts?: {
  targetDate?: string;
  force?: boolean;
}): Promise<AutoTaskRunResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const date = opts?.targetDate || bdDateString();
  const nowIso = new Date().toISOString();

  // 1) কোন কোন package-এ এখনো active user আছে
  const { data: ups, error: upErr } = await supabaseAdmin
    .from("user_packages")
    .select("package_id, expires_at, status")
    .eq("status", "active");
  if (upErr) throw new Error(upErr.message);

  const activeCount = new Map<string, number>();
  for (const r of (ups ?? []) as { package_id: string; expires_at: string | null }[]) {
    if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) continue;
    activeCount.set(r.package_id, (activeCount.get(r.package_id) ?? 0) + 1);
  }
  const pkgIds = Array.from(activeCount.keys());

  const results: AutoTaskPackageResult[] = [];
  if (pkgIds.length === 0) {
    await saveLastRun(supabaseAdmin, { date, packages: results, total_created: 0, ran_at: nowIso });
    return { date, packages: results, total_created: 0, ran_at: nowIso };
  }

  const { data: pkgs, error: pkgErr } = await supabaseAdmin
    .from("packages")
    .select("id,name,daily_tasks,daily_income")
    .in("id", pkgIds);
  if (pkgErr) throw new Error(pkgErr.message);

  for (const pkg of (pkgs ?? []) as {
    id: string; name: string; daily_tasks: number | null; daily_income: number | null;
  }[]) {
    const quota = Math.max(1, Math.min(50, Number(pkg.daily_tasks) || DEFAULT_DAILY_TASKS));
    const rewardEach = Math.round(((Number(pkg.daily_income) || 0) / quota) * 100) / 100;

    // ওই দিনের ইতিমধ্যে থাকা task
    const { data: existingToday } = await supabaseAdmin
      .from("link_tasks")
      .select("id")
      .eq("required_package_id", pkg.id)
      .eq("scheduled_date", date)
      .eq("is_draft", false);
    const existing = existingToday?.length ?? 0;
    const need = quota - existing;

    if (need <= 0) {
      results.push({
        package_id: pkg.id, package_name: pkg.name, active_users: activeCount.get(pkg.id) ?? 0,
        quota, existing, created: 0, reward_each: rewardEach, skipped: "already-complete",
      });
      continue;
    }

    // duplicate এড়াতে আগের সব URL সংগ্রহ
    const { data: prev } = await supabaseAdmin
      .from("link_tasks")
      .select("link_url")
      .eq("required_package_id", pkg.id)
      .limit(2000);
    const existingUrls = ((prev ?? []) as { link_url: string }[]).map((r) => r.link_url).filter(Boolean);

    const gen = await generateFbLinkTaskBatch({
      count: need,
      actions: [...AUTO_TASK_ACTIONS],
      existingUrls,
    });

    const rows = gen.tasks.slice(0, need).map((g) => ({
      title: g.title,
      link_url: g.url,
      reward: rewardEach || 1,
      action_type: g.action_type,
      category: "facebook",
      daily_limit: 1,
      active: true,
      is_draft: false,
      scheduled_date: date,
      required_package_id: pkg.id,
      description: g.description,
    }));

    let created = 0;
    if (rows.length) {
      const { error: insErr, data: ins } = await supabaseAdmin
        .from("link_tasks")
        .insert(rows)
        .select("id");
      if (insErr) {
        results.push({
          package_id: pkg.id, package_name: pkg.name, active_users: activeCount.get(pkg.id) ?? 0,
          quota, existing, created: 0, reward_each: rewardEach, skipped: insErr.message,
        });
        continue;
      }
      created = ins?.length ?? rows.length;
    }

    results.push({
      package_id: pkg.id, package_name: pkg.name, active_users: activeCount.get(pkg.id) ?? 0,
      quota, existing, created, reward_each: rewardEach,
    });
  }

  const total = results.reduce((s, r) => s + r.created, 0);
  const payload = { date, packages: results, total_created: total, ran_at: nowIso };
  await saveLastRun(supabaseAdmin, payload);
  return payload;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function saveLastRun(db: any, payload: AutoTaskRunResult) {
  try {
    await db.from("site_settings").upsert(
      { key: LAST_RUN_KEY, value: payload as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  } catch { /* logging only */ }
}

export async function getAutoTaskStatus(): Promise<{
  last_run: AutoTaskRunResult | null;
  today: string;
  today_ready: { package_id: string; package_name: string; quota: number; active_tasks: number }[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = bdDateString();

  const { data: setting } = await supabaseAdmin
    .from("site_settings").select("value").eq("key", LAST_RUN_KEY).maybeSingle();

  const { data: ups } = await supabaseAdmin
    .from("user_packages").select("package_id, expires_at").eq("status", "active");
  const ids = Array.from(new Set(((ups ?? []) as { package_id: string; expires_at: string | null }[])
    .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() >= Date.now())
    .map((r) => r.package_id)));

  const today_ready: { package_id: string; package_name: string; quota: number; active_tasks: number }[] = [];
  if (ids.length) {
    const { data: pkgs } = await supabaseAdmin
      .from("packages").select("id,name,daily_tasks").in("id", ids);
    const { data: tasks } = await supabaseAdmin
      .from("link_tasks").select("required_package_id")
      .eq("scheduled_date", today).eq("is_draft", false).eq("active", true);
    const counts = new Map<string, number>();
    for (const t of (tasks ?? []) as { required_package_id: string | null }[]) {
      if (!t.required_package_id) continue;
      counts.set(t.required_package_id, (counts.get(t.required_package_id) ?? 0) + 1);
    }
    for (const p of (pkgs ?? []) as { id: string; name: string; daily_tasks: number | null }[]) {
      today_ready.push({
        package_id: p.id,
        package_name: p.name,
        quota: Number(p.daily_tasks) || DEFAULT_DAILY_TASKS,
        active_tasks: counts.get(p.id) ?? 0,
      });
    }
  }

  return {
    last_run: (setting?.value as unknown as AutoTaskRunResult) ?? null,
    today,
    today_ready,
  };
}
