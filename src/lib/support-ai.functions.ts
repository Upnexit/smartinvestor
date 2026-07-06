import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Msg = { sender: "user" | "admin"; body: string };

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("forbidden");
}

const SYSTEM_REPLY = `You are the admin support assistant for "Smart Investor" (a Bangladesh online-earning platform).
You are drafting a reply the human admin will review before sending to a user.

STRICT RULES:
- Reply in polite, clear Bengali (বাংলা).
- Be concise: 1–4 short sentences. No preface, no markdown, no headings.
- Refer to features accurately: packages, tasks, withdraw (bKash/Nagad/Rocket, min ৳200), referrals (5%), signup bonus ৳300 (locked).
- Never promise money, refunds, or approvals — say the team will verify.
- Never expose admin, other users, or internal info.
- If the user's issue is unclear, ask ONE short clarifying question.
- Output ONLY the reply text.`;

async function lovableChat(system: string, messages: Array<{ role: string; content: string }>, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — একটু পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
    throw new Error(`AI ${res.status}: ${t.slice(0, 160)}`);
  }
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return j.choices?.[0]?.message?.content?.trim() || "";
}

async function geminiChat(system: string, messages: Array<{ role: string; content: string }>, key: string): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim() || "";
}

/* ------------ Suggest admin reply ------------ */
export const suggestSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[]; hint?: string }) => ({
    messages: (Array.isArray(d?.messages) ? d.messages : []).slice(-20).map((m) => ({
      sender: m.sender === "admin" ? ("admin" as const) : ("user" as const),
      body: String(m.body ?? "").slice(0, 1500),
    })),
    hint: d?.hint ? String(d.hint).slice(0, 400) : "",
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const chatMsgs = data.messages.map((m) => ({
      role: m.sender === "admin" ? "assistant" : "user",
      content: m.body,
    }));
    if (data.hint) {
      chatMsgs.push({ role: "user", content: `[Admin note for you, do not repeat verbatim]: ${data.hint}` });
    }
    const lovableKey = process.env.LOVABLE_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const errors: string[] = [];
    if (lovableKey) {
      try {
        const reply = await lovableChat(SYSTEM_REPLY, chatMsgs, lovableKey);
        if (reply) return { reply, source: "lovable" as const };
      } catch (e) { errors.push((e as Error).message); }
    }
    if (geminiKey) {
      try {
        const reply = await geminiChat(SYSTEM_REPLY, chatMsgs, geminiKey);
        if (reply) return { reply, source: "gemini" as const };
      } catch (e) { errors.push((e as Error).message); }
    }
    throw new Error(errors[0] || "AI provider unavailable");
  });

/* ------------ Voice → Text (Bengali/English) ------------ */
export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { audio_base64: string; mime?: string; filename?: string }) => ({
    audio_base64: String(d?.audio_base64 ?? ""),
    mime: String(d?.mime ?? "audio/webm"),
    filename: String(d?.filename ?? "recording.webm"),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (!data.audio_base64) throw new Error("audio required");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not set");

    // Decode base64 → Uint8Array → Blob
    const bin = atob(data.audio_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (bytes.byteLength < 512) throw new Error("অডিও খুব ছোট — আবার চেষ্টা করুন");

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bytes], { type: data.mime }), data.filename);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("STT ব্যস্ত — একটু পরে");
      if (res.status === 402) throw new Error("AI ক্রেডিট শেষ");
      throw new Error(`STT ${res.status}: ${t.slice(0, 160)}`);
    }
    const j = (await res.json()) as { text?: string };
    return { text: (j.text ?? "").trim() };
  });
