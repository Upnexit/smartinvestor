import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Trash2, Ban, X } from "lucide-react";
import { AdminPageHeader, AdminCard, GradientButton, SoftButton, EmptyState, Shimmer } from "@/components/admin/AdminUI";
import { supabase } from "@/integrations/supabase/client";
import { deleteMessage, banUser as banUserApi } from "@/lib/admin-client";
import { cn } from "@/lib/utils";
import { useAuthReady } from "@/hooks/use-auth-ready";

export const Route = createFileRoute("/admin/community")({
  head: () => ({ meta: [{ title: "কমিউনিটি মডারেশন — Admin" }] }),
  component: CommunityPage,
});

type Msg = {
  id: string; user_id: string; content: string | null; created_at: string;
  profiles?: { full_name: string | null } | null;
};

function CommunityPage() {
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [banUser, setBanUser] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState<string | null>(null);
  const authReady = useAuthReady();

  const refresh = () => supabase.from("community_messages")
    .select("id,user_id,content,created_at,profiles!community_messages_user_id_fkey(full_name)")
    .order("created_at", { ascending: false }).limit(100)
    .then(({ data }) => setMsgs((data ?? []) as unknown as Msg[]));

  useEffect(() => {
    if (!authReady) return;
    refresh();
    const ch = supabase.channel("admin-cmty").on("postgres_changes", { event: "*", schema: "public", table: "community_messages" }, refresh).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authReady]);

  const handleDel = async (id: string) => {
    setBusy(id);
    try { await deleteMessage(id); toast.success("মুছে ফেলা হয়েছে"); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };
  const handleBan = async () => {
    if (!banUser || reason.trim().length < 3) { toast.error("কারণ লিখুন"); return; }
    setBusy(banUser.id);
    try { await banUserApi(banUser.id, reason.trim(), hours); toast.success("ব্যান করা হয়েছে"); setBanUser(null); setReason(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "ব্যর্থ"); }
    finally { setBusy(null); }
  };

  return (
    <>
      <AdminPageHeader accent="purple" Icon={MessageSquare} title="কমিউনিটি চ্যাট মডারেশন"
        subtitle="মেসেজ ডিলিট ও ইউজার ব্যান করুন" />
      {!authReady || !msgs ? <Shimmer className="h-32" /> : msgs.length === 0 ? (
        <EmptyState Icon={MessageSquare} title="কোনো মেসেজ নেই" accent="purple" />
      ) : (
        <div className="space-y-2">
          {msgs.map((m) => (
            <AdminCard key={m.id} accent="purple" className="p-3 flex items-start gap-3">
              <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white text-sm font-bold shadow")}>
                {(m.profiles?.full_name ?? "U").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="bn-display text-sm text-slate-900 truncate">{m.profiles?.full_name ?? "—"}</p>
                  <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString("bn-BD")}</span>
                </div>
                <p className="text-sm text-slate-700 break-words">{m.content}</p>
              </div>
              <div className="flex flex-col gap-1">
                <SoftButton accent="rose" className="!from-rose-100 !to-red-200 !text-rose-700 !ring-rose-200" onClick={() => handleDel(m.id)}><Trash2 className="h-3.5 w-3.5" /></SoftButton>
                <SoftButton accent="amber" className="!from-amber-100 !to-orange-200 !text-amber-700 !ring-amber-200" onClick={() => setBanUser({ id: m.user_id, name: m.profiles?.full_name ?? "" })}><Ban className="h-3.5 w-3.5" /></SoftButton>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {banUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-admin-pop">
            <div className="flex items-center justify-between">
              <h3 className="bn-display text-lg">ব্যান করুন — {banUser.name}</h3>
              <button onClick={() => setBanUser(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-3 block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">কারণ</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
                className="w-full rounded-xl border-2 border-slate-200 p-2 text-sm outline-none focus:border-purple-400" />
            </label>
            <label className="mt-2 block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">সময়কাল (ঘণ্টা)</span>
              <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-slate-200 p-2 text-sm" />
            </label>
            <div className="mt-3 flex gap-2">
              <SoftButton className="flex-1" onClick={() => setBanUser(null)}>বাতিল</SoftButton>
              <GradientButton accent="purple" className="flex-1" busy={busy===banUser.id} onClick={handleBan}>ব্যান</GradientButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
