import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Megaphone, Mic, MicOff, Sparkles, Plus, Trash2, Send, Eye, EyeOff, Loader2, AlertTriangle, Info, Users, X, Pencil, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listAdminNotices, saveNotice, deleteNotice, togglePublishNotice, improveNoticeText, resendNoticeToTelegram,
  listNoticeDeletionLog, lookupUsersForNotice,
  type NoticeRow, type NoticePriority, type NoticeDeletionLogRow, type NoticeUserLookupRow,
} from "@/lib/notices.functions";
import { sendPushSelfTest } from "@/lib/push.functions";
import { usePushSubscribe } from "@/hooks/use-push-subscribe";

import { GradientButton } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/admin/notices")({
  ssr: false,
  head: () => ({ meta: [{ title: "নোটিশ ম্যানেজমেন্ট — Admin" }] }),
  component: NoticesPage,
});

type PackageOpt = { id: string; name: string };

/* ---------- Web Speech API wrapper (Bangla-first) ---------- */
type SpeechRec = {
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  continuous: boolean; interimResults: boolean; lang: string;
};
function createRecognizer(): SpeechRec | null {
  const w = typeof window !== "undefined" ? (window as any) : null;
  const Ctor = w?.SpeechRecognition || w?.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r: SpeechRec = new Ctor();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "bn-BD";
  return r;
}

function NoticesPage() {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [packages, setPackages] = useState<PackageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NoticeRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [logs, setLogs] = useState<NoticeDeletionLogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const load = useServerFn(listAdminNotices);
  const rmFn = useServerFn(deleteNotice);
  const pubFn = useServerFn(togglePublishNotice);
  const resendFn = useServerFn(resendNoticeToTelegram);
  const logFn = useServerFn(listNoticeDeletionLog);
  const testPushFn = useServerFn(sendPushSelfTest);
  const { status: pushStatus, busy: pushBusy, subscribe: pushSubscribe } = usePushSubscribe();

  async function onSendTestPush() {
    if (pushStatus === "default" || pushStatus === "denied") {
      const r = await pushSubscribe();
      if (!r.ok) {
        if (r.reason === "permission") toast.error("অনুমতি না দিলে test আসবে না");
        else if (r.reason === "preview") toast.info("Preview-এ কাজ করে না — published অ্যাপে টেস্ট করুন");
        else if (r.reason === "unauth") toast.error("প্রথমে login করুন");
        else toast.error("Notification চালু করা যায়নি");
        return;
      }
    }
    const tid = toast.loading("টেস্ট পুশ পাঠাচ্ছে...");
    try {
      const r = await testPushFn();
      if (r.recipients === 0) {
        toast.message("কোনো subscribed device পাওয়া যায়নি — বেল আইকনে ট্যাপ করে চালু করুন", { id: tid });
      } else {
        toast.success(`পাঠানো হয়েছে — ${r.sent}/${r.recipients}${r.failed ? ` (${r.failed} ব্যর্থ)` : ""}`, { id: tid });
      }
    } catch (e) {
      toast.error((e as Error).message, { id: tid });
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const r = await load();
      setNotices(r.notices);
    } finally { setLoading(false); }
  }

  async function refreshLogs() {
    setLogsLoading(true);
    try {
      const r = await logFn();
      setLogs(r.logs);
    } finally { setLogsLoading(false); }
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("packages").select("id, name").order("sort_order", { ascending: true });
      setPackages((data ?? []) as PackageOpt[]);
      await Promise.all([refresh(), refreshLogs()]);
    })();
    // Auto-refresh logs every 30s so admins see auto-deletions in near-real time
    const t = setInterval(() => { refreshLogs().catch(() => {}); }, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function onDelete(n: NoticeRow) {
    if (!confirm(`"${n.title}" — এই notice টি delete করবেন?`)) return;
    await rmFn({ data: { id: n.id } });
    await refresh();
  }
  async function onTogglePublish(n: NoticeRow) {
    const r = await pubFn({ data: { id: n.id, published: !n.published } });
    if (!n.published) {
      const tg = r.telegram;
      if (tg && tg.recipients > 0) {
        toast.success(`Telegram-এ ${tg.sent}/${tg.recipients} জনকে notice পাঠানো হয়েছে${tg.failed ? ` (${tg.failed} ব্যর্থ)` : ""}`);
      } else {
        toast.message("Notice publish হয়েছে — কোনো Telegram-সংযুক্ত recipient পাওয়া যায়নি");
      }
    }
    await refresh();
  }
  async function onResend(n: NoticeRow) {
    const tid = toast.loading("Telegram-এ পাঠাচ্ছে...");
    try {
      const r = await resendFn({ data: { id: n.id } });
      const tg = r.telegram;
      if (tg.recipients > 0) {
        toast.success(`Telegram-এ ${tg.sent}/${tg.recipients} জনকে পাঠানো হয়েছে${tg.failed ? ` (${tg.failed} ব্যর্থ)` : ""}`, { id: tid });
      } else {
        toast.message("Telegram-সংযুক্ত কোনো recipient পাওয়া যায়নি", { id: tid });
      }
    } catch (e) {
      toast.error((e as Error).message, { id: tid });
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-indigo-600 text-white shadow-lg">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="bn-display text-xl sm:text-2xl text-slate-900">নোটিশ ম্যানেজমেন্ট</h1>
            <p className="text-xs text-slate-500">প্যাকেজ-ভিত্তিক announcement — voice + AI দিয়ে দ্রুত তৈরি করুন</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSendTestPush}
            disabled={pushBusy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:from-emerald-100 hover:to-teal-100 disabled:opacity-60"
            title="নিজেকে test push পাঠাও"
          >
            <Send className="h-3.5 w-3.5" /> টেস্ট পুশ
          </button>
          <GradientButton accent="fuchsia" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> নতুন নোটিশ
          </GradientButton>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 grid place-items-center text-slate-500 ring-1 ring-slate-200">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notices.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200">
              <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">এখনও কোনো নোটিশ তৈরি করা হয়নি</p>
              <p className="text-xs text-slate-500">উপরে "নতুন নোটিশ" বাটনে ক্লিক করে শুরু করুন</p>
              <p className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 inline-block">
                ✓ সব recipient দেখে ফেললে notice automatic delete হয়ে ডানপাশের log-এ চলে যাবে
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {notices.map((n) => (
                <NoticeCard
                  key={n.id}
                  notice={n}
                  packages={packages}
                  onEdit={() => { setEditing(n); setFormOpen(true); }}
                  onDelete={() => onDelete(n)}
                  onTogglePublish={() => onTogglePublish(n)}
                  onResend={() => onResend(n)}
                />
              ))}
            </div>
          )}
        </div>

        <DeletionLogPanel logs={logs} loading={logsLoading} onRefresh={refreshLogs} />
      </div>

      {formOpen && (
        <NoticeFormModal
          initial={editing}
          packages={packages}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          onSaved={async () => { setFormOpen(false); setEditing(null); await refresh(); }}
        />
      )}
    </div>
  );

}

