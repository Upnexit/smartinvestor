/**
 * Deployment health check
 * -----------------------
 * Vercel / Lovable — কোন deployment গুলো live আছে এবং সর্বশেষ build কবে হয়েছে
 * সেটি /api/public/hooks/health endpoint hit করে যাচাই করে।
 *
 * অতিরিক্ত URL দিতে চাইলে env `DEPLOY_HEALTH_URLS` এ কমা দিয়ে দিন।
 */

const LOVABLE_PROJECT_ID = "53c6a07a-40d3-4d21-9105-97bc1ff86fa8";

export type DeployTarget = {
  label: string;
  url: string;
  ok: boolean;
  status: number | null;
  ms: number;
  build_time: string | null;
  runtime: string | null;
  error: string | null;
};

function targets(): { label: string; url: string }[] {
  const list: { label: string; url: string }[] = [
    { label: "Production (Lovable)", url: `https://project--${LOVABLE_PROJECT_ID}.lovable.app` },
    { label: "Preview (Lovable)", url: `https://project--${LOVABLE_PROJECT_ID}-dev.lovable.app` },
  ];
  const extra = process.env["DEPLOY_HEALTH_URLS"];
  if (extra) {
    for (const raw of extra.split(",")) {
      const u = raw.trim().replace(/\/+$/, "");
      if (!u) continue;
      list.push({ label: u.includes("vercel") ? `Vercel — ${u.replace(/^https?:\/\//, "")}` : u.replace(/^https?:\/\//, ""), url: u });
    }
  }
  const vercel = process.env["VERCEL_URL"];
  if (vercel) list.push({ label: "Vercel (current)", url: `https://${vercel.replace(/^https?:\/\//, "")}` });
  return list;
}

async function probe(t: { label: string; url: string }): Promise<DeployTarget> {
  const started = Date.now();
  try {
    const res = await fetch(`${t.url}/api/public/hooks/health`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const ms = Date.now() - started;
    let body: { build_time?: string; runtime?: string } = {};
    try { body = (await res.json()) as typeof body; } catch { /* non-json */ }
    return {
      label: t.label, url: t.url, ok: res.ok, status: res.status, ms,
      build_time: body.build_time ?? null, runtime: body.runtime ?? null, error: null,
    };
  } catch (e) {
    return {
      label: t.label, url: t.url, ok: false, status: null, ms: Date.now() - started,
      build_time: null, runtime: null, error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function checkDeployments(): Promise<{ checked_at: string; targets: DeployTarget[] }> {
  const results = await Promise.all(targets().map(probe));
  return { checked_at: new Date().toISOString(), targets: results };
}
