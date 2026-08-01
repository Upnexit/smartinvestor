import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertStaff(db: SupabaseClient<Database>, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

/** Admin manual trigger — cron যা রাতে করে, সেটাই এখনই চালায়। */
export const adminRunAutoTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { targetDate?: string }) => ({
    targetDate: typeof d?.targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.targetDate)
      ? d.targetDate : undefined,
  }))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { runAutoTaskGeneration } = await import("./auto-tasks.server");
    return await runAutoTaskGeneration({ targetDate: data.targetDate });
  });

/** Auto-task status + আজকের প্রস্তুতি */
export const adminAutoTaskStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { getAutoTaskStatus } = await import("./auto-tasks.server");
    return await getAutoTaskStatus();
  });

/** Deployment health — production/preview build ঠিকঠাক deploy হয়েছে কিনা যাচাই। */
export const adminDeploymentCheck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { checkDeployments } = await import("./deploy-check.server");
    return await checkDeployments();
  });
