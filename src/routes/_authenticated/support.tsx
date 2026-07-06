import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessagesSquare, Send, Loader2, LifeBuoy, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

type Msg = { id: string; user_id: string; sender: "user" | "admin"; body: string; created_at: string };

function SupportPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("support_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
      setMessages((data as Msg[]) ?? []);
    })();
    const ch = supabase.channel(`support-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` }, (p) => {
        setMessages((m) => [...m, p.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || !userId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({ user_id: userId, sender: "user", body });
      if (error) throw error;
      setText("");
    } finally { setSending(false); }
  };

  const toggleVoice = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("এই ব্রাউজারে ভয়েস রিকগনিশন সমর্থিত নয়"); return; }
    if (listening) { recogRef.current?.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "bn-BD"; r.interimResults = true; r.continuous = false;
    r.onresult = (e: any) => {
      let out = "";
      for (let i = e.resultIndex; i < e.results.length; i++) out += e.results[i][0].transcript;
      setText((prev) => (prev ? prev + " " : "") + out);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r; r.start(); setListening(true);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="bn-display text-xl text-slate-900">সাপোর্ট সেন্টার</h1>
          <p className="text-xs text-slate-500">অ্যাডমিনের সাথে সরাসরি রিয়েল-টাইম চ্যাট</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-white">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <MessagesSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="bn-display text-base leading-none">অ্যাডমিন সাপোর্ট</p>
            <p className="text-[11px] text-white/85 mt-1">শুধুমাত্র আপনি এবং অ্যাডমিন দেখতে পারবেন</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] font-bold ring-1 ring-emerald-300/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> LIVE
          </span>
        </div>

        <div ref={scrollRef} className="h-[460px] overflow-y-auto bg-gradient-to-b from-amber-50/30 to-white px-4 py-3 space-y-2">
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center px-4">
              <div>
                <p className="bn-display text-base text-slate-700">এখনও কোনো বার্তা নেই</p>
                <p className="text-xs text-slate-500 mt-1">নিচে লিখে বা ভয়েসে বার্তা পাঠান</p>
              </div>
            </div>
          ) : messages.map((m) => (
            <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                m.sender === "user"
                  ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-br-sm"
                  : "bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-sm")}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={cn("text-[9px] mt-1", m.sender === "user" ? "text-white/70" : "text-slate-400")}>
                  {new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
          <button onClick={toggleVoice} aria-label="ভয়েস" className={cn(
            "grid h-10 w-10 place-items-center rounded-xl ring-1 transition",
            listening ? "bg-rose-500 text-white ring-rose-400 animate-pulse" : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100"
          )}>
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="অ্যাডমিন-কে বার্তা লিখুন..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-300/40"
          />
          <button onClick={send} disabled={sending || !text.trim()}
            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/30 hover:scale-[1.03] transition disabled:opacity-60 disabled:hover:scale-100">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
