import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, MessageCircle, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "কমিউনিটি — Smart Investor" }] }),
  component: CommunityPage,
});

type Msg = {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  author?: { full_name: string | null; user_code: string };
};

function CommunityPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);

      const { data: msgs } = await supabase
        .from("community_messages")
        .select("id,user_id,content,created_at")
        .order("created_at", { ascending: true })
        .limit(100);

      const list = (msgs ?? []) as Msg[];
      const ids = Array.from(new Set(list.map((m) => m.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles").select("id,full_name,user_code").in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p]));
        list.forEach((m) => { m.author = (map.get(m.user_id) as any) ?? undefined; });
      }
      setMessages(list);
      setLoading(false);
      scrollDown();
    })();

    const channel = supabase
      .channel("community_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const m = payload.new as Msg;
        const { data: prof } = await supabase.from("profiles").select("id,full_name,user_code").eq("id", m.user_id).maybeSingle();
        if (prof) m.author = prof as any;
        setMessages((prev) => [...prev, m]);
        scrollDown();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleSend() {
    if (!me || !text.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("community_messages").insert({
        user_id: me, content: text.trim(),
      });
      if (error) throw error;
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "পাঠানো ব্যর্থ");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] flex-col -mx-4 sm:mx-0 sm:rounded-3xl sm:ring-1 sm:ring-slate-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="bn-display text-lg">কমিউনিটি চ্যাট</h1>
            <p className="text-xs text-white/85 inline-flex items-center gap-1"><Users className="h-3 w-3" /> Smart Investor কমিউনিটি — শ্রদ্ধাশীল থাকুন</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4 space-y-3">
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-cyan-500" /></div>
        ) : messages.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <MessageCircle className="h-10 w-10 text-slate-300" />
            <p className="bn-display mt-2 text-base text-slate-700">প্রথম মেসেজটি আপনিই দিন!</p>
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
              <div className={cn("max-w-[78%]")}>
                <div className={cn("flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5", mine && "justify-end")}>
                  <span className="font-semibold">{mine ? "আপনি" : name}</span>
                  <span>·</span>
                  <span>{new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                  mine
                    ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-sm"
                    : "bg-white ring-1 ring-slate-200 text-slate-800 rounded-bl-sm",
                )}>
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
            placeholder="মেসেজ লিখুন…"
            className="flex-1 max-h-32 resize-none rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md disabled:opacity-40 hover:scale-105 transition"
            aria-label="পাঠান"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
