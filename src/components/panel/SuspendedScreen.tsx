import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, MessagesSquare, Send, LogOut, Mail, Loader2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Msg = { id: string; user_id: string; sender: "user" | "admin"; body: string; created_at: string };

export function SuspendedScreen({ userId, reason }: { userId: string; reason: string | null }) {
  const site = useSiteSettings();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase.from("support_messages").select("*").eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
    setMessages((data as Msg[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`support-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` }, (p) => {
        setMessages((m) => [...m, p.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({ user_id: userId, sender: "user", body });
      if (error) throw error;
      setText("");
    } finally { setSending(false); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-rose-100 px-3 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        {/* Guardian header card */}
        <div className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur shadow-2xl ring-1 ring-rose-200">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/40 ring-2 ring-white">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-600">{site.site_name} · Account Notice</p>
                <h1 className="bn-display text-2xl sm:text-3xl text-slate-900 mt-1">আপনার অ্যাকাউন্টটি সাসপেন্ড করা হয়েছে</h1>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  নিরাপত্তা বা নীতিগত কারণে আপনার অ্যাকাউন্টে সাময়িকভাবে প্রবেশ সীমাবদ্ধ করা হয়েছে। অনুগ্রহ করে নিচের চ্যাটে অ্যাডমিন-এর সাথে যোগাযোগ করুন; আমাদের টিম দ্রুত আপনার সাথে যোগাযোগ করবে।
                </p>
                {reason && (
                  <div className="mt-3 rounded-xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">কারণ</p>
                    <p className="text-sm text-rose-800 mt-0.5">{reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href="mailto:support@smartinvestor.bd" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition">
                <Mail className="h-4 w-4" /> অ্যাডমিন ইমেইল
              </a>
              <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition">
                <LogOut className="h-4 w-4" /> লগআউট
              </button>
            </div>
          </div>
        </div>

        {/* Admin chat */}
        <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-rose-100">
          <div className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="bn-display text-base leading-none">অ্যাডমিন সাপোর্ট চ্যাট</p>
              <p className="text-[11px] text-white/85 mt-1">রিয়েল-টাইম · শুধুমাত্র আপনি এবং অ্যাডমিন দেখতে পারবেন</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/30 px-2 py-0.5 text-[10px] font-bold ring-1 ring-emerald-300/50">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" /> LIVE
            </span>
          </div>

          <div ref={scrollRef} className="h-[420px] overflow-y-auto bg-gradient-to-b from-rose-50/40 to-white px-4 py-3 space-y-2">
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center px-4">
                <div>
                  <p className="bn-display text-base text-slate-700">এই চ্যাটে কোনো বার্তা নেই</p>
                  <p className="text-xs text-slate-500 mt-1">নিচে আপনার বার্তা লিখে অ্যাডমিন-এর সাথে আলোচনা শুরু করুন</p>
                </div>
              </div>
            ) : messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  m.sender === "user"
                    ? "bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-br-sm"
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
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="অ্যাডমিন-কে বার্তা লিখুন..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-300/40"
            />
            <button onClick={send} disabled={sending || !text.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/30 hover:scale-[1.03] transition disabled:opacity-60 disabled:hover:scale-100">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