/* ------------------------ Deletion Log Panel ------------------------ */
function DeletionLogPanel({
  logs, loading, onRefresh,
}: { logs: NoticeDeletionLogRow[]; loading: boolean; onRefresh: () => void }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-4 rounded-3xl bg-white ring-1 ring-slate-200 shadow-soft overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-slate-50 to-fuchsia-50 border-b border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-slate-600 to-fuchsia-600 text-white shadow">
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="bn-display text-sm text-slate-900">Auto-Delete Log</h3>
              <p className="text-[10px] text-slate-500 leading-tight">সবাই দেখে ফেলার পর delete হওয়া notice</p>
            </div>
          </div>
          <button onClick={onRefresh} className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white ring-1 ring-slate-200">
            রিফ্রেশ
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-10 grid place-items-center text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center">
              <History className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-1 text-xs text-slate-500">এখনও কোনো log নেই</p>
              <p className="text-[10px] text-slate-400">সব recipient একটি notice dismiss করলে এখানে দেখাবে</p>
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${
                    l.priority === "critical" ? "bg-rose-600" : l.priority === "warning" ? "bg-amber-600" : "bg-sky-600"
                  }`}>{l.priority.toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{l.title}</p>
                    <p className="text-[11px] text-slate-600 line-clamp-2 whitespace-pre-line">{l.body}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {l.dismissed_count}/{l.audience_count} দেখেছে
                  </span>
                  <time>{new Date(l.deleted_at).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}</time>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}



/* ---------------------------- Notice Card ---------------------------- */
function NoticeCard({
  notice, packages, onEdit, onDelete, onTogglePublish, onResend,
}: {
  notice: NoticeRow; packages: PackageOpt[];
  onEdit: () => void; onDelete: () => void; onTogglePublish: () => void; onResend: () => void;
}) {
  const priorityStyle: Record<NoticePriority, string> = {
    info: "from-sky-500 to-indigo-600",
    warning: "from-amber-500 to-orange-600",
    critical: "from-rose-500 to-red-600",
  };
  const pMap = useMemo(() => new Map(packages.map((p) => [p.id, p.name])), [packages]);
  const userTargets = Array.isArray((notice as any).target_user_ids) ? (notice as any).target_user_ids as string[] : [];
  const audience = notice.target_all_users
    ? "সব user"
    : userTargets.length > 0
    ? `${userTargets.length} জন নির্দিষ্ট user`
    : notice.target_package_ids.map((id) => pMap.get(id) ?? "?").join(", ") || "—";
  const Icon = notice.priority === "critical" ? AlertTriangle : notice.priority === "warning" ? Megaphone : Info;

  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200 shadow-soft">
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${priorityStyle[notice.priority]} text-white shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="bn-display text-base text-slate-900 truncate">{notice.title}</h3>
            {notice.published
              ? <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">PUBLISHED</span>
              : <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-bold">DRAFT</span>}
          </div>
          <p className="mt-1 text-xs text-slate-600 line-clamp-3 whitespace-pre-line">{notice.body}</p>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1"><Users className="h-3 w-3" /> {audience}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onTogglePublish}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow bg-gradient-to-r ${notice.published ? "from-slate-500 to-slate-700" : "from-emerald-500 to-green-600"}`}>
          {notice.published ? <><EyeOff className="h-3.5 w-3.5" /> আনপাবলিশ</> : <><Eye className="h-3.5 w-3.5" /> প্রকাশ</>}
        </button>
        {notice.published && (
          <button onClick={onResend} title="Telegram-এ পুনরায় পাঠান"
            className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100">
            <Send className="h-4 w-4" />
          </button>
        )}
        <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------- Form Modal ---------------------------- */
