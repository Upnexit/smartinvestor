import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ListChecks, Sparkles, Users, Loader2, Package as PackageIcon, ChevronRight,
  BookOpen, X, Link2, Send,
} from "lucide-react";
import { AdminPageHeader, StatTile, AdminCard } from "@/components/admin/AdminUI";
import { useServerFn } from "@tanstack/react-start";
import { listDistributorPackages } from "@/lib/distributor-package-tasks.functions";
import { getReferredActiveUsers } from "@/lib/distributor-tasks.functions";

export const Route = createFileRoute("/distributor/tasks")({
  head: () => ({ meta: [{ title: "Task Management — Distributor" }] }),
  component: DistTasksPage,
});

type Pkg = { id: string; name: string; price: number; daily_tasks: number | null; daily_income: number | null; active: boolean };

function DistTasksPage() {
  const listFn = useServerFn(listDistributorPackages);
  const usersFn = useServerFn(getReferredActiveUsers);

  const [packages, setPackages] = useState<Pkg[]>([]);
  const [perPkg, setPerPkg] = useState<Record<string, { total: number; todayActive: number; mine: number }>>({});
  const [activeUsers, setActiveUsers] = useState<Record<string, number>>({});
  const [referredCount, setReferredCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);

  const load = async () => {
    try {
      const [r, u] = await Promise.all([
        listFn({}),
        usersFn({}).catch(() => ({ total: 0, active: [] })),
      ]);
      const rr = r as { packages: Pkg[]; perPkg: Record<string, { total: number; todayActive: number; mine: number }>; activeUsers: Record<string, number> };
      setPackages(rr.packages);
      setPerPkg(rr.perPkg);
      setActiveUsers(rr.activeUsers);
      setReferredCount((u as { total: number }).total);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totals = packages.reduce((acc, p) => {
    const c = perPkg[p.id] ?? { total: 0, todayActive: 0, mine: 0 };
    acc.total += c.total; acc.todayActive += c.todayActive; acc.mine += c.mine;
    return acc;
  }, { total: 0, todayActive: 0, mine: 0 });

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Task Management" subtitle="প্যাকেজ অনুযায়ী task তৈরি ও publish করুন" Icon={ListChecks} accent="fuchsia"
        action={
          <button onClick={() => setShowManual(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 px-3 py-2 text-xs font-bold text-white shadow-md">
            <BookOpen className="h-4 w-4" /> নির্দেশিকা
          </button>
        } />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="আমার Active User" value={referredCount} Icon={Users} accent="emerald" />
        <StatTile label="মোট Task" value={totals.total} Icon={Link2} accent="indigo" />
        <StatTile label="আজ Active" value={totals.todayActive} Icon={Sparkles} accent="amber" />
        <StatTile label="আমার তৈরি" value={totals.mine} Icon={Send} accent="fuchsia" />
      </div>

      {loading ? (
        <div className="grid place-items-center py-12 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : packages.length === 0 ? (
        <AdminCard className="p-8 text-center text-sm text-slate-500">কোনো active প্যাকেজ নেই</AdminCard>
      ) : (
        <AdminCard accent="indigo" className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <PackageIcon className="h-4 w-4 text-indigo-600" />
            <span className="bn-display text-sm text-slate-800">প্যাকেজ অনুযায়ী টাস্ক ম্যানেজ</span>
            <span className="text-[11px] text-slate-500">— বাটনে ক্লিক করে AI দিয়ে random Facebook link generate করুন</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => {
              const c = perPkg[p.id] ?? { total: 0, todayActive: 0, mine: 0 };
              return (
                <Link key={p.id} to="/distributor/task-package/$packageId" params={{ packageId: p.id }}
                  className="group relative flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 p-[1.5px] hover:scale-[1.02] transition">
                  <div className="flex w-full items-center gap-3 rounded-[14px] bg-white px-3 py-2.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-700">
                      <PackageIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="bn-display text-sm text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500">
                        ৳{p.price} • দৈনিক {p.daily_tasks ?? 0}টি • মোট {c.total} • আমার {c.mine}
                      </p>
                      <div className="mt-0.5 flex gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                          <Users className="h-3 w-3" /> {activeUsers[p.id] ?? 0} active user
                        </span>
                        {c.todayActive > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                            আজ {c.todayActive}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </AdminCard>
      )}

      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
}

function ManualModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white/95 px-5 py-3 backdrop-blur">
          <h3 className="bn-display text-xl text-slate-900 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" /> Task Management গাইড
          </h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <Section title="১. প্যাকেজ সিলেক্ট করুন">
            <p>প্রতিটি প্যাকেজ আলাদা section — যে প্যাকেজের user-দের জন্য task তৈরি করবেন সেটি ক্লিক করুন।</p>
          </Section>
          <Section title="২. AI দিয়ে Task Generate">
            <p>কতটি task, মোট Amount ও action type সিলেক্ট করে "AI দিয়ে Random FB Link তৈরি" চাপুন — Verified 1M+ follower Facebook page থেকে random link Draft হিসাবে যোগ হবে।</p>
          </Section>
          <Section title="৩. Verify ও Activate">
            <p>প্রতিটি link ক্লিক করে Facebook page live আছে কিনা check করুন (সবুজ tick দেখাবে)। এরপর "আমার সব draft Activate" বাটনে ক্লিক করুন — user-দের কাছে task পৌঁছে যাবে।</p>
          </Section>
          <Section title="৪. Admin Task-ও এখানে দেখাবে">
            <p>একই প্যাকেজে admin যেসব task তৈরি করেছেন সেগুলোও real-time এখানে দেখাবে (blue "Admin" ট্যাগ দিয়ে)। আপনি শুধু নিজের তৈরি task edit/delete করতে পারবেন।</p>
          </Section>
          <Section title="৫. Lead / CRM">
            <p>"লিড / CRM" section-এ potential user track করুন — status অনুযায়ী রঙিন button-এ ক্লিক করে filter করা যাবে।</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="bn-display text-base text-slate-900">{title}</h4>
      <div className="mt-1 space-y-2">{children}</div>
    </div>
  );
}
