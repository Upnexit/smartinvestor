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
      temperature: 0.9,
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

// Curated seed of well-known verified (blue-tick) Facebook Pages with 1M+ followers.
// Heavy weight on US / global verified accounts (user prefers these), plus popular
// pages with strong Bangladesh audience. All slugs verified as reachable Facebook pages.
const SEED_US_VERIFIED = [
  // US / global brands
  "nike", "apple", "Microsoft", "Google", "amazon", "Netflix", "spotify", "cocacola",
  "PepsiCo", "starbucks", "McDonalds", "Adidas", "Samsung", "Sony", "Tesla",
  "DisneyPlus", "Marvel", "WarnerBros", "UniversalPictures", "Paramount",
  // US media / news
  "cnn", "BBCNews", "nytimes", "washingtonpost", "TheEconomist", "Reuters", "WSJ",
  "NationalGeographic", "Discovery", "HistoryChannel", "TIME",
  // US sports leagues / teams
  "NFL", "NBA", "MLB", "NHL", "espn", "LakersHome", "warriors", "chicagobulls",
  "manchesterunited", "realmadrid", "fcbarcelona", "liverpoolfc", "ChampionsLeague",
  "FIFAcom", "premierleague",
  // US / global celebrities & creators
  "cristiano", "leomessi", "MrBeast6000", "kyliejenner", "TheRock",
  "justinbieber", "shakira", "taylorswift", "arianagrande", "eminem",
  "vindiesel", "willsmith",
  // Tech / dev
  "GitHub", "meta", "instagram", "WhatsApp", "youtube",
];

const SEED_BD_VERIFIED = [
  "prothomalo", "somoynews.tv", "jamuna.television", "channelionline",
  "IndependentTelevision", "NTVBangla", "rtvonlinebd",
  "bdnews24", "kalerkantho", "jugantoronline", "TheDailyStarBangla",
  "GrameenphoneLtd", "Robi.4G", "Banglalink", "bkashlimited", "NagadDigitalBD",
  "PathaoBD", "foodpandaBD", "daraz.bd",
  "BangladeshCricket", "TigersOfBangladesh",
];

// Weighted pool — US verified pages appear ~2x for higher selection probability.
const SEED_POOL = [...SEED_US_VERIFIED, ...SEED_US_VERIFIED, ...SEED_BD_VERIFIED];

const actionText: Record<GeneratedTask["action_type"], string> = {
  like: "লাইক দিন", follow: "ফলো করুন", share: "শেয়ার করুন",
  comment: "কমেন্ট করুন", subscribe: "সাবস্ক্রাইব করুন", view: "ভিডিও দেখুন",
};

function slugFromUrl(u: string): string | null {
  const m = u.match(/^https:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9._-]+)\/?$/);
  return m ? m[1].toLowerCase() : null;
}

