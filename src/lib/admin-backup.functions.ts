import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertAdmin(db: SupabaseClient<Database>, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

export const adminTriggerBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { runFullBackup } = await import("./backup.server");
    return await runFullBackup();
  });

export const adminListBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { listBackupFiles } = await import("./backup.server");
    return { files: await listBackupFiles() };
  });

export const adminDownloadBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileId: string }) => {
    if (!d?.fileId || typeof d.fileId !== "string") throw new Error("invalid fileId");
    return { fileId: d.fileId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { downloadBackupFile } = await import("./backup.server");
    const content = await downloadBackupFile(data.fileId);
    return { content };
  });

export const adminRestoreBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { content: string; mode?: "merge" | "replace"; onlyTables?: string[] }) => {
    if (!d?.content || typeof d.content !== "string") throw new Error("invalid content");
    if (d.content.length > 200 * 1024 * 1024) throw new Error("file too large (>200MB)");
    const mode: "merge" | "replace" = d.mode === "replace" ? "replace" : "merge";
    return { content: d.content, mode, onlyTables: d.onlyTables };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { restoreFromBackup } = await import("./backup.server");
    return await restoreFromBackup(data.content, data.mode, data.onlyTables);
  });

export const adminRestoreFromDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileId: string; mode?: "merge" | "replace" }) => {
    if (!d?.fileId || typeof d.fileId !== "string") throw new Error("invalid fileId");
    const mode: "merge" | "replace" = d.mode === "replace" ? "replace" : "merge";
    return { fileId: d.fileId, mode };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { downloadBackupFile, restoreFromBackup } = await import("./backup.server");
    const content = await downloadBackupFile(data.fileId);
    return await restoreFromBackup(content, data.mode);
  });
