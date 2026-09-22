import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_BASE = `You are "Smart AI" — a friendly Bengali-first assistant for the Smart Click BD platform.
- Reply in clear, simple Bengali (বাংলা) unless the user writes in English.
- Be concise, warm, and helpful.
- Answer strictly from the BUSINESS CONTEXT below. Do not invent packages, prices, or rules.
- Never reveal admin info, secrets, API keys, or other users' data.`;

async function callLovable(system: string, messages: Msg[], key: string, opts?: { temperature?: number; maxTokens?: number }): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, ...messages],
      ...(opts?.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts?.maxTokens != null ? { max_tokens: opts.maxTokens } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI সাময়িকভাবে ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
    throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

export const askSmartAI = createServerFn({ method: "POST" })
  .inputValidator((data: { messages: Msg[] }) => {
    if (!Array.isArray(data?.messages)) throw new Error("messages required");
    const messages = data.messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    })) as Msg[];
    return { messages };
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) {
      return { reply: buildLocalSmartReply(data.messages, true) };
    }
    try {
      const { getBusinessContext } = await import("./ai-context.server");
      const ctx = await getBusinessContext();
      const reply = await callLovable(`${SYSTEM_BASE}\n\n${ctx}`, data.messages, lovableKey);
      return { reply: reply || buildLocalSmartReply(data.messages, false) };
    } catch (err) {
      console.warn("Smart AI Lovable error:", (err as Error).message);
      return { reply: buildLocalSmartReply(data.messages, true) };
    }
  });

type Method = "bkash" | "nagad" | "rocket";
type AcctType = "personal" | "merchant" | "payment";

const METHOD_BN: Record<Method, string> = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট" };
const TYPE_LABEL: Record<AcctType, string> = { personal: "Personal", merchant: "Merchant", payment: "Payment" };
const TYPE_BN: Record<AcctType, string> = { personal: "পার্সোনাল", merchant: "মার্চেন্ট", payment: "পেমেন্ট" };
const APP_ACTION: Record<AcctType, string> = { personal: "Send Money", merchant: "Merchant / Payment", payment: "Payment" };

function localInstruction(method: Method, type: AcctType, number: string, agent?: string): string {
  const m = METHOD_BN[method];
  const target = `${m} ${TYPE_BN[type]} নম্বর`;
  const num = number?.trim() || "—";
  const lines = [
    `প্রিয় গ্রাহক, নিচের ${target}-এ পেমেন্ট সম্পন্ন করুন:`,
    `• ${target}: ${num}`,
    agent?.trim() ? `• এজেন্ট/রেফারেন্স নম্বর: ${agent.trim()}` : null,
    `• ${m} অ্যাপ খুলুন → "${APP_ACTION[type]}" অপশন সিলেক্ট করুন → উপরের নম্বরটি দিন → প্যাকেজের সঠিক পরিমাণ টাকা পাঠান।`,
    `• পেমেন্ট শেষে প্রাপ্ত TrxID এবং যেই নম্বর থেকে পাঠিয়েছেন সেটি ফর্মে সঠিকভাবে দিন।`,
    `• ভুল/কম টাকা পাঠালে অর্ডার রিজেক্ট হবে — অনুগ্রহ করে সাবধানে যাচাই করুন।`,
  ].filter(Boolean);
  return lines.join("\n");
}

export const generatePaymentInstruction = createServerFn({ method: "POST" })
  .inputValidator((d: { method: Method; type: AcctType; number: string; agent_number?: string; amount_note?: string }) => {
    if (!d?.method || !["bkash", "nagad", "rocket"].includes(d.method)) throw new Error("method invalid");
    if (!d?.type || !["personal", "merchant", "payment"].includes(d.type)) throw new Error("type invalid");
    return {
      method: d.method,
      type: d.type,
      number: String(d.number ?? "").slice(0, 32),
      agent_number: d.agent_number ? String(d.agent_number).slice(0, 32) : "",
      amount_note: d.amount_note ? String(d.amount_note).slice(0, 200) : "",
    };
  })
  .handler(async ({ data }) => {
    const { method, type, number, agent_number, amount_note } = data;
    const mBn = METHOD_BN[method];
    const system = `You write short, clear Bengali payment instructions for a Bangladesh online-earning platform. Respond ONLY with the instruction text (5-7 short lines, use bullet dots "•"). No preface, no markdown headings.`;
    const user = `Payment gateway: ${mBn} (${method})
Account type: ${TYPE_LABEL[type]}
Primary number: ${number || "N/A"}
${agent_number ? `Agent/reference number: ${agent_number}` : ""}
${amount_note ? `Extra note: ${amount_note}` : ""}

Write clear Bengali instructions telling the user how to send money to this ${mBn} ${TYPE_LABEL[type]} account, what to do in the app (use "${APP_ACTION[type]}" option), and to submit the TrxID and sender number correctly. Warn about wrong amount = rejection.`;

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey) {
      try {
        const out = await callLovable(system, [{ role: "user", content: user }], lovableKey, { temperature: 0.6, maxTokens: 512 });
        if (out) return { instruction: out, source: "lovable" as const };
      } catch (e) { console.warn("gen instr lovable:", (e as Error).message); }
    }
    return { instruction: localInstruction(method, type, number, agent_number), source: "local" as const };
  });

