import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `You are "Smart AI" — a friendly Bengali-first assistant for the Smart Investor platform (Bangladesh online earning by liking/commenting tasks).
- Reply in clear, simple Bengali (বাংলা) unless the user writes in English.
- Be concise, warm, and helpful.
- Help users understand: packages, earning, withdraw (bKash/Nagad/Rocket), referrals (5%), tasks, signup bonus (৳300 locked).
- Never reveal admin info, secrets, or other users' data.`;

async function callGemini(messages: Msg[], apiKey: string): Promise<string> {
  // Convert OpenAI-style messages → Gemini contents
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const reply = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  return reply || "দুঃখিত, উত্তর তৈরি করা যায়নি।";
}

async function callLovable(messages: Msg[], key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "smart-investor-direct" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: SYSTEM }, ...messages],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI সাময়িকভাবে ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
    throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "দুঃখিত, উত্তর তৈরি করা যায়নি।";
}

export const askSmartAI = createServerFn({ method: "POST" })
  .validator((data: { messages: Msg[] }) => {
    if (!Array.isArray(data?.messages)) throw new Error("messages required");
    const messages = data.messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: String(m.content ?? "").slice(0, 4000),
    })) as Msg[];
    return { messages };
  })
  .handler(async ({ data }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    const errors: string[] = [];

    if (geminiKey) {
      try {
        const reply = await callGemini(data.messages, geminiKey);
        return { reply };
      } catch (err) {
        errors.push(`Gemini: ${(err as Error).message}`);
        console.warn("Smart AI Gemini fallback:", (err as Error).message);
      }
    }
    if (lovableKey) {
      try {
        const reply = await callLovable(data.messages, lovableKey);
        return { reply };
      } catch (err) {
        errors.push(`Lovable: ${(err as Error).message}`);
        console.warn("Smart AI Gateway fallback:", (err as Error).message);
      }
    }
    return { reply: buildLocalSmartReply(data.messages, errors.length > 0) };
  });

type Method = "bkash" | "nagad" | "rocket";
type AcctType = "personal" | "merchant" | "payment";

const METHOD_BN: Record<Method, string> = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট" };

async function callLovableRaw(system: string, user: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    throw new Error(`AI ${res.status}: ${text.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function callGeminiRaw(system: string, user: string, key: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || "";
}

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
  .validator((d: { method: Method; type: AcctType; number: string; agent_number?: string; amount_note?: string }) => {
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

    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;

    if (geminiKey) {
      try {
        const out = await callGeminiRaw(system, user, geminiKey);
        if (out) return { instruction: out, source: "gemini" as const };
      } catch (e) { console.warn("gen instr gemini:", (e as Error).message); }
    }
    if (lovableKey) {
      try {
        const out = await callLovableRaw(system, user, lovableKey);
        if (out) return { instruction: out, source: "lovable" as const };
      } catch (e) { console.warn("gen instr lovable:", (e as Error).message); }
    }
    return { instruction: localInstruction(method, type, number, agent_number), source: "local" as const };
  });

function buildLocalSmartReply(messages: Msg[], degraded: boolean): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
  const note = degraded ? "\n\n(লাইভ AI সাময়িকভাবে ব্যস্ত, তাই Smart Investor quick assistant থেকে উত্তর দিচ্ছি।)" : "";

  if (/withdraw|উইথ|তুল|bkash|বিকাশ|nagad|নগদ|rocket|রকেট/.test(last)) {
    return `উইথড্র করতে User Panel → Withdraw এ যান, bKash/Nagad/Rocket নির্বাচন করুন, 01 দিয়ে শুরু ১১ সংখ্যার নম্বর দিন এবং সর্বনিম্ন ৳২০০ রিকোয়েস্ট করুন। সাধারণত অ্যাডমিন approval এর পর ব্যালেন্স পাঠানো হয়।${note}`;
  }
  if (/package|প্যাকেজ|roi|income|আয়|ইনকাম|লাভ/.test(last)) {
    return `প্যাকেজ কিনলে ৪৫ দিনের জন্য দৈনিক task ও earning limit সক্রিয় হয়। প্যাকেজ কার্ড থেকে বিস্তারিত দেখুন, তারপর Checkout এ manual payment করে Transaction ID জমা দিন—অ্যাডমিন approve করলে subscription active হবে।${note}`;
  }
  if (/task|টাস্ক|like|comment|লাইক|কমেন্ট/.test(last)) {
    return `Tasks পেজে প্রতিদিনের লাইক/কমেন্ট কাজগুলো দেখা যাবে। নির্দেশনা অনুযায়ী কাজ শেষ করে proof/submission দিন; approval হলে reward আপনার balance এ যোগ হবে।${note}`;
  }
  if (/ref|রেফার|commission|কমিশন/.test(last)) {
    return `আপনার referral link/share code দিয়ে নতুন user join করে প্যাকেজ active করলে আপনি package price-এর ৫% referral commission পাবেন।${note}`;
  }
  if (/bonus|বোনাস|৩০০|300/.test(last)) {
    return `নতুন account এ ৳৩০০ signup bonus locked balance হিসেবে থাকে। প্যাকেজ active ও platform rules complete হলে এটি ব্যবহারযোগ্য balance এ unlock করার সুযোগ থাকে।${note}`;
  }
  return `আমি Smart AI সহকারী। প্যাকেজ, টাস্ক, উইথড্র, রেফারেল বা বোনাস সম্পর্কে প্রশ্ন করুন—আমি বাংলায় সাহায্য করবো।${note}`;
}
