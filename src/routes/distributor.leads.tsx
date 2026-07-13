import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users2, Plus, Search, Phone, Trash2, Edit3, X, Loader2,
  Sparkles, PhoneCall, Heart, CheckCircle2, XCircle, MessageCircle,
} from "lucide-react";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import { listLeads, createLead, updateLead, deleteLead } from "@/lib/distributor-leads.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/distributor/leads")({
  head: () => ({ meta: [{ title: "Lead CRM — Distributor" }] }),
  component: LeadsPage,
});

type Lead = {
  id: string; name: string; phone: string | null; source: string | null;
  status: string; notes: string | null; next_followup_at: string | null; created_at: string;
};

const STATUS_LIST = ["new", "contacted", "interested", "converted", "dropped"] as const;
type Status = (typeof STATUS_LIST)[number];

const STATUS_META: Record<Status, {
  label: string; Icon: typeof Users2; grad: string; ring: string; soft: string; text: string;
}> = {
  new:        { label: "নতুন যোগাযোগ",   Icon: Sparkles,      grad: "from-cyan-500 via-sky-500 to-indigo-600",    ring: "ring-sky-300",      soft: "bg-sky-50",      text: "text-sky-700" },
  contacted:  { label: "যোগাযোগ হয়েছে",  Icon: PhoneCall,     grad: "from-blue-500 via-indigo-500 to-violet-600", ring: "ring-indigo-300",   soft: "bg-indigo-50",   text: "text-indigo-700" },
  interested: { label: "আগ্রহী",         Icon: Heart,         grad: "from-amber-400 via-orange-500 to-rose-500",  ring: "ring-orange-300",   soft: "bg-orange-50",   text: "text-orange-700" },
  converted:  { label: "সাইনআপ",        Icon: CheckCircle2,  grad: "from-emerald-400 via-teal-500 to-cyan-600",  ring: "ring-emerald-300",  soft: "bg-emerald-50",  text: "text-emerald-700" },
  dropped:    { label: "বাতিল",         Icon: XCircle,       grad: "from-rose-500 via-red-500 to-orange-600",    ring: "ring-rose-300",     soft: "bg-rose-50",     text: "text-rose-700" },
};