export const generateTaskDescription = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; category?: string; action_type?: string; hint?: string; url?: string }) => ({
    title: String(d?.title ?? "").slice(0, 200),
    category: String(d?.category ?? "").slice(0, 40),
    action_type: String(d?.action_type ?? "").slice(0, 20),
    hint: String(d?.hint ?? "").slice(0, 500),
    url: String(d?.url ?? "").slice(0, 400),
  }))
  .handler(async ({ data }) => {
    const { title, category, action_type, hint, url } = data;
    const system = `You write clear, step-by-step Bengali instructions for micro-tasks on a Bangladesh online-earning platform.

STRICT RULES:
- Read the task title carefully and infer EXACTLY which action(s) the user must perform. Only include those actions.
- If the title says "like" → instruct only to Like (and Follow only if the title mentions follow/page).
- If the title says "comment" → instruct only to write a comment.
- If the title says "share" → instruct only to share.
- If the title says "subscribe" → instruct only to subscribe.
- DO NOT invent extra steps that are not implied by the title or hint.
- Respond ONLY with the instruction body: 4-7 short bullet lines starting with "•".
- Simple বাংলা, friendly tone. No preface, no headings, no markdown, no code fences.
- End with one short warning line that fake/incomplete work will be rejected.`;
    const user = `Task title: ${title}
Platform: ${category || "N/A"}
Action type hint: ${action_type || "N/A"}
Task URL: ${url || "N/A"}
Admin's extra hint: ${hint || "(none)"}

Based STRICTLY on the title, write concise Bengali step-by-step instructions. Only cover the action(s) the title explicitly asks for — nothing more.`;

    const lovableKey = process.env.LOVABLE_API_KEY;
    if (lovableKey) {
      try {
        const out = await callLovable(system, [{ role: "user", content: user }], lovableKey, { temperature: 0.6, maxTokens: 512 });
        if (out) return { description: out, source: "lovable" as const };
      } catch (e) { console.warn("gen task lovable:", (e as Error).message); }
    }
    const lines = [
      `• উপরের লিংকে ক্লিক করে ${category || "প্ল্যাটফর্ম"}-এ প্রবেশ করুন।`,
      `• প্রয়োজন হলে নিজের অ্যাকাউন্টে লগইন করুন।`,
      action_type === "comment" ? `• পোস্টে একটি অর্থপূর্ণ কমেন্ট করুন (স্প্যাম নয়)।`
        : action_type === "share" ? `• পোস্টটি নিজের প্রোফাইলে/টাইমলাইনে শেয়ার করুন।`
        : action_type === "view" ? `• সম্পূর্ণ ভিডিও/পোস্টটি শেষ পর্যন্ত দেখুন।`
        : `• পোস্টে Like/Follow বাটনে ক্লিক করুন।`,
      hint ? `• অতিরিক্ত নির্দেশনা: ${hint}` : `• কাজ শেষে অ্যাপে ফিরে আসুন।`,
      `• কাজের একটি স্ক্রিনশট প্রমাণস্বরূপ সংরক্ষণ করুন।`,
      `• "Submit" বাটনে ক্লিক করে টাস্কটি জমা দিন।`,
      `• ভুয়া/অসম্পূর্ণ কাজ রিজেক্ট হবে — সাবধানে সম্পন্ন করুন।`,
    ];
    return { description: lines.join("\n"), source: "local" as const };
  });

function buildLocalSmartReply(messages: Msg[], degraded: boolean): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
  const note = degraded ? "\n\n(লাইভ AI সাময়িকভাবে ব্যস্ত, তাই Smart Click BD quick assistant থেকে উত্তর দিচ্ছি।)" : "";

  if (/withdraw|উইথ|তুল|bkash|বিকাশ|nagad|নগদ|rocket|রকেট/.test(last)) {
    return `উইথড্র করতে User Panel → Withdraw এ যান, bKash/Nagad/Rocket নির্বাচন করুন, 01 দিয়ে শুরু ১১ সংখ্যার নম্বর দিন এবং সর্বনিম্ন ৳২০০ রিকোয়েস্ট করুন।${note}`;
  }
  if (/package|প্যাকেজ|roi|income|আয়|ইনকাম|লাভ/.test(last)) {
    return `প্যাকেজ কিনলে ৬০ দিনের জন্য দৈনিক task ও earning limit সক্রিয় হয়। Checkout এ manual payment করে TrxID জমা দিন — অ্যাডমিন approve করলে subscription active হবে।${note}`;
  }
  if (/task|টাস্ক|like|comment|লাইক|কমেন্ট/.test(last)) {
    return `Tasks পেজে দৈনিক লাইক/কমেন্ট কাজগুলো দেখা যাবে। নির্দেশনা মতে proof দিন; approval হলে reward balance এ যোগ হবে।${note}`;
  }
  if (/ref|রেফার|commission|কমিশন/.test(last)) {
    return `আপনার referral link দিয়ে নতুন user প্যাকেজ active করলে আপনি package price-এর ৫% commission পাবেন।${note}`;
  }
  if (/bonus|বোনাস|৩০০|300/.test(last)) {
    return `নতুন account এ ৳৩০০ signup bonus locked balance হিসেবে থাকে — এটি withdraw এর সময় কাটা হয় না।${note}`;
  }
  return `আমি Smart AI সহকারী। প্যাকেজ, টাস্ক, উইথড্র, রেফারেল বা বোনাস সম্পর্কে প্রশ্ন করুন।${note}`;
}
