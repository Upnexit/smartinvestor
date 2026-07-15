// PWA service worker registration wrapper.
// Refuses to register in dev, iframes, Lovable preview hosts, or when `?sw=off`.
// Supports `?sw=off` kill switch to unregister the SW.

const SW_URL = "/sw.js";

function isBlockedHost(host: string): boolean {
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (url.endsWith(SW_URL)) await r.unregister();
    }
  } catch { /* noop */ }
}

export function registerPWA() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const inIframe = window.self !== window.top;
  const host = window.location.hostname;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";

  if (!isProd || inIframe || isBlockedHost(host) || killSwitch) {
    unregisterMatching();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((reg) => {
        // Poll for a new version every hour so long-open installed apps
        // pick up deploys without waiting for a full reopen.
        try { setInterval(() => { reg.update().catch(() => {}); }, 60 * 60 * 1000); } catch { /* noop */ }
      })
      .catch(() => { /* noop */ });

    // When a new SW takes control (via skipWaiting + clientsClaim),
    // reload once so the user sees the fresh build immediately.
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
