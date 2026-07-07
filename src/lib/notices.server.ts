import type { NoticePriority, NoticeRow } from "./notices.functions";

export async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("forbidden");
}

function priorityLabel(priority: NoticePriority) {
  if (priority === "critical") return "🚨 জরুরি";
  if (priority === "warning") return "⚠️ সতর্কতা";
  return "ℹ️ নোটিশ";
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<boolean>) {
  const results: boolean[] = [];
  for (let i = 0; i < items.length; i += size) {
    results.push(...await Promise.all(items.slice(i, i + size).map(fn)));
    if (i + size < items.length) await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return results;
}

export async function sendNoticeToTelegramTargets(
  supabase: any,
  actorId: string,
  notice: NoticeRow,
): Promise<{ sent: number; failed: number; recipients: number }> {
  if (!notice.published) return { sent: 0, failed: 0, recipients: 0 };

  const targets = Array.isArray(notice.target_package_ids) ? notice.target_package_ids : [];
  const { data, error } = await supabase.rpc("telegram_notice_recipients", {
    _actor: actorId,
    _target_all_users: !!notice.target_all_users,
    _target_package_ids: targets,
  });

  if (error) {
    console.warn("[notice] telegram recipient lookup failed:", error.message);
    return { sent: 0, failed: 0, recipients: 0 };
  }

  const uniqueRecipients = new Map<string, number | string>();
  for (const row of (data ?? []) as Array<{ chat_id?: number | string | null }>) {
    if (row.chat_id != null) uniqueRecipients.set(String(row.chat_id), row.chat_id);
  }
  const recipients = [...uniqueRecipients.values()];
  if (recipients.length === 0) return { sent: 0, failed: 0, recipients: 0 };

  const { sendTelegramMessage } = await import("./telegram.server");
  const text = `${priorityLabel(notice.priority)} <b>${escapeTelegramHtml(notice.title)}</b>\n\n${escapeTelegramHtml(notice.body)}`;
  const results = await inBatches(recipients, 20, (chatId) =>
    sendTelegramMessage(chatId, text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "💰 ব্যালেন্স", callback_data: "balance" }, { text: "📦 প্যাকেজ", callback_data: "package" }],
          [{ text: "📊 স্ট্যাটাস", callback_data: "status" }],
        ],
      },
    }),
  );

  const sent = results.filter(Boolean).length;
  const failed = results.length - sent;
  if (failed > 0) console.warn(`[notice] telegram delivery: ${sent}/${recipients.length} sent, ${failed} failed`);
  return { sent, failed, recipients: recipients.length };
}

function parseImprovedNotice(out: string) {
  const lines = out.split("\n").map((line) => line.trim()).filter(Boolean);
  let title = "";
  let bodyStart = 0;
  if (lines[0] && /^শিরোনাম\s*[:：]/.test(lines[0])) {
    title = lines[0].replace(/^শিরোনাম\s*[:：]\s*/, "").trim();
    bodyStart = 1;
  }
  const body = lines.slice(bodyStart).join("\n").trim() || out.trim();
  return { title: title.slice(0, 200), body: body.slice(0, 4000) };
}

function localNoticeFormat(raw: string) {
  const clean = raw.replace(/\s+/g, " ").trim();
  const title = clean.split(/[।.!?\n]/)[0]?.slice(0, 80).trim() || "গুরুত্বপূর্ণ নোটিশ";
  return { title: title || "গুরুত্বপূর্ণ নোটিশ", body: raw.trim().slice(0, 4000) };
}

export async function improveNoticeTextWithAI(raw: string, priority: NoticePriority) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!lovableKey) return localNoticeFormat(raw);

  const { getBusinessContext } = await import("./ai-context.server");
  const ctx = await getBusinessContext();
  const system = `You rewrite raw Bengali speech-to-text notes into short, professional Bangla notices for the Smart Investor platform.

STRICT OUTPUT:
Line 1: শিরোনাম: <short 4-8 word title in Bengali>
Line 2 onwards: notice body — 2-6 short, clear Bangla sentences or bullets (use "•").
No preface, no code fences, no markdown headings, no English unless a brand name.
Tone: ${priority === "critical" ? "জরুরি ও সরাসরি" : priority === "warning" ? "সতর্কতামূলক ও নম্র" : "বন্ধুত্বপূর্ণ ও তথ্যবহুল"}.

${ctx}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": lovableKey,
      "X-Lovable-AIG-SDK": "smart-investor-notices",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Raw voice/text note from admin:\n"""${raw}"""\n\nএটিকে উপরের format-এ পরিষ্কার Bangla notice হিসেবে rewrite করুন। বানান, বিরাম, বাক্যগঠন সব ঠিক করুন। অতিরিক্ত তথ্য বানাবেন না।` },
      ],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    return localNoticeFormat(raw);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const out = json.choices?.[0]?.message?.content?.trim();
  return out ? parseImprovedNotice(out) : localNoticeFormat(raw);
}