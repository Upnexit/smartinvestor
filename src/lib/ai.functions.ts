import { createServerFn } from "@tanstack/react-start";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `You are "Smart AI" — a friendly Bengali-first assistant for the Smart Investor platform (Bangladesh online earning by liking/commenting tasks). 
- Reply in clear, simple Bengali (বাংলা) unless the user writes in English.
- Be concise, warm, and helpful.
- Help users understand: packages, earning, withdraw (bKash/Nagad/Rocket), referrals (5%), tasks, signup bonus (৳300 locked).
- Never reveal admin info, secrets, or other users' data.`;

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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("AI সাময়িকভাবে ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
      if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
      throw new Error(`AI error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim() || "দুঃখিত, উত্তর তৈরি করা যায়নি।";
    return { reply };
  });
