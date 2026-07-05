// Global capture of the browser's `beforeinstallprompt` event so any page
// (typically /install) can trigger the native install prompt on demand.
// Also logs a successful install to profiles.app_installed_at for admin analytics.

import { supabase } from "@/integrations/supabase/client";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BIPEvent | null;
  }
}

let installedLogged = false;

async function logInstall() {
  if (installedLogged) return;
  installedLogged = true;
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase
      .from("profiles")
      .update({ app_installed_at: new Date().toISOString() })
      .eq("id", data.user.id);
  } catch {
    /* ignore */
  }
}

export function initInstallPromptCapture() {
  if (typeof window === "undefined") return;

  const onPrompt = (e: Event) => {
    e.preventDefault();
    window.__deferredInstallPrompt = e as BIPEvent;
    // Notify listeners (e.g. Install page)
    window.dispatchEvent(new CustomEvent("pwa-install-available"));
  };

  const onInstalled = () => {
    window.__deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("pwa-installed"));
    void logInstall();
  };

  // Detect already-installed (standalone) sessions and log once
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS safari
    window.navigator.standalone === true;
  if (isStandalone) void logInstall();

  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
}
