import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Coins, TrendingUp, ListChecks, ShieldCheck, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/packages/$id")({
  head: () => ({ meta: [{ title: "প্যাকেজ বিবরণ — Smart Investor" }] }),
  component: PackageDetailPage,
});

type Pkg = {
  id: string; name: string; price: number; daily_tasks: number;
  daily_income: number; duration_days: number; description: string | null;
  featured: boolean; image_url: string | null;
};
const bn = (n: number) => Number(n).toLocaleString("en-BD");

function PackageDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<Pkg | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    supabase.from("packages").select("*").eq("id", id).maybeSingle()
      .then(({ data }) => { data ? setP(data as Pkg) : setMissing(true); });
  }, [id]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="bn-display text-lg text-rose-700">প্যাকেজ পাওয়া যায়নি</p>
        <Link to="/packages" className="mt-3 inline-flex items-center gap-1 text-sm text-rose-600 underline">প্যাকেজ তালিকায় ফিরে যান</Link>
      </div>
    );
  }
  if (!p) return <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />;

  const total = p.daily_income * p.duration_days;
  const profit = total - Number(p.price);
  const roi = Math.round((profit / Number(p.price)) * 100);
  const isVip = p.featured;

  return (
    <div className="space-y-5 pb-8">
      <Link to="/packages" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> সব প্যাকেজ
      </Link>

      <header className={cn(
        "relative overflow-hidden rounded-3xl p-6 sm:p-8 ring-1 shadow-lg",
        isVip
          ? "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 ring-amber-300 text-white"
          : "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 ring-emerald-300 text-white",
      )}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          {p.image_url && (
            <div className="shrink-0 mx-auto sm:mx-0">
              <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden ring-4 ring-white/40 shadow-2xl bg-white/10 backdrop-blur">
                <img
                  src={p.image_url}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {isVip && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                <Star className="h-3 w-3 fill-white" /> Featured
              </span>
            )}
            <h1 className="bn-display mt-3 text-3xl sm:text-4xl drop-shadow-sm">{p.name}</h1>
            {p.description && <p className="mt-2 max-w-xl text-sm text-white/90">{p.description}</p>}
            <div className="mt-4 flex items-end gap-2">
              <span className="bn-display text-4xl sm:text-5xl">৳{bn(Number(p.price))}</span>
              <span className="mb-1 text-xs text-white/80">এককালীন</span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3 w-3" /> {roi}% ROI ৪৫ দিনে
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Feature icon={Calendar} accent="sky" label="মেয়াদ" value={`${bn(p.duration_days)} দিন`} />
        <Feature icon={ListChecks} accent="indigo" label="দৈনিক টাস্ক" value={bn(p.daily_tasks)} />
        <Feature icon={Coins} accent="emerald" label="দৈনিক আয়" value={`৳${bn(p.daily_income)}`} />
        <Feature icon={TrendingUp} accent="amber" label="মোট আয়" value={`৳${bn(total)}`} />
      </div>

      <section className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-3">
        <h2 className="bn-display text-lg text-slate-900">কিভাবে কাজ করে?</h2>
        <ol className="space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Bullet n={1}/> প্যাকেজ কিনতে bKash / Nagad / Rocket এ পেমেন্ট করে TrxID সাবমিট করুন।</li>
          <li className="flex gap-2"><Bullet n={2}/> Admin approve করলে প্যাকেজ active হবে — ৪৫ দিনের জন্য।</li>
          <li className="flex gap-2"><Bullet n={3}/> প্রতিদিন {bn(p.daily_tasks)}টি Like/Comment/Share টাস্ক করুন।</li>
          <li className="flex gap-2"><Bullet n={4}/> সম্পূর্ণ task এ দৈনিক ৳{bn(p.daily_income)} balance এ যোগ হবে।</li>
          <li className="flex gap-2"><Bullet n={5}/> Withdraw — bKash/Nagad/Rocket এ যেকোনো সময়।</li>
        </ol>
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-3 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>রেফারেল কমিশন: কেউ আপনার রেফারেল কোড দিয়ে এই প্যাকেজ কিনলে আপনি পাবেন ৫% ({`৳${bn(Math.round(Number(p.price) * 0.05))}`})।</span>
        </div>
      </section>

      <button
        onClick={() => navigate({ to: "/checkout", search: { pkg: p.id } })}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold text-white shadow-xl transition hover:scale-[1.01]",
          isVip
            ? "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-amber-400/40"
            : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-400/40",
        )}
      >
        চেকআউটে যান — ৳{bn(Number(p.price))}
      </button>
    </div>
  );
}

function Feature({ icon: Icon, label, value, accent }: { icon: typeof Calendar; label: string; value: string; accent: "sky"|"indigo"|"emerald"|"amber" }) {
  const map = {
    sky:     "from-sky-50 to-cyan-50 ring-sky-200 text-sky-700",
    indigo:  "from-indigo-50 to-violet-50 ring-indigo-200 text-indigo-700",
    emerald: "from-emerald-50 to-teal-50 ring-emerald-200 text-emerald-700",
    amber:   "from-amber-50 to-orange-50 ring-amber-200 text-amber-700",
  };
  return (
    <div className={cn("rounded-2xl bg-gradient-to-br p-3.5 ring-1", map[accent])}>
      <Icon className="h-5 w-5" />
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="bn-display text-lg sm:text-xl text-slate-900">{value}</p>
    </div>
  );
}

function Bullet({ n }: { n: number }) {
  return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[10px] font-bold text-white">{n}</span>;
}
