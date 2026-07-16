// Server-only shared backup helpers used by cron endpoint and admin server fns.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive";
export const BACKUP_FOLDER_NAME = "TaskEarn-Auto-Backups";

export const TABLES_TO_BACKUP = [
  "profiles",
  "user_roles",
  "packages",
  "user_packages",
  "distributors",
  "distributor_applications",
  "distributor_leads",
  "distributor_tasks",
  "distributor_earnings",
  "distributor_withdrawals",
  "withdrawals",
  "link_tasks",
  "task_submissions",
  "referral_earnings",
  "user_payment_methods",
  "community_messages",
  "communities",
  "community_bans",
  "notices",
  "notice_dismissals",
  "activity_logs",
  "support_messages",
  "site_settings",
];

function driveKeys() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) {
    throw new Error("Google Drive connector is not configured");
  }
  return { lovableKey, driveKey };
}

async function driveFetch(path: string, init: RequestInit) {
  const { lovableKey, driveKey } = driveKeys();
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": driveKey,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Drive [${res.status}]: ${body}`);
  }
  return res;
}

export async function findOrCreateBackupFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await driveFetch(
    `/drive/v3/files?q=${q}&fields=files(id,name)`,
    { method: "GET" }
  );
  const searchData = (await searchRes.json()) as { files?: Array<{ id: string }> };
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

  const createRes = await driveFetch(`/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  return ((await createRes.json()) as { id: string }).id;
}

export async function uploadJsonToDrive(
  fileName: string,
  jsonContent: string,
  folderId: string
): Promise<{ id: string; name: string }> {
  const boundary = `-------lovable-backup-${Date.now()}`;
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json",
  };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    jsonContent +
    `\r\n--${boundary}--`;

  const res = await driveFetch(
    `/upload/drive/v3/files?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  return (await res.json()) as { id: string; name: string };
}

export type BackupFile = {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string | null;
};

export async function listBackupFiles(): Promise<BackupFile[]> {
  const folderId = await findOrCreateBackupFolder();
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await driveFetch(
    `/drive/v3/files?q=${q}&orderBy=createdTime desc&pageSize=1000&fields=files(id,name,createdTime,modifiedTime,size)`,
    { method: "GET" }
  );
  const data = (await res.json()) as { files?: BackupFile[] };
  return data.files ?? [];
}

export async function downloadBackupFile(fileId: string): Promise<string> {
  const res = await driveFetch(
    `/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { method: "GET" }
  );
  return await res.text();
}

export async function runFullBackup(): Promise<{
  file: { id: string; name: string };
  folder_id: string;
  size_bytes: number;
  row_counts: Record<string, number>;
  errors?: Record<string, string>;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const backup: Record<string, unknown> = {
    generated_at: new Date().toISOString(),
    project: "task-earn-system",
    tables: {},
  };
  const errors: Record<string, string> = {};
  const counts: Record<string, number> = {};
  const tablesData: Record<string, unknown[]> = {};

  const unique = Array.from(new Set(TABLES_TO_BACKUP));
  for (const table of unique) {
    try {
      const pageSize = 1000;
      const rows: unknown[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(table as never)
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      tablesData[table] = rows;
      counts[table] = rows.length;
    } catch (err) {
      errors[table] = err instanceof Error ? err.message : String(err);
    }
  }
  backup.tables = tablesData;
  backup.row_counts = counts;
  if (Object.keys(errors).length > 0) backup.errors = errors;

  const jsonContent = JSON.stringify(backup, null, 2);
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const dateStr = bd.toISOString().split("T")[0];
  const timeStr = bd.toISOString().split("T")[1].substring(0, 8).replace(/:/g, "-");
  const fileName = `backup-${dateStr}_${timeStr}-BD.json`;

  const folderId = await findOrCreateBackupFolder();
  const uploaded = await uploadJsonToDrive(fileName, jsonContent, folderId);

  return {
    file: uploaded,
    folder_id: folderId,
    size_bytes: jsonContent.length,
    row_counts: counts,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}
