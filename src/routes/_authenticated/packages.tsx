import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, Calendar, Coins, ArrowRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({
    meta: [
      { title: "ইনভেস্টমেন্ট প্যাকেজ — Smart Investor" },
      { name: "description", content: "৪৫ দিনের প্যাকেজ — দৈনিক টাস্ক করে ৭০-১১০% পর্যন্ত রিটার্ন।" },
    ],
  }),
  component: PackagesPage,
});

type Pkg = {
  id: string; name: string; price: number;
  daily_tasks: number; daily_income: number; duration_days: number;
  description: string | null; featured: boolean; active: boolean;
  image_url: string | null;
};


const bn = (n: number) => Number(n).toLocaleString("en-BD");

function PackagesPage() {
  const [rows, setRows] = useState<Pkg[] | null>(null);

  useEffect(() => {
    supabase.from("packages").select("*").eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setRows((data ?? []) as Pkg[]));
  }, []);

  return (
    <div className="space-y-6 pb-8">
      <header className="rounded-3xl bg-gradient-to-br from-amber-50 via-rose-50 to-emerald-50 p-5 sm:p-7 ring-1 ring-amber-200/60 shadow-sm">
        <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="h-4 w-4" /> ইনভেস্টমেন্ট প্যাকেজ
        </div>
        <h1 className="bn-display mt-2 text-2xl sm:text-3xl text-slate-900">
          ৪৫ দিনে <span className="bg-gradient-to-br from-amber-600 to-rose-600 bg-clip-text text-transparent">আয় শুরু করুন</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">প্রতিদিন টাস্ক complete করে দৈনিক আয় তুলে নিন — ৭০% থেকে ১১০% পর্যন্ত রিটার্ন।</p>
      </header>

      {!rows ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {rows.map((p, i) => <PackageCard key={p.id} p={p} idx={i} />)}
        </div>
      )}
    </div>
  );
}

const GRADIENTS = [
  { from: "from-amber-400",   via: "via-orange-500",  to: "to-rose-600",     ring: "ring-amber-300",    glow: "shadow-amber-300/40" },
  { from: "from-emerald-400", via: "via-teal-500",    to: "to-cyan-600",     ring: "ring-emerald-300",  glow: "shadow-emerald-300/40" },
  { from: "from-fuchsia-500", via: "via-pink-500",    to: "to-rose-600",     ring: "ring-fuchsia-300",  glow: "shadow-fuchsia-300/40" },
  { from: "from-sky-400",     via: "via-blue-500",    to: "to-indigo-600",   ring: "ring-sky-300",      glow: "shadow-sky-300/40" },
  { from: "from-violet-500",  via: "via-purple-500",  to: "to-fuchsia-600",  ring: "ring-violet-300",   glow: "shadow-violet-300/40" },
  { from: "from-lime-400",    via: "via-emerald-500", to: "to-teal-600",     ring: "ring-lime-300",     glow: "shadow-lime-300/40" },
  { from: "from-rose-400",    via: "via-pink-500",    to: "to-red-600",      ring: "ring-rose-300",     glow: "shadow-rose-300/40" },
  { from: "from-cyan-400",    via: "via-sky-500",     to: "to-blue-600",     ring: "ring-cyan-300",     glow: "shadow-cyan-300/40" },
  { from: "from-yellow-400",  via: "via-amber-500",   to: "to-orange-600",   ring: "ring-yellow-300",   glow: "shadow-yellow-300/40" },
  { from: "from-indigo-500",  via: "via-violet-500",  to: "to-purple-600",   ring: "ring-indigo-300",   glow: "shadow-indigo-300/40" },
];

function PackageCard({ p, idx }: { p: Pkg; idx: number }) {
  const total = p.daily_income * p.duration_days;
  const profit = total - Number(p.price);
  const roi = Math.round((profit / Number(p.price)) * 100);
  const g = GRADIENTS[idx % GRADIENTS.length];
  const isVip = p.featured;

  return (
    <Link
      to="/checkout"
      search={{ pkg: p.id }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl p-3.5 sm:p-4 text-white shadow-lg transition-all duration-300",
        "bg-gradient-to-br", g.from, g.via, g.to,
        "ring-2", g.ring, g.glow,
        "hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60",
      )}
    >
      {/* glossy sweep */}
      <span className="pointer-events-none absolute -inset-x-10 -top-10 h-24 rotate-12 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
      <span className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />

      {p.image_url && (
        <div className="relative -mx-3.5 -mt-3.5 sm:-mx-4 sm:-mt-4 mb-2 h-24 sm:h-28 overflow-hidden rounded-t-2xl">
          <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {isVip && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[10px] font-bold ring-1 ring-white/40">
          <Star className="h-2.5 w-2.5 fill-white" /> VIP
        </span>
      )}


      <span className="relative self-start rounded-lg bg-white/25 backdrop-blur px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-white/30">
        {roi}% ROI
      </span>

      <h3 className="bn-display relative mt-2 text-base sm:text-lg leading-tight drop-shadow">{p.name}</h3>

      <div className="relative mt-1 flex items-baseline gap-1">
        <span className="bn-display text-2xl sm:text-3xl drop-shadow-md">৳{bn(Number(p.price))}</span>
      </div>

      <dl className="relative mt-3 space-y-1.5 text-[11px] sm:text-xs">
        <div className="flex justify-between"><dt className="text-white/85">দৈনিক আয়</dt><dd className="font-bold">৳{bn(p.daily_income)}</dd></div>
        <div className="flex justify-between"><dt className="text-white/85">দৈনিক টাস্ক</dt><dd className="font-bold">{bn(p.daily_tasks)}</dd></div>
        <div className="flex justify-between"><dt className="text-white/85">মোট আয়</dt><dd className="font-bold">৳{bn(total)}</dd></div>
      </dl>

      <div className="relative mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/25 backdrop-blur ring-1 ring-white/40 px-3 py-2.5 text-xs font-bold transition group-hover:bg-white group-hover:text-slate-900">
        ক্রয় করুন <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
