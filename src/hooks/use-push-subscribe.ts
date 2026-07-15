import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { savePushSubscription, removePushSubscription } from "@/lib/push.functions";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push-config";

export type PushSupport =
  | "unsupported"
  | "blocked-preview"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  if (window.self !== window.top) return true;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h.endsWith(".lovableproject.com") || h.endsWith(".lovableproject-dev.com")) return true;
  if (h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

export function usePushSubscribe() {
  const [status, setStatus] = useState<PushSupport>("unsupported");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (isPreviewHost()) {
      setStatus("blocked-preview");
      return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing && perm === "granted") setStatus("subscribed");
      else if (perm === "granted") setStatus("granted");
      else setStatus("default");
    } catch {
      setStatus(perm === "granted" ? "granted" : "default");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const subscribe = useCallback(async () => {
    if (busy) return { ok: false, reason: "busy" as const };
    if (isPreviewHost()) return { ok: false, reason: "preview" as const };
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, reason: "unsupported" as const };
    }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return { ok: false, reason: "permission" as const };
      }

      // Ensure a session exists before hitting the protected server fn.
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return { ok: false, reason: "unauth" as const };

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return { ok: false, reason: "invalid-sub" as const };
      }
      await save({
        data: {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 300),
        },
      });
      setStatus("subscribed");
      return { ok: true };
    } catch (err) {
      console.warn("[push] subscribe failed", err);
      return { ok: false, reason: "error" as const, error: (err as Error).message };
    } finally {
      setBusy(false);
    }
  }, [busy, save]);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return { ok: true };
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await remove({ data: { endpoint: sub.endpoint } });
      }
      setStatus("default");
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, [remove]);

  return { status, busy, subscribe, unsubscribe, refresh };
}
