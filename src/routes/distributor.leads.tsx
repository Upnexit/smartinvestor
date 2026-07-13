import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users2, Plus, Search, Phone, Trash2, Edit3, X, Loader2 } from "lucide-react";
import { AdminPageHeader, AdminCard } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import { listLeads, createLead, updateLead, deleteLead } from "@/lib/distributor-leads.functions";

export const Route = createFileRoute("/distributor/leads")({
  head: () => ({ meta: [{ title: "Lead CRM — Distributor" }] }),
  component: LeadsPage,
});

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  next_followup_at: string | null;
  created_at: string;
};

const STATUS_LIST = ["new", "contacted", "interested", "converted", "dropped"] as const;
const STATUS_BN: Record<string, string> = { new: "নতুন", contacted: "যোগাযোগ", interested: "আগ্রহী", converted: "সাইনআপ", dropped: "বাতিল" };
const STATUS_COLOR: Record<string, string> = {
  new: "bg-slate-100 text-slate-800",
  contacted: "bg-sky-100 text-sky-800",
  interested: "bg-amber-100 text-amber-800",
  converted: "bg-emerald-100 text-emerald-800",
  dropped: "bg-rose-100 text-rose-800",
};

function LeadsPage() {
  const listFn = useServerFn(listLeads);
  const createFn = useServerFn(createLead);
  const updateFn = useServerFn(updateLead);
  const deleteFn = useServerFn(deleteLead);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState<Lead | null | "new">(null);

  const load = async () => {
    setLoading(true);
    try { setLeads(await listFn({ data: { q, status: statusFilter } }) as Lead[]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  async function handleDelete(id: string) {
    if (!confirm("লিড delete করবেন?")) return;
    try { await deleteFn({ data: { id } }); toast.success("Deleted"); load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const counts = STATUS_LIST.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length; return acc;
  }, {});

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead / CRM" subtitle="সম্ভাব্য user track করুন — call, follow-up ও conversion" Icon={Users2} accent="sky" />

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setShowModal("new")}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md">
          <Plus className="h-4 w-4" /> নতুন লিড
        </button>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="নাম বা ফোন খুঁজুন…" className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-sky-500" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter("")}
          className={"shrink-0 rounded-full px-3 py-1 text-xs font-bold " + (statusFilter === "" ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
          সব ({leads.length})
        </button>
        {STATUS_LIST.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={"shrink-0 rounded-full px-3 py-1 text-xs font-bold " + (statusFilter === s ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>
            {STATUS_BN[s]} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : leads.length === 0 ? (
        <AdminCard className="p-8 text-center text-sm text-slate-500">
          কোনো লিড নেই — উপরের "নতুন লিড" বাটনে ক্লিক করুন
        </AdminCard>
      ) : (
        <div className="grid gap-2">
          {leads.map((l) => (
            <div key={l.id} className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-start gap-3 shadow-sm">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white font-bold">
                {l.name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="bn-display text-sm text-slate-900 truncate">{l.name}</p>
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-bold " + (STATUS_COLOR[l.status] || "")}>{STATUS_BN[l.status] || l.status}</span>
                </div>
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline">
                    <Phone className="h-3 w-3" /> {l.phone}
                  </a>
                )}
                {l.source && <p className="text-[11px] text-slate-500">Source: {l.source}</p>}
                {l.next_followup_at && <p className="text-[11px] text-amber-700 font-semibold">Follow-up: {new Date(l.next_followup_at).toLocaleDateString("bn-BD")}</p>}
                {l.notes && <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{l.notes}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setShowModal(l)} className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700 hover:bg-sky-200"><Edit3 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(l.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
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

function LeadModal({ lead, onClose, onSave }: { lead: Lead | null; onClose: () => void; onSave: (patch: Record<string, unknown>) => void }) {
  const [name, setName] = useState(lead?.name ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [source, setSource] = useState(lead?.source ?? "");
  const [status, setStatus] = useState(lead?.status ?? "new");
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source"><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="FB / বন্ধু / etc" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500" /></Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500">
                {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_BN[s]}</option>)}
              </select>
            </Field>
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