function NoticeFormModal({
  initial, packages, onClose, onSaved,
}: {
  initial: NoticeRow | null; packages: PackageOpt[];
  onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [priority, setPriority] = useState<NoticePriority>(initial?.priority ?? "info");
  const [allUsers, setAllUsers] = useState(initial?.target_all_users ?? false);
  const [pkgIds, setPkgIds] = useState<string[]>(initial?.target_package_ids ?? []);
  const [publishNow, setPublishNow] = useState(initial?.published ?? true);
  const [expiresAt, setExpiresAt] = useState<string>(initial?.expires_at ? initial.expires_at.slice(0, 10) : "");

  // Voice
  const [listening, setListening] = useState(false);
  const [voiceBuf, setVoiceBuf] = useState("");
  const [voiceErr, setVoiceErr] = useState<string | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const finalRef = useRef<string>("");

  const [improving, setImproving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveFn = useServerFn(saveNotice);
  const improveFn = useServerFn(improveNoticeText);

  function togglePkg(id: string) {
    setPkgIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function startVoice() {
    setVoiceErr(null);
    const rec = createRecognizer();
    if (!rec) {
      setVoiceErr("এই ব্রাউজারে voice recognition support নেই — Chrome/Edge ব্যবহার করুন");
      return;
    }
    finalRef.current = "";
    setVoiceBuf("");
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setVoiceBuf((finalRef.current + interim).trim());
    };
    rec.onerror = (e: any) => { setVoiceErr(`Voice error: ${e.error || "unknown"}`); setListening(false); };
    rec.onend = () => setListening(false);
    try { rec.start(); recRef.current = rec; setListening(true); }
    catch (err) { setVoiceErr((err as Error).message); }
  }
  function stopVoice() {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }
  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ignore */ } }, []);

  async function improveWithAI() {
    const raw = (voiceBuf || body || title).trim();
    if (!raw) { setError("কিছু লিখুন বা voice দিয়ে বলুন"); return; }
    setImproving(true); setError(null);
    try {
      const r = await improveFn({ data: { raw, priority } });
      if (r.title) setTitle(r.title);
      if (r.body) setBody(r.body);
      setVoiceBuf("");
    } catch (e) { setError((e as Error).message); }
    finally { setImproving(false); }
  }

  async function submit() {
    if (!title.trim() || !body.trim()) { setError("Title ও body আবশ্যক"); return; }
    if (!allUsers && pkgIds.length === 0) { setError("অন্তত একটি package select করুন অথবা 'সব user' চিহ্নিত করুন"); return; }
    setSaving(true); setError(null);
    try {
      const r = await saveFn({ data: {
        id: initial?.id ?? null,
        title: title.trim(),
        body: body.trim(),
        priority,
        target_package_ids: pkgIds,
        target_all_users: allUsers,
        published: publishNow,
        expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
      }});
      if (publishNow) {
        const tg = r.telegram;
        if (tg && tg.recipients > 0) {
          toast.success(`Telegram-এ ${tg.sent}/${tg.recipients} জনকে notice পাঠানো হয়েছে${tg.failed ? ` (${tg.failed} ব্যর্থ)` : ""}`);
        } else {
          toast.message("Notice সংরক্ষিত — Telegram-সংযুক্ত কোনো recipient পাওয়া যায়নি");
        }
      }
      onSaved();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end sm:place-items-center bg-slate-900/50 backdrop-blur-sm px-2 py-2 sm:p-6">
      <div className="w-full sm:max-w-2xl max-h-[95vh] rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-fuchsia-50 via-rose-50 to-amber-50">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-rose-600 text-white"><Megaphone className="h-4 w-4" /></div>
            <h2 className="bn-display text-base">{initial ? "নোটিশ Edit করুন" : "নতুন নোটিশ"}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* AI Generated Content */}
          <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-rose-50 to-amber-50 p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-rose-600 text-white shadow">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">AI Generated Content</p>
                  <p className="text-[10px] text-slate-500 leading-tight">বিষয় লিখুন বা voice দিয়ে বলুন — Lovable AI notice সাজিয়ে দিবে</p>
                </div>
              </div>
              {!listening ? (
                <button type="button" onClick={startVoice}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white px-3 py-1.5 text-xs font-bold shadow">
                  <Mic className="h-3.5 w-3.5" /> Voice
                </button>
              ) : (
                <button type="button" onClick={stopVoice}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs font-bold shadow animate-pulse">
                  <MicOff className="h-3.5 w-3.5" /> থামান
                </button>
              )}
            </div>
            <textarea
              value={voiceBuf}
              onChange={(e) => setVoiceBuf(e.target.value)}
              placeholder={listening ? "শুনছি... বাংলায় বলুন" : "উদাহরণ: আগামীকাল সকাল ১০টা থেকে দুপুর ২টা পর্যন্ত maintenance-এর কারণে withdraw বন্ধ থাকবে"}
              rows={3}
              className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            />
            {voiceErr && <p className="mt-1 text-[11px] text-rose-600">{voiceErr}</p>}
            <button type="button" onClick={improveWithAI} disabled={improving}
              className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-600 text-white px-3 py-2 text-sm font-bold shadow disabled:opacity-60">
              {improving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {improving ? "AI তৈরি করছে..." : "AI দিয়ে notice তৈরি করুন"}
            </button>
          </div>


          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700">শিরোনাম</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-bold text-slate-700">নোটিশ (বিস্তারিত)</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm whitespace-pre-line" />
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-bold text-slate-700">Priority</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(["info", "warning", "critical"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold ring-1 transition ${priority === p
                    ? p === "critical" ? "bg-rose-600 text-white ring-rose-600" : p === "warning" ? "bg-amber-500 text-white ring-amber-500" : "bg-sky-600 text-white ring-sky-600"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                  {p === "info" ? "সাধারণ" : p === "warning" ? "সতর্কতা" : "জরুরি"}
                </button>
              ))}
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs font-bold text-slate-700">কাদের জন্য?</label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allUsers} onChange={(e) => setAllUsers(e.target.checked)} />
              <span>সব user (সবাই এই notice দেখবে)</span>
            </label>
            {!allUsers && (
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50">
                {packages.length === 0 && <p className="col-span-2 text-xs text-slate-500 p-2">কোনো package পাওয়া যায়নি</p>}
                {packages.map((p) => (
                  <label key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer ${pkgIds.includes(p.id) ? "bg-fuchsia-100 text-fuchsia-900 font-bold" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
                    <input type="checkbox" checked={pkgIds.includes(p.id)} onChange={() => togglePkg(p.id)} />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">মেয়াদ শেষের তারিখ (ঐচ্ছিক)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
              <p className="mt-1 text-[10px] text-slate-400">উক্ত তারিখের রাত ১১:৫৯ পর্যন্ত notice দেখানো হবে</p>
            </div>

            <label className="flex items-end gap-2 text-sm pb-1">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              <span>এখনই publish করুন</span>
            </label>
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-200 text-slate-700 px-3 py-2 text-sm font-bold">বাতিল</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-rose-600 text-white px-3 py-2 text-sm font-bold shadow disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {initial ? "আপডেট করুন" : "সংরক্ষণ করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}
