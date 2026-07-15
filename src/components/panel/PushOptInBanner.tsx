import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { usePushSubscribe } from "@/hooks/use-push-subscribe";

const DISMISS_KEY = "si_push_optin_dismissed_at";
const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours — re-prompt often enough

export function PushOptInBanner() {
  const { status, busy, subscribe } = usePushSubscribe();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "default" && status !== "granted") { setVisible(false); return; }
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      const ts = raw ? Number(raw) : 0;
      if (ts && Date.now() - ts < COOLDOWN_MS) { setVisible(false); return; }
    } catch { /* ignore */ }
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, [status]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  const enable = async () => {
    const r = await subscribe();
    if (r.ok) {
      toast.success("নোটিফিকেশন চালু হয়েছে ✅");
      setVisible(false);
    } else if (r.reason === "permission") {
      toast.error("অনুমতি না দিলে notification আসবে না");
    } else if (r.reason === "preview") {
      toast.info("Preview-এ কাজ করে না — published অ্যাপে খুলুন");
    } else {
      toast.error("Notification চালু করা যায়নি");
    }
  };

  return (
    <div className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-3 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow">
        <Bell className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">নোটিফিকেশন চালু করুন</p>
        <p className="mt-0.5 text-xs text-slate-600 leading-snug">
          গুরুত্বপূর্ণ আপডেট সরাসরি আপনার ফোনে পৌঁছাবে — Facebook-এর মতো।
        </p>
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-rose-500/20 active:scale-95 disabled:opacity-60"
      >
        {busy ? "..." : "চালু করুন"}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="বন্ধ"
        className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-white hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
