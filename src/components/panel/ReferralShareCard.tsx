import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Sparkles, Facebook, MessageCircle, Send, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { compact?: boolean };

export function ReferralShareCard({ compact = false }: Props) {
  const [refCode, setRefCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p) setRefCode(p.referral_code);
    })();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = refCode ? `${origin}/register?ref=${refCode}` : "";

  async function copy(v: string, key: string) {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(key);
      toast.success("কপি হয়েছে");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  function share(platform: "whatsapp" | "facebook" | "telegram") {
    if (!link) return;
    const msg = encodeURIComponent(
      `Smart Investor — ঘরে বসে লাইক/কমেন্ট করে আয় করুন! আমার রেফারেল লিংক: ${link}`,
    );
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <section className="space-y-3">
      {compact && (
        <div className="flex items-center justify-between">
          <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-violet-600" /> রেফার করে আয় করুন
          </h2>
          <span className="text-[11px] font-bold text-violet-700">৫% কমিশন</span>
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs text-white/85">
            <Sparkles className="h-4 w-4" /> আপনার রেফারেল কোড
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 px-4 py-3">
              <p className="bn-display text-2xl font-mono tracking-wider sm:text-3xl">{refCode ?? "—"}</p>
            </div>
            <button
              onClick={() => refCode && copy(refCode, "code")}
              className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-lg hover:scale-105 transition"
              aria-label="কোড কপি"
            >
              {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <button
            onClick={() => link && copy(link, "link")}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 backdrop-blur ring-1 ring-white/30 px-3 py-2.5 text-xs font-semibold hover:bg-white/30 transition"
          >
            {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="truncate">{link || "…"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => share("whatsapp")}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-md">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">WhatsApp</span>
        </button>
        <button
          onClick={() => share("facebook")}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
            <Facebook className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Facebook</span>
        </button>
        <button
          onClick={() => share("telegram")}
          className="flex flex-col items-center gap-1.5 rounded-2xl bg-white ring-1 ring-slate-200 p-4 shadow-soft hover:shadow-pop transition"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-600 text-white shadow-md">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Telegram</span>
        </button>
      </div>
    </section>
  );
}
