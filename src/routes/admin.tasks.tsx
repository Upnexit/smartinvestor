import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, Pencil, Trash2, X, Save, Sparkles, Loader2, Wand2, Mic, MicOff, Search, Package as PackageIcon, ChevronRight } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, ConfirmDeleteModal, StatTile, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { saveTask, deleteTask, subscribeTable } from "@/lib/admin-client";
import { useAdminAutoRefresh } from "@/lib/admin-refresh";
import { useServerFn } from "@tanstack/react-start";
import { generateTaskDescription } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tasks")({
  head: () => ({ meta: [{ title: "টাস্ক লিংক — Admin" }] }),
  component: TasksPage,
});

type Task = {
  id: string; title: string; link_url: string; reward: number; category: string | null;
  action_type: string; daily_limit: number; active: boolean; description: string | null;
  required_package_id: string | null;
  is_draft?: boolean; scheduled_date?: string | null;
};
type Pkg = { id: string; name: string; price: number; active: boolean };

const EMPTY: Task = {
  id: "", title: "", link_url: "", reward: 5, category: "facebook", action_type: "like",
  daily_limit: 1, active: true, description: null, required_package_id: null,
};

const CATEGORIES = [
  { v: "facebook", label: "Facebook" },
  { v: "instagram", label: "Instagram" },
  { v: "tiktok", label: "TikTok" },
  { v: "youtube", label: "YouTube" },
  { v: "twitter", label: "Twitter/X" },
  { v: "whatsapp", label: "WhatsApp" },
  { v: "telegram", label: "Telegram" },
  { v: "other", label: "অন্যান্য" },
];
const ACTIONS = [
  { v: "like", label: "Like" },
  { v: "comment", label: "Comment" },
  { v: "share", label: "Share" },
  { v: "view", label: "View" },
  { v: "follow", label: "Follow" },
  { v: "subscribe", label: "Subscribe" },
];

const TITLE_PRESETS: Record<string, string[]> = {
  facebook: ["Facebook পেজে লাইক দিন", "Facebook পোস্টে কমেন্ট করুন", "Facebook পোস্ট শেয়ার করুন", "Facebook ভিডিও দেখুন"],
  instagram: ["Instagram প্রোফাইল ফলো করুন", "Instagram পোস্টে লাইক দিন", "Instagram রিলে কমেন্ট করুন"],
  tiktok: ["TikTok ভিডিওতে লাইক দিন", "TikTok অ্যাকাউন্ট ফলো করুন", "TikTok ভিডিও শেয়ার করুন"],
  youtube: ["YouTube ভিডিও দেখুন", "YouTube চ্যানেল সাবস্ক্রাইব করুন", "YouTube ভিডিওতে লাইক দিন"],
  twitter: ["Twitter পোস্টে লাইক দিন", "Twitter অ্যাকাউন্ট ফলো করুন"],
  whatsapp: ["WhatsApp গ্রুপে জয়েন করুন"],
  telegram: ["Telegram চ্যানেলে জয়েন করুন"],
  other: ["ওয়েবসাইট ভিজিট করুন", "লিংকে ক্লিক করুন"],
};

