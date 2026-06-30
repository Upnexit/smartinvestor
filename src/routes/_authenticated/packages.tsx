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
          {rows.map((p) => <PackageCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function PackageCard({ p }: { p: Pkg }) {
  const total = p.daily_income * p.duration_days;
  const profit = total - Number(p.price);
  const roi = Math.round((profit / Number(p.price)) * 100);

  const isVip = p.featured;
  const cardClass = isVip
    ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 ring-2 ring-amber-300 shadow-lg shadow-amber-200/40"
    : "bg-white ring-1 ring-slate-200 shadow-sm";

  return (
    <Link
      to="/packages/$id"
      params={{ id: p.id }}
      className={cn(
        "relative flex flex-col rounded-2xl p-3.5 sm:p-4 transition hover:scale-[1.02] hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        cardClass,
      )}
    >
      {isVip && (
        <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <Star className="h-2.5 w-2.5 fill-white" /> Featured
        </span>
      )}
      <span className={cn(
        "self-start rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        roi >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700",
      )}>
        {roi}% ROI
      </span>

      <h3 className="bn-display mt-2 text-base sm:text-lg text-slate-900 leading-tight">{p.name}</h3>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="bn-display text-2xl sm:text-3xl bg-gradient-to-br from-rose-600 to-amber-600 bg-clip-text text-transparent">
          ৳{bn(Number(p.price))}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-[11px] sm:text-xs text-slate-600">
        <div className="flex justify-between"><dt>দৈনিক আয়</dt><dd className="font-bold text-emerald-600">৳{bn(p.daily_income)}</dd></div>
        <div className="flex justify-between"><dt>দৈনিক টাস্ক</dt><dd className="font-bold text-slate-900">{bn(p.daily_tasks)}</dd></div>
        <div className="flex justify-between"><dt>মোট আয়</dt><dd className="font-bold text-amber-700">৳{bn(total)}</dd></div>
      </dl>

      <div className={cn(
        "mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold text-white shadow-md",
        isVip ? "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 shadow-amber-300/50"
              : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-300/40",
      )}>
        ক্রয় করুন <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

// re-export the small icon row helper if needed elsewhere
export const PackageIcons = { Calendar, Coins, TrendingUp };