function fallbackTasks(
  count: number,
  actionMix: GeneratedTask["action_type"][],
  excludeSlugs: Set<string>,
): GeneratedTask[] {
  const out: GeneratedTask[] = [];
  // Shuffle a deduped pool that excludes already-used slugs.
  const pool = Array.from(new Set(SEED_POOL.map((s) => s.toLowerCase())))
    .filter((s) => !excludeSlugs.has(s));
  // Fisher–Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < count; i++) {
    // If pool exhausted, allow reuse from the original weighted list (last resort).
    const slug = pool[i] ?? SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)];
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
  .validator((d: {
    count: number;
    actions?: GeneratedTask["action_type"][];
    existingUrls?: string[];
  }) => {
    const count = Math.max(1, Math.min(200, Math.floor(Number(d?.count) || 10)));
    const allowed: GeneratedTask["action_type"][] = ["like", "follow", "share", "comment", "subscribe", "view"];
    const actions = Array.isArray(d?.actions) && d.actions.length
      ? d.actions.filter((a) => allowed.includes(a))
      : ["like", "follow", "share"] as GeneratedTask["action_type"][];
    const existingUrls = Array.isArray(d?.existingUrls)
      ? d.existingUrls.filter((u) => typeof u === "string").slice(0, 2000)
      : [];
    return { count, actions: actions.length ? actions : ["like"] as GeneratedTask["action_type"][], existingUrls };
  })
  .handler(async ({ data }) => {
    // Build the exclude set from already-used links (case-insensitive slug match).
    const excludeSlugs = new Set<string>();
    for (const u of data.existingUrls) {
      const s = slugFromUrl(u);
      if (s) excludeSlugs.add(s);
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { tasks: fallbackTasks(data.count, data.actions, excludeSlugs), source: "local" as const };
    }

    const excludeList = Array.from(excludeSlugs).slice(0, 300).join(", ");
    const preferredSample = [...SEED_US_VERIFIED].sort(() => Math.random() - 0.5).slice(0, 40).join(", ");

    const system = `You generate JSON lists of Facebook micro-tasks for a Bangladesh online-earning platform.
STRICT RULES:
- Respond ONLY with a JSON object: { "tasks": [{ "title": string, "url": string, "action_type": "like"|"follow"|"share"|"comment"|"subscribe"|"view" }] }
- Every URL MUST be a public Facebook page URL: https://www.facebook.com/<slug> (no trailing path, no /posts/, no /videos/, no query string).
- Each URL MUST belong to a REAL, OFFICIALLY VERIFIED (blue-tick) Facebook Page with 1 MILLION+ followers that is CURRENTLY ACTIVE and posts regularly.
- STRONG PREFERENCE (aim for ~70% of the list): major US-based / globally verified pages — US brands, US media, US sports (NFL, NBA, MLB, NHL, ESPN), Hollywood studios, global celebrities, US tech giants. Examples of good US verified slugs: ${preferredSample}.
- Remaining ~30%: verified Bangladeshi media, telecom, fintech, or cricket pages.
- NEVER use: unverified pages, small pages under 1M followers, personal profiles, groups, profile.php, numeric IDs, event URLs, marketplace URLs, defunct/inactive pages.
- ABSOLUTELY NO DUPLICATES within your response. Every slug MUST be unique.
- DO NOT reuse any of these already-used slugs: ${excludeList || "(none)"}.
- Vary the categories — do not return 20 sports pages in a row; mix brands, media, celebrities, sports, tech.
- Titles are short বাংলা: "Facebook পেজ '<name>' লাইক দিন / ফলো করুন / শেয়ার করুন".`;

    const user = `Generate exactly ${data.count} UNIQUE tasks. Distribute action_type roughly evenly across: ${data.actions.join(", ")}. Return JSON only, no prose.`;

    try {
      const raw = await callGateway(system, user, key);
      const parsed = JSON.parse(raw) as { tasks?: GeneratedTask[] };
      const seenSlugs = new Set<string>(excludeSlugs);
      const clean: GeneratedTask[] = [];
      for (const t of parsed.tasks ?? []) {
        if (!t || typeof t.url !== "string") continue;
        if (!/^https:\/\/(www\.)?facebook\.com\/[A-Za-z0-9._-]+\/?$/.test(t.url)) continue;
        if (t.url.includes("profile.php")) continue;
        const slug = slugFromUrl(t.url);
        if (!slug) continue;
        if (seenSlugs.has(slug)) continue; // dedupe against existing + within batch
        seenSlugs.add(slug);
        const action_type = (["like", "follow", "share", "comment", "subscribe", "view"] as const)
          .includes(t.action_type) ? t.action_type : "like";
        clean.push({
          title: String(t.title ?? "").slice(0, 200) || `Facebook পেজ "${slug}" ${actionText[action_type]}`,
          url: `https://www.facebook.com/${slug}`,
          action_type,
        });
        if (clean.length >= data.count) break;
      }
      if (clean.length === 0) {
        return { tasks: fallbackTasks(data.count, data.actions, excludeSlugs), source: "local" as const };
      }
      // Pad with unique fallback if AI returned fewer than requested.
      if (clean.length < data.count) {
        const pad = fallbackTasks(data.count - clean.length, data.actions, seenSlugs);
        return { tasks: [...clean, ...pad], source: "mixed" as const };
      }
      return { tasks: clean, source: "ai" as const };
    } catch (e) {
      console.warn("generateFbLinkTasks fallback:", (e as Error).message);
      return { tasks: fallbackTasks(data.count, data.actions, excludeSlugs), source: "local" as const };
    }
  });
