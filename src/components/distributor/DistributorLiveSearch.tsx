import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2, User, Users, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type UserRow = { id: string; full_name: string | null; phone: string | null; user_code: string | null };
type LeadRow = { id: string; name: string | null; phone: string | null; status: string | null };

export function DistributorLiveSearch() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);

  useEffect(() => {
    const t = q.trim();
    if (!uid || !t) { setUsers([]); setLeads([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const esc = t.replace(/[%,()]/g, "");
      const pat = `%${esc}%`;
      const [uRes, lRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,user_code")
          .eq("distributor_id", uid)
          .or(`full_name.ilike.${pat},phone.ilike.${pat},user_code.ilike.${pat},email.ilike.${pat}`)
          .limit(8),
        supabase.from("distributor_leads").select("id,name,phone,status")
          .eq("distributor_id", uid)
          .or(`name.ilike.${pat},phone.ilike.${pat}`)
          .limit(6),
      ]);
      setUsers((uRes.data ?? []) as UserRow[]);
      setLeads((lRes.data ?? []) as LeadRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, uid]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hasResults = users.length + leads.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-2xl border border-indigo-200/70 bg-white/95 px-3 py-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
        <Search className="h-4 w-4 text-indigo-500 shrink-0" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="ইউজার, ফোন, কোড, লিড..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {q && (
          <button onClick={() => { setQ(""); setUsers([]); setLeads([]); }} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-indigo-100 border border-indigo-200">
          {loading && !hasResults && (
            <div className="grid place-items-center py-8 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && !hasResults && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">কোনো ফলাফল পাওয়া যায়নি</p>
          )}
          <div className="max-h-[65vh] overflow-y-auto">
            {users.length > 0 && (
              <div>
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">ইউজার</p>
                <ul>
                  {users.map((u) => (
                    <li key={u.id}>
                      <button
                        onClick={() => { setOpen(false); setQ(""); navigate({ to: "/distributor/users" }); }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-indigo-50"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
                          <User className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{u.full_name || "—"}</span>
                          <span className="block truncate text-[11px] text-slate-500">{u.phone || u.user_code || "—"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {leads.length > 0 && (
              <div className="border-t border-slate-100">
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">লিড</p>
                <ul>
                  {leads.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => { setOpen(false); setQ(""); navigate({ to: "/distributor/leads" }); }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-fuchsia-50"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-md">
                          <Users className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{l.name || "—"}</span>
                          <span className="block truncate text-[11px] text-slate-500">{l.phone || "—"} • {l.status || "new"}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