function TasksPage() {
  const [rows, setRows] = useState<Task[] | null>(null);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [stats, setStats] = useState<{ done: number; paid: number } | null>(null);
  const [edit, setEdit] = useState<Task | null>(null);
  const [del, setDel] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "draft" | "today">("all");
  const genDesc = useServerFn(generateTaskDescription);

  const refresh = async () => {
    const [{ data, error }, { data: pkgs }] = await Promise.all([
      supabase.from("link_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("packages").select("id,name,price,active").eq("active", true).order("price"),
    ]);
    if (error) { setRows([]); setStats({ done: 0, paid: 0 }); return; }
    setRows((data ?? []) as unknown as Task[]);
    setPackages((pkgs ?? []) as Pkg[]);
    const today = new Date(); today.setHours(0,0,0,0);
    const { data: subs } = await supabase.from("task_submissions").select("status, link_tasks(reward)")
      .eq("status", "approved").gte("created_at", today.toISOString());
    const done = subs?.length ?? 0;
    const paid = (subs ?? []).reduce((s: number, r: { link_tasks: { reward: number } | null }) => s + Number(r.link_tasks?.reward ?? 0), 0);
    setStats({ done, paid });
  };
  const adminReady = useAdminAutoRefresh(refresh);

  useEffect(() => {
    if (!adminReady) return;
    const offTasks = subscribeTable("link_tasks", refresh);
    const offSubs = subscribeTable("task_submissions", refresh);
    return () => { offTasks(); offSubs(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminReady]);

  const totals = useMemo(() => ({
    total: rows?.length ?? 0,
    active: rows?.filter((r) => r.active && !r.is_draft).length ?? 0,
  }), [rows]);

  const today = useMemo(() => {
    const now = new Date();
    const bd = new Date(now.getTime() + 6 * 3600_000 + now.getTimezoneOffset() * 60_000);
    return bd.toISOString().slice(0, 10);
  }, []);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && (!r.active || r.is_draft)) return false;
      if (filter === "inactive" && r.active && !r.is_draft) return false;
      if (filter === "draft" && !r.is_draft) return false;
      if (filter === "today" && r.scheduled_date !== today) return false;
      if (!q) return true;
      return (r.title ?? "").toLowerCase().includes(q)
        || (r.link_url ?? "").toLowerCase().includes(q)
        || String(r.reward).includes(q)
        || (r.category ?? "").toLowerCase().includes(q)
        || (r.action_type ?? "").toLowerCase().includes(q);
    });
  }, [rows, search, filter, today]);

  const pkgTaskCounts = useMemo(() => {
    const m = new Map<string, { total: number; todayActive: number }>();
    (rows ?? []).forEach((r) => {
      const key = r.required_package_id ?? "";
      const cur = m.get(key) ?? { total: 0, todayActive: 0 };
      cur.total += 1;
      if (r.active && !r.is_draft && r.scheduled_date === today) cur.todayActive += 1;
      m.set(key, cur);
    });
    return m;
  }, [rows, today]);

  const pkgLabel = (id: string | null) =>
    !id ? "সব প্যাকেজ" : (packages.find((p) => p.id === id)?.name ?? "প্যাকেজ");


  const handleSave = async () => {
    if (!edit) return;
    if (!edit.title || !edit.link_url) { toast.error("টাইটেল ও URL দরকার"); return; }
    setBusy(true);
    try {
      await saveTask(edit.id || null, {
        title: edit.title, link_url: edit.link_url, reward: edit.reward,
        category: edit.category, action_type: edit.action_type,
        daily_limit: edit.daily_limit, active: edit.active, description: edit.description,
        required_package_id: edit.required_package_id,
      });
      toast.success("সেভ হয়েছে"); setEdit(null); refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };
  const handleDel = async () => {
    if (!del) return;
    setBusy(true);
    try { await deleteTask(del.id); toast.success("ডিলিট"); setDel(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(false); }
  };
  const toggle = async (t: Task) => {
    try { await saveTask(t.id, { active: !t.active }); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
  };

  const runAI = async () => {
    if (!edit) return;
    if (!edit.title.trim()) { toast.error("প্রথমে টাইটেল লিখুন"); return; }
    setAiBusy(true);
    const tId = toast.loading("AI বিবরণ তৈরি করছে…");
    try {
      const res = await genDesc({ data: {
        title: edit.title, category: edit.category ?? "", action_type: edit.action_type,
        hint: edit.description ?? "", url: edit.link_url,
      }});
      setEdit({ ...edit, description: res.description });
      toast.success("AI বিবরণ যোগ হয়েছে", { id: tId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI ব্যর্থ", { id: tId });
    } finally { setAiBusy(false); }
  };

  return (
    <>
      <AdminPageHeader accent="rose" Icon={Link2} title="টাস্ক লিংক ম্যানেজমেন্ট"
        subtitle="লাইক ও কমেন্ট টাস্ক পরিচালনা"
        action={<GradientButton accent="rose" onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> নতুন টাস্ক</GradientButton>} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="মোট টাস্ক" value={totals.total} accent="rose" Icon={Link2} />
        <StatTile label="অ্যাক্টিভ" value={totals.active} accent="emerald" Icon={Link2} />
        <StatTile label="আজকের কাজ" value={stats?.done ?? "—"} accent="amber" Icon={Link2} />
        <StatTile label="আজ পেমেন্ট ৳" value={stats?.paid ?? "—"} accent="fuchsia" Icon={Link2} />
      </div>

      {!adminReady || !rows ? <Shimmer className="h-32" /> : rows.length === 0 ? (
        <EmptyState Icon={Link2} title="কোনো টাস্ক নেই" accent="rose"
          action={<GradientButton accent="rose" onClick={() => setEdit({ ...EMPTY })}><Plus className="h-4 w-4" /> তৈরি করুন</GradientButton>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => (
            <AdminCard key={t.id} accent="rose" interactive className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="bn-display text-base text-slate-900 line-clamp-2">{t.title}</p>
                <button onClick={() => toggle(t)} className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase text-white",
                  t.active ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-600",
                )}>{t.active ? "ON" : "OFF"}</button>
              </div>
              <a href={t.link_url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-sky-600 hover:underline">{t.link_url}</a>
              <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                <span className="bn-display text-xl bg-gradient-to-br from-rose-600 to-red-600 bg-clip-text text-transparent">৳{t.reward}</span>
                <span className="text-[11px] text-slate-500">• {t.daily_limit}/দিন</span>
                {t.category && <span className="text-[10px] uppercase rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{t.category}</span>}
                {t.action_type && <span className="text-[10px] uppercase rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">{t.action_type}</span>}
                <span className="text-[10px] rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">📦 {pkgLabel(t.required_package_id)}</span>
              </div>
              <div className="mt-3 flex gap-1 justify-end">
                <SoftButton onClick={() => setEdit({ ...t })}><Pencil className="h-3.5 w-3.5" /></SoftButton>
                <SoftButton accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => setDel(t)}><Trash2 className="h-3.5 w-3.5" /></SoftButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg">{edit.id ? "এডিট" : "নতুন টাস্ক"}</h3>
              <button onClick={() => setEdit(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-3">
              {/* Category + Package */}
              <div className="grid grid-cols-2 gap-2">
                <Select label="ক্যাটাগরি" value={edit.category ?? "facebook"}
                  onChange={(v) => setEdit({ ...edit, category: v })}
                  options={CATEGORIES.map((c) => ({ value: c.v, label: c.label }))} />
                <Select label="প্যাকেজ (কারা দেখবে)" value={edit.required_package_id ?? ""}
                  onChange={(v) => setEdit({ ...edit, required_package_id: v || null })}
                  options={[{ value: "", label: "সব active প্যাকেজ" },
                    ...packages.map((p) => ({ value: p.id, label: `${p.name} — ৳${p.price}` }))]} />
              </div>

              {/* Action type */}
              <Select label="অ্যাকশন টাইপ" value={edit.action_type}
                onChange={(v) => setEdit({ ...edit, action_type: v })}
                options={ACTIONS.map((a) => ({ value: a.v, label: a.label }))} />

              {/* URL */}
              <F label="টাস্ক URL" value={edit.link_url} onChange={(v) => setEdit({ ...edit, link_url: v })} />

              {/* Title with presets */}
              <div>
                <VoiceInputField label="টাস্ক টাইটেল" value={edit.title}
                  onChange={(v) => setEdit({ ...edit, title: v })} />

                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(TITLE_PRESETS[edit.category ?? "facebook"] ?? []).map((p) => (
                    <button key={p} type="button" onClick={() => setEdit({ ...edit, title: p })}
                      className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <F label="রিওয়ার্ড ৳" type="number" value={String(edit.reward)} onChange={(v) => setEdit({ ...edit, reward: Number(v) })} />
                <F label="দৈনিক লিমিট" type="number" value={String(edit.daily_limit)} onChange={(v) => setEdit({ ...edit, daily_limit: Number(v) })} />
              </div>

              {/* Description with AI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">বিস্তারিত কাজের বিবরণ</span>
                  <button type="button" onClick={runAI} disabled={aiBusy}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:scale-[1.03] transition disabled:opacity-60">
                    {aiBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    AI দিয়ে তৈরি করুন
                    <Sparkles className="h-3 w-3" />
                  </button>
                </div>
                <textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  rows={7} placeholder="এখানে সংক্ষেপে লিখুন — উপরের AI বাটনে ক্লিক করলে বিস্তারিত ধাপ তৈরি হবে।"
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 leading-relaxed" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setEdit(null)}>বাতিল</SoftButton>
              <GradientButton accent="rose" className="flex-1" busy={busy} onClick={handleSave}><Save className="h-4 w-4" /> সেভ</GradientButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal open={!!del} onClose={() => setDel(null)} busy={busy} onConfirm={handleDel}
        title="টাস্ক ডিলিট?" body={<>{del?.title} মুছে যাবে</>} />
    </>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400" />
    </label>
  );
}

type SRResult = { isFinal: boolean; 0: { transcript: string } };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SRInstance = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SRCtor = new () => SRInstance;

function VoiceInputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [listening, setListening] = useState(false);
  const recRef = (useMemo(() => ({ current: null as SRInstance | null }), []));

  const toggle = () => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) { toast.error("এই ব্রাউজারে ভয়েস ইনপুট সাপোর্ট নেই (Chrome ব্যবহার করুন)"); return; }
    if (listening) { recRef.current?.stop(); return; }
    try {
      const rec = new Ctor();
      rec.lang = "bn-BD";
      rec.continuous = false;
      rec.interimResults = true;
      const base = value;
      rec.onresult = (e) => {
        let finalT = "", interimT = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalT += r[0].transcript;
          else interimT += r[0].transcript;
        }
        const combined = (base + " " + (finalT || interimT)).trim();
        onChange(combined);
      };
      rec.onerror = (ev) => {
        toast.error(`ভয়েস: ${ev.error ?? "ব্যর্থ"}`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
      toast.success("শুনছি… এখন বাংলায় বলুন");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ভয়েস শুরু ব্যর্থ");
      setListening(false);
    }
  };

  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <div className="relative">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-rose-200 bg-white pl-3 pr-11 py-2 text-sm outline-none focus:border-rose-400" />
        <button type="button" onClick={toggle} title="ভয়েস দিয়ে টাইটেল দিন"
          className={cn(
            "absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-white shadow-sm transition",
            listening
              ? "bg-gradient-to-br from-rose-500 to-red-600 animate-pulse"
              : "bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 hover:scale-105",
          )}>
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
