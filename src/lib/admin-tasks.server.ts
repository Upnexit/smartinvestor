export type GeneratedTask = {
  title: string;
  url: string;
  action_type: "like" | "follow" | "share" | "comment" | "subscribe" | "view";
  description: string;
};

function buildDescription(slug: string, action: GeneratedTask["action_type"]): string {
  const pageName = `"${slug}"`;
  const intro = [
    `১. উপরের রঙিন "লিংকে যান ও কাজ শুরু করুন" বাটনে ক্লিক করুন — Facebook পেজ ${pageName} নতুন ট্যাবে খুলবে।`,
    `২. Facebook-এ আপনার account-এ লগইন থাকা আবশ্যক (না থাকলে লগইন করে নিন)।`,
  ];
  const steps: Record<GeneratedTask["action_type"], string[]> = {
    like: [
      `৩. পেজে গিয়ে সাম্প্রতিক ৩–৫টি পোস্ট নিচের দিকে scroll করুন।`,
      `৪. প্রতিটি পোস্টের নিচে থাকা 👍 "Like" বাটনে ক্লিক করে Like দিন।`,
      `৫. সব Like দেওয়া হলে এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
    follow: [
      `৩. পেজের উপরের অংশে "Follow" বাটনে ক্লিক করে পেজটি Follow করুন।`,
      `৪. Follow সম্পন্ন হলে "Following" দেখাবে — এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
    share: [
      `৩. পেজের সাম্প্রতিক একটি পোস্টে "Share" বাটনে ক্লিক করুন।`,
      `৪. "Share to Feed" সিলেক্ট করে Public / Friends privacy-তে আপনার Timeline-এ share করুন।`,
      `৫. Share সম্পন্ন হলে এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
    comment: [
      `৩. পেজের সাম্প্রতিক একটি পোস্টের নিচে "Comment" বক্সে অর্থপূর্ণ একটি মন্তব্য লিখুন (কমপক্ষে ৩ শব্দ)।`,
      `৪. Comment post করুন এবং এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
    subscribe: [
      `৩. পেজে গিয়ে "Subscribe" বা "Follow" বাটনে ক্লিক করে Subscribe করুন।`,
      `৪. সম্পন্ন হলে এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
    view: [
      `৩. পেজে গিয়ে সাম্প্রতিক একটি Video-তে ক্লিক করে কমপক্ষে ৩০ সেকেন্ড দেখুন।`,
      `৪. দেখা হলে এই ট্যাবে ফিরে এসে নিচের সবুজ "Submit" বাটনে ক্লিক করুন।`,
    ],
  };
  return [...intro, ...steps[action]].join("\n");
}

async function callGateway(system: string, user: string, key: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "smart-click-bd-tasks" },
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

const SEED_US_VERIFIED = [
  "nike", "apple", "Microsoft", "Google", "amazon", "Netflix", "spotify", "cocacola",
  "PepsiCo", "starbucks", "McDonalds", "Adidas", "Samsung", "Sony", "Tesla",
  "DisneyPlus", "Marvel", "WarnerBros", "UniversalPictures", "Paramount",
  "cnn", "BBCNews", "nytimes", "washingtonpost", "TheEconomist", "Reuters", "WSJ",
  "NationalGeographic", "Discovery", "HistoryChannel", "TIME",
  "NFL", "NBA", "MLB", "NHL", "espn", "LakersHome", "warriors", "chicagobulls",
  "manchesterunited", "realmadrid", "fcbarcelona", "liverpoolfc", "ChampionsLeague",
  "FIFAcom", "premierleague", "cristiano", "leomessi", "MrBeast6000", "kyliejenner",
  "TheRock", "justinbieber", "shakira", "taylorswift", "arianagrande", "eminem",
  "vindiesel", "willsmith", "GitHub", "meta", "instagram", "WhatsApp", "youtube",
];

const SEED_BD_VERIFIED = [
  "prothomalo", "somoynews.tv", "jamuna.television", "channelionline",
  "IndependentTelevision", "NTVBangla", "rtvonlinebd", "bdnews24", "kalerkantho",
  "jugantoronline", "TheDailyStarBangla", "GrameenphoneLtd", "Robi.4G", "Banglalink",
  "bkashlimited", "NagadDigitalBD", "PathaoBD", "foodpandaBD", "daraz.bd",
  "BangladeshCricket", "TigersOfBangladesh",
];

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
  const pool = Array.from(new Set(SEED_POOL.map((s) => s.toLowerCase())))
    .filter((s) => !excludeSlugs.has(s));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < count; i++) {
    const slug = pool[i] ?? SEED_POOL[Math.floor(Math.random() * SEED_POOL.length)];
    const action = actionMix[i % actionMix.length];
    out.push({
      title: `Facebook পেজ "${slug}" ${actionText[action]}`,
      url: `https://www.facebook.com/${slug}`,
      action_type: action,
      description: buildDescription(slug, action),
    });
  }
  return out;
}

export async function generateFbLinkTaskBatch(data: {
  count: number;
  actions: GeneratedTask["action_type"][];
  existingUrls: string[];
}) {
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
      if (!slug || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      const action_type = (["like", "follow", "share", "comment", "subscribe", "view"] as const)
        .includes(t.action_type) ? t.action_type : "like";
      clean.push({
        title: String(t.title ?? "").slice(0, 200) || `Facebook পেজ "${slug}" ${actionText[action_type]}`,
        url: `https://www.facebook.com/${slug}`,
        action_type,
        description: buildDescription(slug, action_type),
      });
      if (clean.length >= data.count) break;
    }
    if (clean.length === 0) {
      return { tasks: fallbackTasks(data.count, data.actions, excludeSlugs), source: "local" as const };
    }
    if (clean.length < data.count) {
      const pad = fallbackTasks(data.count - clean.length, data.actions, seenSlugs);
      return { tasks: [...clean, ...pad], source: "mixed" as const };
    }
    return { tasks: clean, source: "ai" as const };
  } catch (e) {
    console.warn("generateFbLinkTasks fallback:", (e as Error).message);
    return { tasks: fallbackTasks(data.count, data.actions, excludeSlugs), source: "local" as const };
  }
}