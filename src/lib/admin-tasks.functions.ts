import { createServerFn } from "@tanstack/react-start";

export type GeneratedTask = {
  title: string;
  url: string;
  action_type: "like" | "follow" | "share" | "comment" | "subscribe" | "view";
};

async function callGateway(system: string, user: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "smart-investor-tasks" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

// Curated seed of well-known verified public Facebook pages in Bangladesh.
// AI picks from these + augments with plausible page slugs.
const SEED_FB_PAGES = [
  "prothomalo", "banglanews24", "somoynews.tv", "jamuna.television", "channelionline",
  "IndependentTelevision", "atnnewsonline", "NTVBangla", "rtvonlinebd", "ekattor.tv",
  "bdnews24", "kalerkantho", "jugantoronline", "manabzamin.online", "TheDailyStarBangla",
  "GrameenphoneLtd", "Robi.4G", "Banglalink", "bkashlimited", "NagadDigitalBD",
  "PathaoBD", "foodpandaBD", "shopupbd", "daraz.bd", "chaldalcom",
  "BangladeshCricket", "TigersOfBangladesh", "TheBengalTigers", "BFF.Football.Bangladesh",
];

function fallbackTasks(count: number, actionMix: GeneratedTask["action_type"][]): GeneratedTask[] {
  const out: GeneratedTask[] = [];
  const used = new Set<number>();
  const actionText: Record<GeneratedTask["action_type"], string> = {
    like: "লাইক দিন", follow: "ফলো করুন", share: "শেয়ার করুন",
    comment: "কমেন্ট করুন", subscribe: "সাবস্ক্রাইব করুন", view: "ভিডিও দেখুন",
  };
  for (let i = 0; i < count; i++) {
    let idx = Math.floor(Math.random() * SEED_FB_PAGES.length);
    let tries = 0;
    while (used.has(idx) && tries++ < 20) idx = Math.floor(Math.random() * SEED_FB_PAGES.length);
    used.add(idx);
    const slug = SEED_FB_PAGES[idx];
    const action = actionMix[i % actionMix.length];
    out.push({
      title: `Facebook পেজ "${slug}" ${actionText[action]}`,
      url: `https://www.facebook.com/${slug}`,
      action_type: action,
    });
  }
  return out;
}

export const generateFbLinkTasks = createServerFn({ method: "POST" })
  .validator((d: { count: number; actions?: GeneratedTask["action_type"][] }) => {
    const count = Math.max(1, Math.min(50, Math.floor(Number(d?.count) || 10)));
    const allowed: GeneratedTask["action_type"][] = ["like", "follow", "share", "comment", "subscribe", "view"];
    const actions = Array.isArray(d?.actions) && d.actions.length
      ? d.actions.filter((a) => allowed.includes(a))
      : ["like", "follow", "share"] as GeneratedTask["action_type"][];
    return { count, actions: actions.length ? actions : ["like"] as GeneratedTask["action_type"][] };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { tasks: fallbackTasks(data.count, data.actions), source: "local" as const };

    const system = `You generate JSON lists of Facebook micro-tasks for a Bangladesh online-earning platform.
STRICT RULES:
- Respond ONLY with a JSON object: { "tasks": [{ "title": string, "url": string, "action_type": "like"|"follow"|"share"|"comment"|"subscribe"|"view" }] }
- Every URL MUST be a plausible public Facebook page URL (https://www.facebook.com/<slug>) of a REAL well-known verified Bangladesh brand, media, athlete, or public figure. Prefer these known slugs: ${SEED_FB_PAGES.join(", ")}. You may add other well-known verified Bangladesh pages.
- NEVER invent random usernames or personal profiles. NEVER use facebook.com/profile.php or numeric IDs.
- Titles are short বাংলা: "Facebook পেজ '<name>' লাইক দিন / ফলো করুন / শেয়ার করুন".
- Vary the pages — no duplicates in one response.`;

    const user = `Generate exactly ${data.count} tasks. Distribute action_type across: ${data.actions.join(", ")}. Return JSON only.`;

    try {
      const raw = await callGateway(system, user, key);
      const parsed = JSON.parse(raw) as { tasks?: GeneratedTask[] };
      const clean = (parsed.tasks ?? [])
        .filter((t) => t && typeof t.url === "string" && /^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9._-]+\/?$/.test(t.url))
        .filter((t) => !t.url.includes("profile.php"))
        .slice(0, data.count)
        .map((t) => ({
          title: String(t.title ?? "").slice(0, 200) || "Facebook পেজ ভিজিট করুন",
          url: t.url,
          action_type: (["like", "follow", "share", "comment", "subscribe", "view"] as const).includes(t.action_type)
            ? t.action_type : "like",
        }));
      if (clean.length === 0) return { tasks: fallbackTasks(data.count, data.actions), source: "local" as const };
      // Pad with fallback if AI returned fewer than requested
      if (clean.length < data.count) {
        const pad = fallbackTasks(data.count - clean.length, data.actions);
        return { tasks: [...clean, ...pad], source: "mixed" as const };
      }
      return { tasks: clean, source: "ai" as const };
    } catch (e) {
      console.warn("generateFbLinkTasks fallback:", (e as Error).message);
      return { tasks: fallbackTasks(data.count, data.actions), source: "local" as const };
    }
  });
