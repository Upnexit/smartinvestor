import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Send, MessageCircle, Loader2, Users, Mic, Square, Image as ImageIcon,
  Sparkles, Play, Pause,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { askSmartAI } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "কমিউনিটি — Smart Investor" }] }),
  component: CommunityPage,
});

type Msg = {
  id: string;
  user_id: string;
  content: string | null;
  voice_url: string | null;
  voice_duration_ms: number | null;
  image_url: string | null;
  created_at: string;
  author?: { full_name: string | null; user_code: string };
};

type AIMsg = { id: string; role: "user" | "assistant"; content: string };

const BUCKET = "community-voice";

const AI_SUGGESTIONS = [
  "Smart Investor কীভাবে কাজ করে?",
  "প্যাকেজ কিনে কত আয় হবে?",
  "উইথড্র কীভাবে করবো?",
  "রেফার করে কত কমিশন পাবো?",
  "৩০০ টাকা bonus কীভাবে আনলক হবে?",
];

const COMMUNITY_SUGGESTIONS = [
  "সবাইকে শুভেচ্ছা! 🌸",
  "কেউ কি আজকের টাস্ক complete করেছেন?",
  "কোন প্যাকেজটি best আপনাদের মতে?",
  "Withdraw কতক্ষণে আসে?",
];

async function uploadAndSign(file: Blob, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) { toast.error(error.message); return null; }
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}

function CommunityPage() {
  const [tab, setTab] = useState<"ai" | "chat">("ai");

  return (
    <div
      className="fixed inset-x-0 z-20 overflow-hidden bg-gradient-to-br from-slate-50 to-white flex flex-col
                 top-[57px] bottom-[calc(72px+env(safe-area-inset-bottom))]
                 lg:left-72 lg:top-0 lg:bottom-0 lg:right-0"
    >
      {/* Mobile toggle */}
      <div className="lg:hidden shrink-0 p-2 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setTab("ai")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition",
              tab === "ai"
                ? "bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow"
                : "text-slate-600",
            )}
          >
            <Sparkles className="h-4 w-4" /> Smart AI
          </button>
          <button
            onClick={() => setTab("chat")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition",
              tab === "chat"
                ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow"
                : "text-slate-600",
            )}
          >
            <MessageCircle className="h-4 w-4" /> কমিউনিটি
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid gap-3 p-2 sm:p-3 lg:grid-cols-2">
        <div className={cn("min-h-0 h-full", tab === "ai" ? "block" : "hidden", "lg:block")}>
          <AIChatPanel />
        </div>
        <div className={cn("min-h-0 h-full", tab === "chat" ? "block" : "hidden", "lg:block")}>
          <CommunityChatPanel />
        </div>
      </div>
    </div>
  );
}

