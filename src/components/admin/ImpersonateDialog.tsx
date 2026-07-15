import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, ExternalLink, X, AlertTriangle, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Impersonation dialog — shows a one-time magic link that signs the admin into
 * the target user's panel. Because Supabase Auth stores the session in
 * localStorage per origin, opening this link in the SAME browser tab/window
 * replaces the admin's own session. To keep the admin logged in, the dialog
 * recommends opening the link in an Incognito / Private window, and provides a
 * copy button for that. An "Open in new tab anyway" option is available with a
 * clear warning.
 */
export function ImpersonateDialog({
  open,
  url,
  targetLabel,
  onClose,
}: {
  open: boolean;
  url: string | null;
  targetLabel: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("লিংক কপি হয়েছে — Incognito window-এ paste করুন");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("কপি করা যায়নি");
    }
  };

  const openAnyway = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50 to-violet-50">
          <div>
            <div className="text-sm font-bold text-slate-900">প্যানেলে প্রবেশ — {targetLabel}</div>
            <div className="text-[11px] text-slate-500">এক-বারের ম্যাজিক লিংক তৈরি হয়েছে</div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-slate-900 ring-1 ring-slate-200"
            aria-label="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="flex gap-2.5 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed text-amber-900">
              <b>গুরুত্বপূর্ণ:</b> এই লিংক একই browser-এ খুললে আপনার admin session বাতিল হয়ে যাবে।{" "}
              <b>Incognito / Private window</b>-এ খোলাই সবচেয়ে ভালো — এতে admin panel-এ আপনি log-in থাকবেন।
            </div>
          </div>

          {/* Steps */}
          <div className="rounded-2xl ring-1 ring-slate-200 p-4 bg-slate-50/60">
            <div className="text-[11px] font-bold text-slate-600 mb-2 tracking-wide">
              ৩টি সহজ ধাপ (নিরাপদ পদ্ধতি):
            </div>
            <ol className="space-y-1.5 text-[13px] text-slate-700">
              <li className="flex gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white text-[10px] font-bold flex-shrink-0">1</span>
                <span>নিচের <b>"লিংক কপি করুন"</b> বাটনে ক্লিক করুন</span>
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white text-[10px] font-bold flex-shrink-0">2</span>
                <span>Browser-এ <b>Ctrl+Shift+N</b> (Windows) বা <b>Cmd+Shift+N</b> (Mac) চেপে Incognito window খুলুন</span>
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white text-[10px] font-bold flex-shrink-0">3</span>
                <span>Address bar-এ paste করে Enter চাপুন — user-এর panel-এ log-in হয়ে যাবে</span>
              </li>
            </ol>
          </div>

          {/* Link box */}
          <div className="rounded-2xl ring-1 ring-slate-200 bg-slate-50 p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0 px-2 text-[11px] font-mono text-slate-700 truncate">
              {url ?? "লিংক তৈরি হচ্ছে..."}
            </div>
            <button
              onClick={copy}
              disabled={!url}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold text-white shadow-md transition disabled:opacity-50",
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-gradient-to-br from-indigo-500 to-violet-600 hover:scale-[1.03]",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> কপি হয়েছে
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> লিংক কপি করুন
                </>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={copy}
              disabled={!url}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
              <Chrome className="h-4 w-4" /> কপি করে Incognito-তে খুলুন
            </button>
            <button
              onClick={openAnyway}
              disabled={!url}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition disabled:opacity-50"
              title="সাবধান: এই browser-এর admin session বাতিল হবে"
            >
              <ExternalLink className="h-4 w-4" /> এই browser-এ খুলুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