function LeadsPage() {
  const listFn = useServerFn(listLeads);
  const createFn = useServerFn(createLead);
  const updateFn = useServerFn(updateLead);
  const deleteFn = useServerFn(deleteLead);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [showModal, setShowModal] = useState<Lead | null | "new">(null);

  const load = async () => {
    setLoading(true);
    try { setLeads(await listFn({ data: { q: "", status: "" } }) as Lead[]); }
    catch (e) { toast.error((e as Error).message || "CRM data load হয়নি"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function handleDelete(id: string) {
    if (!confirm("লিড delete করবেন?")) return;
    try { await deleteFn({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const counts = useMemo(() => STATUS_LIST.reduce<Record<Status, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length; return acc;
  }, { new: 0, contacted: 0, interested: 0, converted: 0, dropped: 0 }), [leads]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!query) return true;
      return l.name.toLowerCase().includes(query) ||
        (l.phone ?? "").toLowerCase().includes(query) ||
        (l.source ?? "").toLowerCase().includes(query) ||
        (l.notes ?? "").toLowerCase().includes(query);
    });
  }, [leads, q, statusFilter]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead / CRM" subtitle="Database থেকে সব lead, status, contact ও follow-up" Icon={Users2} accent="sky"
        action={
          <button onClick={() => setShowModal("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition">
            <Plus className="h-4 w-4" /> নতুন লিড
          </button>
        } />

      {/* Big colorful stat buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatusButton total label="সব লিড" grad="from-indigo-500 via-fuchsia-500 to-rose-500" count={leads.length}
          Icon={Users2} active={statusFilter === ""} onClick={() => setStatusFilter("")} />
        {STATUS_LIST.map((s) => (
          <StatusButton key={s} label={STATUS_META[s].label} grad={STATUS_META[s].grad}
            count={counts[s]} Icon={STATUS_META[s].Icon}
            active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="নাম, ফোন, source বা note খুঁজুন…"
          className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sky-500" />
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <AdminCard className="p-8 text-center text-sm text-slate-500">
          {leads.length === 0 ? "কোনো লিড নেই — উপরের নতুন লিড বাটনে ক্লিক করুন" : "এই filter/search-এ কোনো lead নেই"}
        </AdminCard>
      ) : (
        <div className="grid gap-2">
          {filtered.map((l) => {
            const meta = STATUS_META[l.status as Status] ?? STATUS_META.new;
            return (
              <div key={l.id} className={cn("rounded-2xl bg-white ring-1 p-3 flex items-start gap-3 shadow-sm hover:shadow-md transition", meta.ring)}>
                <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white font-bold bg-gradient-to-br", meta.grad)}>
                  {l.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="bn-display text-sm text-slate-900 truncate">{l.name}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", meta.soft, meta.text, meta.ring)}>
                      <meta.Icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {l.phone && (
                      <>
                        <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200">
                          <Phone className="h-3 w-3" /> {l.phone}
                        </a>
                        <a href={`https://wa.me/${l.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 ring-1 ring-emerald-200">
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </a>
                      </>
                    )}
                    {l.source && <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">Source: {l.source}</span>}
                    {l.next_followup_at && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                        Follow-up: {new Date(l.next_followup_at).toLocaleDateString("bn-BD")}
                      </span>
                    )}
                  </div>
                  {l.notes && <p className="mt-1.5 text-[11px] text-slate-600 line-clamp-2">{l.notes}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => setShowModal(l)} className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(l.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <LeadModal
          lead={showModal === "new" ? null : showModal}
          onClose={() => setShowModal(null)}
          onSave={async (patch) => {
            try {
              if (showModal === "new") await createFn({ data: patch as never });
              else await updateFn({ data: { id: (showModal as Lead).id, patch } });
              toast.success("সংরক্ষিত");
              setShowModal(null); load();
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function StatusButton({ label, grad, count, Icon, active, onClick, total }: {
  label: string; grad: string; count: number; Icon: typeof Users2; active: boolean; onClick: () => void; total?: boolean;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-left shadow-lg transition hover:scale-[1.03] active:scale-[0.98]",
        grad,
        active ? "ring-2 ring-offset-2 ring-slate-900" : "opacity-90 hover:opacity-100",
      )}>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,.45),transparent_34%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 shadow-md ring-1 ring-white/35">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/75">{total ? "মোট" : "স্ট্যাটাস"}</p>
            <p className="bn-display text-xs truncate drop-shadow">{label}</p>
          </div>
        </div>
        <p className="mt-1.5 bn-display text-3xl font-black text-white drop-shadow">{count}</p>
      </div>
    </button>
  );
}

function LeadModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [name, setName] = useState(lead?.name ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [source, setSource] = useState(lead?.source ?? "");
  const [status, setStatus] = useState<Status>((lead?.status as Status) ?? "new");
  const [followup, setFollowup] = useState(lead?.next_followup_at?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="bn-display text-lg text-slate-900">{lead ? "লিড এডিট" : "নতুন লিড"}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="নাম *"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
          <Field label="ফোন"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
          <Field label="Source"><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="FB / বন্ধু / etc" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
          <div>
            <span className="text-xs font-bold text-slate-600">Status</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STATUS_LIST.map((s) => {
                const meta = STATUS_META[s];
                const on = status === s;
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition",
                      on ? cn("bg-gradient-to-br text-white ring-transparent shadow", meta.grad) : cn(meta.soft, meta.text, meta.ring))}>
                    <meta.Icon className="h-3 w-3" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Follow-up তারিখ"><input type="date" value={followup} onChange={(e) => setFollowup(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
          <Field label="নোট"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
        </div>
        <div className="flex gap-2 border-t p-4">
          <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">বাতিল</button>
          <button
            onClick={() => {
              if (!name.trim()) { toast.error("নাম দিন"); return; }
              onSave({ name, phone: phone || null, source: source || null, status, notes: notes || null, next_followup_at: followup ? new Date(followup).toISOString() : null });
            }}
            className="flex-1 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 py-2 text-sm font-bold text-white shadow">
            সংরক্ষণ
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><div className="mt-1">{children}</div></label>;
}
