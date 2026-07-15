import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { NoticeRow } from "./notices.functions";

type SubRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function priorityEmoji(p: string) {
  if (p === "critical") return "🚨 ";
  if (p === "warning") return "⚠️ ";
  return "🔔 ";
}

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@smartinvestor.app";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

async function collectRecipientUserIds(supabase: any, notice: NoticeRow): Promise<Set<string>> {
  const ids = new Set<string>();
  if (notice.target_all_users) {
    const { data } = await supabase.from("push_subscriptions").select("user_id");
    for (const r of (data ?? []) as { user_id: string }[]) ids.add(r.user_id);
    return ids;
  }
  for (const u of notice.target_user_ids ?? []) ids.add(u);
  if ((notice.target_package_ids ?? []).length > 0) {
    const { data } = await supabase
      .from("user_packages")
      .select("user_id, package_id, status")
      .in("package_id", notice.target_package_ids)
      .eq("status", "active");
    for (const r of (data ?? []) as { user_id: string }[]) ids.add(r.user_id);
  }
  return ids;
}

export async function sendWebPushToNoticeTargets(
  supabase: any,
  notice: NoticeRow,
): Promise<{ sent: number; failed: number; recipients: number }> {
  if (!notice.published) return { sent: 0, failed: 0, recipients: 0 };
  const keys = vapid();
  if (!keys) {
    console.warn("[push] VAPID keys missing — skipping web push");
    return { sent: 0, failed: 0, recipients: 0 };
  }

  const userIds = await collectRecipientUserIds(supabase, notice);
  if (userIds.size === 0) return { sent: 0, failed: 0, recipients: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", Array.from(userIds));

  const list = (subs ?? []) as SubRow[];
  if (list.length === 0) return { sent: 0, failed: 0, recipients: 0 };

  const body = notice.body.length > 300 ? notice.body.slice(0, 297) + "…" : notice.body;
  const payload = {
    title: `${priorityEmoji(notice.priority)}${notice.title}`,
    body,
    url: "/dashboard",
    tag: `notice-${notice.id}`,
    priority: notice.priority,
  };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.allSettled(
    list.map(async (s) => {
      try {
        const req = await buildPushPayload(
          { data: JSON.stringify(payload), options: { ttl: 60 * 60 * 24, urgency: notice.priority === "critical" ? "high" : "normal" } },
          { endpoint: s.endpoint, expirationTime: null, keys: { p256dh: s.p256dh, auth: s.auth } },
          keys,
        );
        const res = await fetch(s.endpoint, req);
        if (res.ok || res.status === 201 || res.status === 202) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          staleIds.push(s.id);
          failed++;
        } else {
          failed++;
          console.warn(`[push] endpoint ${res.status}:`, s.endpoint.slice(0, 60));
        }
      } catch (err) {
        failed++;
        console.warn("[push] send error:", (err as Error).message);
      }
    }),
  );

  if (staleIds.length > 0) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    } catch (err) {
      console.warn("[push] cleanup failed:", (err as Error).message);
    }
  }

  return { sent, failed, recipients: list.length };
}
