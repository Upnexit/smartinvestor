import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone, AlertTriangle, Info, Clock, CalendarDays, ChevronRight } from "lucide-react";
import { listActiveNoticesForMe, dismissNotice, type NoticeRow } from "@/lib/notices.functions";

const STYLES = {
  info: {
    bar: "from-sky-500 via-blue-500 to-indigo-600",
    soft: "from-sky-50 to-indigo-50",
    ring: "ring-sky-200/60",
    chip: "bg-sky-100 text-sky-700",
    label: "সাধারণ তথ্য",
    Icon: Info,
  },
  warning: {
    bar: "from-amber-500 via-orange-500 to-orange-600",
    soft: "from-amber-50 to-orange-50",
    ring: "ring-amber-200/60",
    chip: "bg-amber-100 text-amber-800",
    label: "সতর্কতা",
    Icon: Megaphone,
  },
  critical: {
    bar: "from-rose-500 via-red-500 to-red-600",
    soft: "from-rose-50 to-red-50",
    ring: "ring-rose-200/60",
    chip: "bg-rose-100 text-rose-700",
    label: "জরুরি নোটিশ",
    Icon: AlertTriangle,
  },
} as const;

function formatBnDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function daysLeft(iso: string): number | null {
  try {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function NoticeModal() {
  const [queue, setQueue] = useState<NoticeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fetchNotices = useServerFn(listActiveNoticesForMe);
  const doDismiss = useServerFn(dismissNotice);

  useEffect(() => {
    let cancelled = false;
    // Small delay so it feels like a proper login-time popup, not a hydration flash
    const t = setTimeout(async () => {
      try {
        const r = await fetchNotices();
        if (!cancelled) {
          setQueue(r.notices ?? []);
          setMounted(true);
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fetchNotices]);

  if (!mounted || queue.length === 0) return null;
  const current = queue[0];
  const style = STYLES[current.priority] ?? STYLES.info;
  const { Icon } = style;

  async function close() {
    if (busy) return;
    setBusy(true);
    try {
      await doDismiss({ data: { notice_id: current.id } });
    } catch {
      /* ignore */
    }
    setBusy(false);
    setQueue((q) => q.slice(1));
  }

  const publishedOn = formatBnDate(current.created_at);
  const expiryOn = current.expires_at ? formatBnDate(current.expires_at) : null;
  const left = current.expires_at ? daysLeft(current.expires_at) : null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center px-3 py-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-title"
    >
      <div
        className={`w-full max-w-md rounded-3xl bg-white shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)] ring-1 ${style.ring} overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300`}
      >
        {/* Header */}
        <div className={`relative bg-gradient-to-br ${style.bar} px-5 pt-5 pb-6 text-white overflow-hidden`}>
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />

          <div className="relative flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  {style.label}
                </span>
                {queue.length > 1 && (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                    ১/{queue.length}
                  </span>
                )}
              </div>
              <h3
                id="notice-title"
                className="bn-display mt-1.5 text-lg leading-tight font-bold drop-shadow-sm"
              >
                {current.title}
              </h3>
            </div>
            <button
              onClick={close}
              disabled={busy}
              aria-label="বন্ধ করুন"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 hover:bg-white/30 active:scale-95 disabled:opacity-50 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Meta strip */}
        <div className={`bg-gradient-to-r ${style.soft} px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600`}>
          {publishedOn && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              প্রকাশিত: {publishedOn}
            </span>
          )}
          {expiryOn && left !== null && (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Clock className="h-3 w-3" />
              {left > 0 ? `আর ${left} দিন বাকি (${expiryOn})` : `শেষ দিন: ${expiryOn}`}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[52vh] overflow-y-auto">
          <p className="text-[15px] leading-[1.75] text-slate-700 whitespace-pre-line">
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            {queue.length > 1
              ? `পরবর্তী: আরও ${queue.length - 1}টি নোটিশ`
              : "সব নোটিশ পড়া হয়ে গেছে"}
          </span>
          <button
            onClick={close}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r ${style.bar} px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110 hover:shadow-xl active:scale-95 disabled:opacity-60 transition`}
          >
            {busy ? "..." : queue.length > 1 ? "পরবর্তী" : "পড়েছি, বন্ধ করুন"}
            {queue.length > 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
