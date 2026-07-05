import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Megaphone, AlertTriangle, Info } from "lucide-react";
import { listActiveNoticesForMe, dismissNotice, type NoticeRow } from "@/lib/notices.functions";

const STYLES = {
  info:     { bar: "from-sky-500 to-indigo-600",     Icon: Info,          ring: "ring-sky-200" },
  warning:  { bar: "from-amber-500 to-orange-600",   Icon: Megaphone,     ring: "ring-amber-200" },
  critical: { bar: "from-rose-500 to-red-600",       Icon: AlertTriangle, ring: "ring-rose-200" },
} as const;

export function NoticeModal() {
  const [queue, setQueue] = useState<NoticeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fetchNotices = useServerFn(listActiveNoticesForMe);
  const doDismiss = useServerFn(dismissNotice);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchNotices();
        if (!cancelled) setQueue(r.notices ?? []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [fetchNotices]);

  if (queue.length === 0) return null;
  const current = queue[0];
  const style = STYLES[current.priority] ?? STYLES.info;
  const { Icon } = style;

  async function close() {
    if (busy) return;
    setBusy(true);
    try { await doDismiss({ data: { notice_id: current.id } }); } catch { /* ignore */ }
    setBusy(false);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ${style.ring} overflow-hidden animate-in zoom-in-95 duration-200`}>
        <div className={`bg-gradient-to-r ${style.bar} px-5 py-4 flex items-center gap-3 text-white`}>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-widest uppercase opacity-90">গুরুত্বপূর্ণ নোটিশ</p>
            <h3 className="bn-display text-base leading-tight truncate">{current.title}</h3>
          </div>
          <button
            onClick={close}
            disabled={busy}
            aria-label="বন্ধ করুন"
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[55vh] overflow-y-auto">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{current.body}</p>
        </div>

        <div className="px-5 pb-5 pt-1 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {queue.length > 1 ? `${queue.length - 1}টি আরও নোটিশ` : "আর কোনো নোটিশ নেই"}
          </span>
          <button
            onClick={close}
            disabled={busy}
            className={`rounded-xl bg-gradient-to-r ${style.bar} px-4 py-2 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-60 transition`}
          >
            {busy ? "..." : "পড়েছি, বন্ধ করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}