/* =================== AI CHAT =================== */
function AIChatPanel() {
  const ask = useServerFn(askSmartAI);
  const [msgs, setMsgs] = useState<AIMsg[]>([
    { id: "w", role: "assistant", content: "নমস্কার! আমি Smart AI 🤖 — Smart Investor সম্পর্কে যেকোনো প্রশ্ন করুন।" },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const showSuggestions = msgs.length <= 1;

  function down() { requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" })); }
  useEffect(() => { down(); }, [msgs]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const user: AIMsg = { id: crypto.randomUUID(), role: "user", content };
    const next = [...msgs, user];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const { reply } = await ask({ data: { messages: next.map(({ role, content }) => ({ role, content })) } });
      setMsgs((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI ব্যর্থ");
    } finally { setBusy(false); }
  }

  async function handleImage(file: File) {
    await send(`[ছবি সংযুক্ত: ${file.name}] এই ছবি সম্পর্কে আমাকে গাইড দিন।`);
  }

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-soft min-h-0">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-600 p-3 text-white">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="bn-display text-base leading-tight">Smart AI সহকারী</h2>
          <p className="text-[11px] text-white/85">২৪/৭ সাহায্য — বাংলা ও ইংরেজি</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-fuchsia-50/40 to-white">
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "user"
                ? "bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-white rounded-br-sm shadow-md"
                : "bg-white ring-1 ring-slate-200 text-slate-800 rounded-bl-sm",
            )}>{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> ভাবছি…</div>
        )}

        {showSuggestions && (
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">পরামর্শকৃত প্রশ্ন</p>
            <div className="flex flex-wrap gap-1.5">
              {AI_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs text-fuchsia-700 ring-1 ring-fuchsia-200 hover:bg-fuchsia-50 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Composer
        text={text}
        setText={setText}
        onSend={() => send(text)}
        onImage={handleImage}
        disabled={busy}
        accentFrom="from-fuchsia-500"
        accentTo="to-indigo-600"
        placeholder="AI কে জিজ্ঞেস করুন…"
      />
    </section>
  );
}

/* =================== COMMUNITY =================== */
function CommunityChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  function down() { requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" })); }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);

      const { data: msgs } = await supabase
        .from("community_messages")
        .select("id,user_id,content,voice_url,voice_duration_ms,image_url,created_at")
        .order("created_at", { ascending: true }).limit(100);

      const list = (msgs ?? []) as Msg[];
      const ids = Array.from(new Set(list.map((m) => m.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,user_code").in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p]));
        list.forEach((m) => { m.author = (map.get(m.user_id) as Msg["author"]) ?? undefined; });
      }
      setMessages(list);
      setLoading(false);
      down();
    })();

    const channel = supabase
      .channel("community_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const m = payload.new as Msg;
        const { data: prof } = await supabase.from("profiles").select("id,full_name,user_code").eq("id", m.user_id).maybeSingle();
        if (prof) m.author = prof as Msg["author"];
        setMessages((prev) => [...prev, m]);
        down();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  type InsertMsg = { content?: string | null; voice_url?: string | null; voice_duration_ms?: number | null; image_url?: string | null };
  async function postMessage(payload: InsertMsg) {
    if (!me) return;
    setSending(true);
    try {
      const { error } = await supabase.from("community_messages").insert({ user_id: me, ...payload });
      if (error) throw error;
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "পাঠানো ব্যর্থ");
    } finally { setSending(false); }
  }

  async function handleImage(file: File) {
    if (!me) return;
    const url = await uploadAndSign(file, `images/${me}/${Date.now()}.${file.name.split(".").pop() || "png"}`);
    if (url) await postMessage({ image_url: url });
  }

  const showSuggestions = !loading && messages.length === 0;

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-soft min-h-0">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 p-3 text-white">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="bn-display text-base leading-tight">কমিউনিটি চ্যাট</h2>
          <p className="text-[11px] text-white/85 inline-flex items-center gap-1"><Users className="h-3 w-3" /> সকল সদস্য</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-slate-50 to-white">
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /></div>
        ) : messages.length === 0 ? (
          <div className="grid place-items-center py-10 text-center">
            <MessageCircle className="h-10 w-10 text-slate-300" />
            <p className="bn-display mt-2 text-sm text-slate-700">প্রথম মেসেজটি আপনিই দিন!</p>
          </div>
        ) : messages.map((m) => {
          const mine = m.user_id === me;
          const name = m.author?.full_name || m.author?.user_code || "User";
          const initial = (m.author?.full_name ?? "?")[0]?.toUpperCase() ?? "U";
          return (
            <div key={m.id} className={cn("flex gap-2 items-end", mine ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
                mine ? "bg-gradient-to-br from-cyan-500 to-blue-600" : "bg-gradient-to-br from-rose-400 to-pink-500",
              )}>{initial}</div>
              <div className="max-w-[80%]">
                <div className={cn("flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5", mine && "justify-end")}>
                  <span className="font-semibold">{mine ? "আপনি" : name}</span>
                  <span>·</span>
                  <span>{new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className={cn(
                  "rounded-2xl px-3 py-2 text-sm shadow-sm overflow-hidden",
                  mine ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm"
                       : "bg-white ring-1 ring-slate-200 text-slate-800 rounded-bl-sm",
                )}>
                  {m.image_url && (
                    <img src={m.image_url} alt="" className="mb-1 max-h-56 rounded-xl" />
                  )}
                  {m.voice_url && (
                    <VoicePlayer url={m.voice_url} ms={m.voice_duration_ms ?? 0} mine={mine} />
                  )}
                  {m.content && <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>}
                </div>
              </div>
            </div>
          );
        })}

        {showSuggestions && (
          <div className="pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">দ্রুত শুরু করুন</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {COMMUNITY_SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => postMessage({ content: q })}
                  className="rounded-full bg-white px-3 py-1.5 text-xs text-cyan-700 ring-1 ring-cyan-200 hover:bg-cyan-50 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Composer
        text={text}
        setText={setText}
        onSend={() => text.trim() && postMessage({ content: text.trim() })}
        onImage={handleImage}
        disabled={sending}
        accentFrom="from-cyan-500"
        accentTo="to-blue-600"
        placeholder="মেসেজ লিখুন বা মাইকে বলুন…"
      />
    </section>
  );
}

/* =================== COMPOSER (with real-time STT dictation) =================== */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function Composer({
  text, setText, onSend, onImage, disabled,
  accentFrom, accentTo, placeholder,
}: {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  onImage: (f: File) => void | Promise<void>;
  disabled?: boolean;
  accentFrom: string;
  accentTo: string;
  placeholder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef<string>("");
  const [listening, setListening] = useState(false);

  function startDictation() {
    const SR = getSpeechRecognition();
    if (!SR) { toast.error("আপনার ব্রাউজার voice → text সাপোর্ট করে না"); return; }
    try {
      const r = new SR();
      r.lang = "bn-BD";
      r.continuous = true;
      r.interimResults = true;
      baseRef.current = text ? text + " " : "";
      r.onresult = (e) => {
        let finalT = "";
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const transcript = res[0]?.transcript ?? "";
          if (res.isFinal) finalT += transcript; else interim += transcript;
        }
        if (finalT) baseRef.current += finalT + " ";
        setText((baseRef.current + interim).trimStart());
      };
      r.onerror = (ev) => {
        if (ev.error && ev.error !== "no-speech" && ev.error !== "aborted") toast.error("মাইক: " + ev.error);
      };
      r.onend = () => setListening(false);
      r.start();
      recRef.current = r;
      setListening(true);
    } catch {
      toast.error("মাইক চালু করা যায়নি");
    }
  }

  function stopDictation() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }

  return (
    <div className="border-t border-slate-200 bg-white p-2.5">
      {listening && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-rose-50 px-3 py-1.5 ring-1 ring-rose-200">
          <span className="inline-flex items-center gap-2 text-xs text-rose-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> শুনছি… কথা বলুন
          </span>
          <button onClick={stopDictation} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white">
            <Square className="h-3 w-3" /> থামান
          </button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40"
          aria-label="ছবি"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) { onImage(f); e.target.value = ""; } }} />
        <button
          onClick={listening ? stopDictation : startDictation}
          disabled={disabled}
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white disabled:opacity-40 transition",
            listening ? "bg-rose-600 animate-pulse" : "bg-gradient-to-br from-emerald-500 to-teal-600",
          )}
          aria-label="ভয়েস থেকে টেক্সট"
          title="মাইকে বলুন — text এ convert হবে"
        >
          {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          rows={1}
          placeholder={placeholder}
          className="flex-1 max-h-32 resize-none rounded-xl border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          onClick={onSend}
          disabled={disabled || !text.trim()}
          className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md disabled:opacity-40 hover:scale-105 transition bg-gradient-to-br", accentFrom, accentTo)}
          aria-label="পাঠান"
        >
          {disabled ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function VoicePlayer({ url, ms, mine }: { url: string; ms: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const secs = Math.max(1, Math.round(ms / 1000));
  function toggle() {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  }
  return (
    <div className="flex items-center gap-2 mb-1">
      <button onClick={toggle} className={cn("grid h-8 w-8 place-items-center rounded-full", mine ? "bg-white/20" : "bg-slate-100")}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className={cn("h-1 flex-1 rounded-full", mine ? "bg-white/30" : "bg-slate-200")}>
        <div className={cn("h-full w-full rounded-full", mine ? "bg-white" : "bg-cyan-500")} />
      </div>
      <span className={cn("text-[11px] font-mono", mine ? "text-white/85" : "text-slate-500")}>{secs}s</span>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} className="hidden" />
    </div>
  );
}
