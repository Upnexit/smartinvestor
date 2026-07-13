import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Db = SupabaseClient<Database>;

const ACTIONS = ["like", "comment", "share", "follow"] as const;
type Action = (typeof ACTIONS)[number];

const ACTION_BN: Record<Action, string> = {
  like: "লাইক",
  comment: "কমেন্ট",
  share: "শেয়ার",
  follow: "ফলো",
};

export async function assertDistributor(db: Db, userId: string) {
  const [{ data: isDistributor, error: distributorError }, { data: isAdmin, error: adminError }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.rpc("has_role" as any, { _user_id: userId, _role: "distributor" as any }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.rpc("has_role" as any, { _user_id: userId, _role: "admin" as any }),
  ]);
  if (distributorError) throw new Error(distributorError.message);
  if (adminError) throw new Error(adminError.message);
  if (!isDistributor && !isAdmin) throw new Error("ডিস্ট্রিবিউটর অনুমতি নেই");
}

export function todayBD(): string {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function generateFacebookTaskBatch(
  count: number,
  keyword: string,
  key: string,
): Promise<Array<{ title: string; fb_page_url: string; action_type: Action; instruction: string }>> {
  const sys = `You generate Facebook page task suggestions for a Bangladesh micro-earning platform.
Return ONLY a valid JSON array of ${count} items. No prose, no code fences.
Each item shape:
{ "page_name": "Real-sounding Facebook page name (Bangla or English)", "page_slug": "url-safe slug", "action": "like|comment|share|follow", "instruction": "3-4 short Bangla bullet lines starting with •" }
Mix of actions. Slugs should look like realistic facebook page slugs (e.g., 'Prothom.Alo', 'BDNewsPage', 'DhakaFoodie').`;
  const user = `Topic/keyword hint: ${keyword || "general Bangladesh pages"}
Generate ${count} diverse Facebook page task suggestions.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.9,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI ব্যস্ত — কিছুক্ষণ পরে চেষ্টা করুন");
    if (res.status === 402) throw new Error("AI ক্রেডিট শেষ — অ্যাডমিনকে জানান");
    throw new Error(`AI error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  let arr: Array<{ page_name?: string; page_slug?: string; action?: string; instruction?: string }> = [];
  try {
    arr = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\[[\s\S]*\]/);
    if (m) arr = JSON.parse(m[0]);
  }
  if (!Array.isArray(arr)) throw new Error("AI invalid response");

  return arr.slice(0, count).map((r) => {
    const action = (ACTIONS as readonly string[]).includes(r.action ?? "") ? (r.action as Action) : "like";
    const slug = String(r.page_slug ?? "SmartPage").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 60) || "SmartPage";
    const name = String(r.page_name ?? slug).slice(0, 120);
    return {
      title: `${name} — Facebook ${ACTION_BN[action]}`,
      fb_page_url: `https://www.facebook.com/${slug}`,
      action_type: action,
      instruction: String(r.instruction ?? `• লিংকে গিয়ে ${ACTION_BN[action]} করুন\n• স্ক্রিনশট নিন\n• Submit বাটনে ক্লিক করুন`).slice(0, 1000),
    };
  });
}