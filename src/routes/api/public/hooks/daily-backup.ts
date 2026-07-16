import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive";
const BACKUP_FOLDER_NAME = "TaskEarn-Auto-Backups";

// সব গুরুত্বপূর্ণ tables যা backup হবে
const TABLES_TO_BACKUP = [
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
  "user_payment_methods",
];

async function driveFetch(
  path: string,
  init: RequestInit,
  lovableKey: string,
  driveKey: string
) {
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
    throw new Error(`Google Drive API failed [${res.status}]: ${body}`);
  }
  return res;
}

async function findOrCreateBackupFolder(
  lovableKey: string,
  driveKey: string
): Promise<string> {
  // drive.file scope এর জন্য app-created files/folders দেখা যাবে
  const searchQuery = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await driveFetch(
    `/drive/v3/files?q=${searchQuery}&fields=files(id,name)`,
    { method: "GET" },
    lovableKey,
    driveKey
  );
  const searchData = (await searchRes.json()) as { files?: Array<{ id: string }> };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder create
  const createRes = await driveFetch(
    `/drive/v3/files?fields=id`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    },
    lovableKey,
    driveKey
  );
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function uploadJsonToDrive(
  fileName: string,
  jsonContent: string,
  folderId: string,
  lovableKey: string,
  driveKey: string
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

  const uploadRes = await driveFetch(
    `/upload/drive/v3/files?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
    lovableKey,
    driveKey
  );
  return (await uploadRes.json()) as { id: string; name: string };
}

export const Route = createFileRoute("/api/public/hooks/daily-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.BACKUP_CRON_SECRET;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const driveKey = process.env.GOOGLE_DRIVE_API_KEY;

        // Security: shared secret check
        const authHeader = request.headers.get("x-backup-secret");
        if (!cronSecret || authHeader !== cronSecret) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!lovableKey || !driveKey) {
          return new Response(
            JSON.stringify({
              error: "Google Drive connector is not configured",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const backup: Record<string, unknown> = {
            generated_at: new Date().toISOString(),
            project: "task-earn-system",
            tables: {},
          };
          const errors: Record<string, string> = {};
          const counts: Record<string, number> = {};

          const uniqueTables = Array.from(new Set(TABLES_TO_BACKUP));
          for (const table of uniqueTables) {
            try {
              // Supabase default 1000 row limit — pagination
              const pageSize = 1000;
              const allRows: unknown[] = [];
              let from = 0;
              while (true) {
                const { data, error } = await supabaseAdmin
                  .from(table as never)
                  .select("*")
                  .range(from, from + pageSize - 1);
                if (error) throw new Error(error.message);
                if (!data || data.length === 0) break;
                allRows.push(...data);
                if (data.length < pageSize) break;
                from += pageSize;
              }
              (backup.tables as Record<string, unknown>)[table] = allRows;
              counts[table] = allRows.length;
            } catch (err) {
              errors[table] =
                err instanceof Error ? err.message : String(err);
            }
          }
          backup.row_counts = counts;
          if (Object.keys(errors).length > 0) backup.errors = errors;

          const jsonContent = JSON.stringify(backup, null, 2);
          const now = new Date();
          const bdDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          const dateStr = bdDate.toISOString().split("T")[0];
          const timeStr = bdDate
            .toISOString()
            .split("T")[1]
            .substring(0, 8)
            .replace(/:/g, "-");
          const fileName = `backup-${dateStr}_${timeStr}-BD.json`;

          const folderId = await findOrCreateBackupFolder(
            lovableKey,
            driveKey
          );
          const uploaded = await uploadJsonToDrive(
            fileName,
            jsonContent,
            folderId,
            lovableKey,
            driveKey
          );

          return new Response(
            JSON.stringify({
              success: true,
              file: uploaded,
              folder_id: folderId,
              size_bytes: jsonContent.length,
              tables_backed_up: Object.keys(counts).length,
              row_counts: counts,
              errors: Object.keys(errors).length > 0 ? errors : undefined,
              timestamp: now.toISOString(),
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("Daily backup failed:", message);
          return new Response(
            JSON.stringify({ success: false, error: message }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
