import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MessagesSquare, Send, User as UserIcon, Loader2 } from "lucide-react";
import { AdminPageHeader, AdminCard, EmptyState } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/hooks/use-auth-ready";

type Msg = { id: string; user_id: string; sender: "user" | "admin"; body: string; created_at: string };
type Thread = { user_id: string; full_name: string | null; email: string | null; user_code: string | null; last: string; at: string; status?: string | null };

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "সাপোর্ট চ্যাট — Admin" }] }),
  component: SupportPage,
});

function SupportPage() {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const authReady = useAuthReady();

  const loadThreads = async () => {
    const { data: msgs } = await supabase.from("support_messages").select("user_id, body, created_at").order("created_at", { ascending: false }).limit(500);
    const byUser = new Map<string, { last: string; at: string }>();
    (msgs ?? []).forEach((m) => { if (!byUser.has(m.user_id)) byUser.set(m.user_id, { last: m.body, at: m.created_at }); });
    const ids = [...byUser.keys()];
    if (ids.length === 0) { setThreads([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,full_name,email,user_code,status").in("id", ids);
    const list: Thread[] = ids.map((id) => {
      const p = (profs ?? []).find((x) => x.id === id);
      const m = byUser.get(id)!;
      return { user_id: id, full_name: p?.full_name ?? null, email: p?.email ?? null, user_code: p?.user_code ?? null, last: m.last, at: m.at, status: (p as { status?: string } | undefined)?.status ?? null };
    });
    list.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    setThreads(list);
  };

  useEffect(() => {
    if (!authReady) return;
    loadThreads();
    const ch = supabase.channel("admin-support-watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady]);

  useEffect(() => {
    if (!active || !authReady) return;
    supabase.from("support_messages").select("*").eq("user_id", active.user_id).order("created_at", { ascending: true }).limit(300)
      .then(({ data }) => setMessages((data as Msg[]) ?? []));
    const ch = supabase.channel(`admin-thread-${active.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${active.user_id}` }, (p) => {
        setMessages((m) => [...m, p.new as Msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, authReady]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!active || !text.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({ user_id: active.user_id, sender: "admin", body: text.trim() });
      if (error) throw error;
      setText("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setSending(false); }
  };

  return (
    <>
      <AdminPageHeader accent="rose" Icon={MessagesSquare} title="সাপোর্ট চ্যাট" subtitle="সাসপেন্ডেড ও সাহায্যপ্রার্থী ইউজারদের সাথে রিয়েল-টাইম চ্যাট" />

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <AdminCard accent="rose" className="p-2 h-[600px] overflow-y-auto">
          {!authReady || !threads ? <p className="p-4 text-sm text-slate-500">লোড হচ্ছে...</p> :
           threads.length === 0 ? <EmptyState Icon={MessagesSquare} title="কোনো বার্তা নেই" accent="rose" /> :
           <ul className="space-y-1">
            {threads.map((t) => (
              <li key={t.user_id}>
                <button onClick={() => setActive(t)} className={cn("w-full text-left rounded-xl px-3 py-2.5 transition",
                  active?.user_id === t.user_id ? "bg-gradient-to-br from-rose-500 to-red-600 text-white" : "hover:bg-rose-50")}>
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn("text-sm font-bold truncate", active?.user_id === t.user_id ? "text-white" : "text-slate-800")}>
                      {t.full_name ?? t.email ?? "—"}
                    </p>
                    {t.status === "suspended" && <span className={cn("text-[9px] font-bold uppercase rounded px-1", active?.user_id === t.user_id ? "bg-white/25 text-white" : "bg-rose-100 text-rose-700")}>SUSP</span>}
                  </div>
                  <p className={cn("text-[10px] font-mono mt-0.5", active?.user_id === t.user_id ? "text-white/80" : "text-slate-400")}>{t.user_code}</p>
                  <p className={cn("text-xs truncate mt-0.5", active?.user_id === t.user_id ? "text-white/85" : "text-slate-500")}>{t.last}</p>
                </button>
              </li>
            ))}
           </ul>}
        </AdminCard>

        <AdminCard accent="rose" className="p-0 overflow-hidden h-[600px] flex flex-col">
          {!active ? (
            <div className="flex-1 grid place-items-center text-center px-6">
              <div>
                <UserIcon className="h-10 w-10 text-rose-300 mx-auto" />
                <p className="mt-2 bn-display text-base text-slate-700">একটি কথোপকথন নির্বাচন করুন</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 text-white">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><UserIcon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <p className="bn-display text-sm leading-none">{active.full_name ?? "—"}</p>
                  <p className="text-[10px] text-white/85 mt-1 font-mono">{active.user_code} · {active.email}</p>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-rose-50/30 px-4 py-3 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.sender === "admin" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.sender === "admin" ? "bg-gradient-to-br from-rose-500 to-red-600 text-white" : "bg-white ring-1 ring-slate-200 text-slate-800")}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={cn("text-[9px] mt-1", m.sender === "admin" ? "text-white/70" : "text-slate-400")}>{new Date(m.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="অ্যাডমিন হিসেবে উত্তর লিখুন..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-300/40" />
                <button onClick={send} disabled={sending || !text.trim()}
                  className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition disabled:opacity-60">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </AdminCard>
      </div>
    </>
  );
}
