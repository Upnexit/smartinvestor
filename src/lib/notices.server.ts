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

  const pkgTargets = Array.isArray(notice.target_package_ids) ? notice.target_package_ids : [];
  const userTargets = Array.isArray(notice.target_user_ids) ? notice.target_user_ids : [];
  const { data, error } = await supabase.rpc("telegram_notice_recipients", {
    _actor: actorId,
    _target_all_users: !!notice.target_all_users,
    _target_package_ids: pkgTargets,
    _target_user_ids: userTargets,
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

function envValue(name: string): string {
  try {
    return process.env?.[name] ?? "";
  } catch {
    return "";
  }
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

const NOTICE_MODELS = [
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
  "openai/gpt-5.4-mini",
];

export async function improveNoticeTextWithAI(raw: string, priority: NoticePriority) {
  const lovableKey = envValue("LOVABLE_API_KEY");
  if (!lovableKey) {
    console.warn("[notice-ai] LOVABLE_API_KEY missing — falling back to local format");
    return localNoticeFormat(raw);
  }

  let ctx = "";
  try {
    const { getBusinessContext } = await import("./ai-context.server");
    ctx = await getBusinessContext();
  } catch (e) {
    console.warn("[notice-ai] business context load failed:", (e as Error).message);
  }

  const toneLine =
    priority === "critical"
      ? "জরুরি, সরাসরি ও দৃঢ় — কোনো ভূমিকা নয়, সরাসরি সমস্যা/পদক্ষেপ বলুন।"
      : priority === "warning"
      ? "সতর্কতামূলক, নম্র কিন্তু স্পষ্ট — সম্ভাব্য ঝুঁকি ও করণীয় জানান।"
      : "পেশাদার, বন্ধুত্বপূর্ণ ও তথ্যবহুল — গ্রাহককে গুরুত্বপূর্ণ তথ্য জানান।";

  const system = `আপনি Smart Investor প্ল্যাটফর্মের সিনিয়র কমিউনিকেশন এডিটর। Admin-এর কাঁচা bangla voice/text note-কে একটি পেশাদার (professional), সুস্পষ্ট Bangla notice-এ পরিণত করুন — যেন এটি সরাসরি হাজার হাজার user-এর কাছে যাবে।

কঠোর OUTPUT ফরম্যাট (ঠিক এই format ছাড়া কিছু না):
Line 1: শিরোনাম: <৪-৮ শব্দের সংক্ষিপ্ত, শক্তিশালী বাংলা শিরোনাম>
Line 2: (ফাঁকা)
Line 3+: notice body — ২-৬ লাইন। প্রয়োজনে "•" bullet ব্যবহার করুন। প্রতিটি লাইন ছোট, স্পষ্ট, ভুল বানান/বিরাম ছাড়া।

নিয়ম:
- শুধু বাংলায় লিখুন (ব্র্যান্ড নাম যেমন bKash, Nagad, Telegram ইংরেজিতে থাকতে পারে)।
- কোনো preface, markdown heading, code fence, quote, বা "এখানে notice দিলাম" জাতীয় কথা নয়।
- কল্পনা করে নতুন তথ্য, টাকার পরিমাণ, তারিখ, বা নিয়ম যোগ করবেন না — শুধু admin যা বলেছেন সেটাই পরিষ্কার করুন।
- বানান, বিরামচিহ্ন, বাক্যগঠন ঠিক করুন। ইমোজি সর্বোচ্চ ১টি এবং শুধু শিরোনামে গ্রহণযোগ্য।
- Tone: ${toneLine}
- Body-তে শেষে করণীয় (call-to-action) বা যোগাযোগের নির্দেশ থাকলে ভালো।

${ctx ? `\nপ্ল্যাটফর্ম প্রসঙ্গ (তথ্যের সাথে সামঞ্জস্য রাখুন, তবে নতুন কিছু বানাবেন না):\n${ctx}` : ""}`;

  const userMsg = `Admin-এর কাঁচা note:\n"""${raw}"""\n\nউপরের কঠোর format অনুসরণ করে এটিকে পেশাদার Bangla notice-এ rewrite করুন।`;

  let lastErr = "";
  for (const model of NOTICE_MODELS) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          max_tokens: 700,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userMsg },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastErr = `${model} → ${res.status}: ${text.slice(0, 200)}`;
        console.warn("[notice-ai]", lastErr);
        if (res.status === 429) throw new Error("AI সাময়িকভাবে ব্যস্ত — কিছুক্ষণ পরে আবার চেষ্টা করুন");
        if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
        // 400/404/5xx → next model
        continue;
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const out = json.choices?.[0]?.message?.content?.trim();
      if (out) return parseImprovedNotice(out);
      lastErr = `${model} → empty response`;
      console.warn("[notice-ai]", lastErr);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("ব্যস্ত") || msg.includes("ক্রেডিট")) throw e;
      lastErr = `${model} → ${msg}`;
      console.warn("[notice-ai] fetch error:", lastErr);
    }
  }

  console.warn("[notice-ai] all models failed, falling back. lastErr=", lastErr);
  return localNoticeFormat(raw);
}