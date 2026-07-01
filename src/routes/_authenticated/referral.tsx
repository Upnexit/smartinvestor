import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users, Share2, Copy, Check, TrendingUp, Coins, Crown, Sparkles,
  Facebook, MessageCircle, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/referral")({
  head: () => ({ meta: [{ title: "রেফারেল — Smart Investor" }] }),
  component: ReferralPage,
});

type Earning = { id: string; amount: number; created_at: string; referred_user_id: string; source: string | null };
type Friend = { id: string; full_name: string | null; created_at: string; user_code: string; has_active_package?: boolean };

function ReferralPage() {
  const [refCode, setRefCode] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async (uid: string) => {
      const [{ data: p }, { data: e }, { data: f }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("id", uid).maybeSingle(),
        supabase.from("referral_earnings").select("*").eq("referrer_id", uid)
          .order("created_at", { ascending: false }).limit(50),
        // RPC bypasses profiles RLS to safely surface only limited fields of referred friends
        (supabase.rpc as unknown as (name: string) => Promise<{ data: unknown }>)("my_referred_friends"),
      ]);
      if (p) setRefCode(p.referral_code);
      setEarnings((e ?? []) as Earning[]);
      setFriends(((f as unknown) ?? []) as Friend[]);
    };

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      userId = u.user.id;
      await load(userId);

      channel = supabase.channel(`referral-${userId}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "referral_earnings", filter: `referrer_id=eq.${userId}` },
          () => userId && load(userId))
        .on("postgres_changes",
          { event: "*", schema: "public", table: "profiles", filter: `referred_by=eq.${userId}` },
          () => userId && load(userId))
        .subscribe();
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);


  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = refCode ? `${origin}/register?ref=${refCode}` : "";
  const totalEarned = useMemo(() => earnings.reduce((a, e) => a + Number(e.amount), 0), [earnings]);

  async function copy(v: string, key: string) {
    try { await navigator.clipboard.writeText(v); setCopied(key); toast.success("কপি হয়েছে"); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  function share(platform: "whatsapp" | "facebook" | "telegram") {
    const msg = encodeURIComponent(`Smart Investor — ঘরে বসে লাইক/কমেন্ট করে আয় করুন! আমার রেফারেল লিংক: ${link}`);
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">REFERRAL</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">বন্ধু রেফার করুন 🎁</h1>
        <p className="mt-1 text-sm text-slate-600">প্রতিটি বন্ধুর প্যাকেজ কেনার ৫% কমিশন পান।</p>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs text-white/85">
            <Sparkles className="h-4 w-4" /> আপনার রেফারেল কোড
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 px-4 py-3">
              <p className="bn-display text-3xl font-mono tracking-wider">{refCode ?? "—"}</p>
            </div>
            <button onClick={() => refCode && copy(refCode, "code")}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-lg hover:scale-105 transition">
              {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <button onClick={() => copy(link, "link")}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30 px-3 py-2.5 text-xs font-semibold hover:bg-white/30 transition">
            {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="truncate">{link || "…"}</span>
          </button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => share("whatsapp")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-md"><MessageCircle className="h-5 w-5" /></div>
          <span className="text-xs font-semibold text-slate-700">WhatsApp</span>
        </button>
        <button onClick={() => share("facebook")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md"><Facebook className="h-5 w-5" /></div>
          <span className="text-xs font-semibold text-slate-700">Facebook</span>
        </button>
        <button onClick={() => share("telegram")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 text-white shadow-md"><Send className="h-5 w-5" /></div>
          <span className="text-xs font-semibold text-slate-700">Telegram</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200 p-4">
          <Coins className="h-5 w-5 text-emerald-600" />
          <p className="bn-display mt-2 text-2xl text-slate-900">৳{totalEarned.toFixed(2)}</p>
          <p className="text-xs text-slate-600">মোট কমিশন</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 ring-1 ring-violet-200 p-4">
          <Users className="h-5 w-5 text-violet-600" />
          <p className="bn-display mt-2 text-2xl text-slate-900">{friends.length}</p>
          <p className="text-xs text-slate-600">রেফার্ড বন্ধু</p>
        </div>
      </div>

      {/* How it works */}
      <section className="rounded-2xl bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 ring-1 ring-amber-200 p-5">
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-600" /> কিভাবে কাজ করে</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Bullet n={1} /> আপনার রেফারেল লিংক বন্ধুদের শেয়ার করুন।</li>
          <li className="flex gap-2"><Bullet n={2} /> বন্ধু রেজিস্টার ও প্যাকেজ ক্রয় করলে আপনি ৫% কমিশন পাবেন।</li>
          <li className="flex gap-2"><Bullet n={3} /> কমিশন সাথে সাথে আপনার ব্যালেন্সে যোগ হবে।</li>
        </ol>
      </section>

      {/* Friends list */}
      <div>
        <h2 className="bn-display text-lg text-slate-900">আপনার রেফার্ড বন্ধু</h2>
        <div className="mt-3 space-y-2">
          {friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              এখনো কেউ যোগ দেয়নি — শেয়ার শুরু করুন!
            </div>
          ) : friends.map((f) => (
            <div key={f.id} className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white text-sm font-bold">
                {(f.full_name ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="bn-display text-sm text-slate-900 truncate">{f.full_name || "Anonymous"}</p>
                <p className="text-[11px] text-slate-500 font-mono">{f.user_code} · {new Date(f.created_at).toLocaleDateString("bn-BD")}</p>
              </div>
              {f.has_active_package ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">প্যাকেজ ✓</span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">অপেক্ষমান</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Earnings */}
      <div>
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> কমিশন হিস্টোরি</h2>
        <div className="mt-3 space-y-2">
          {earnings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              এখনো কোনো কমিশন আয় হয়নি
            </div>
          ) : earnings.map((e) => (
            <div key={e.id} className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">{e.source ?? "package_activation"}</p>
                <p className="text-[11px] text-slate-500">{new Date(e.created_at).toLocaleString("bn-BD")}</p>
              </div>
              <p className="bn-display text-lg text-emerald-600">+৳{Number(e.amount).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bullet({ n }: { n: number }) {
  return <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[10px] font-bold text-white")}>{n}</span>;
}
