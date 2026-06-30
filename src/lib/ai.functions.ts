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
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
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
  .inputValidator((data: { messages: Msg[] }) => {
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
      }
    }
    if (lovableKey) {
      try {
        const reply = await callLovable(data.messages, lovableKey);
        return { reply };
      } catch (err) {
        errors.push(`Lovable: ${(err as Error).message}`);
      }
    }
    if (errors.length === 0) {
      throw new Error("AI কনফিগার নেই — অ্যাডমিনকে জানান");
    }
    throw new Error(errors.join(" | "));
  });
