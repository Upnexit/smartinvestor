import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Sparkles, Facebook, MessageCircle, Send, Share2, Instagram, Twitter, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { compact?: boolean };

type Platform = "whatsapp" | "facebook" | "telegram" | "messenger" | "instagram" | "twitter";

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

  const qr = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&margin=8&color=6d28d9`
    : "";

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

  function share(platform: Platform) {
    if (!link) return;
    const text = `Smart Click BD — ঘরে বসে লাইক/কমেন্ট করে আয় করুন! আমার রেফারেল লিংক: ${link}`;
    const msg = encodeURIComponent(text);
    const urls: Record<Platform, string> = {
      whatsapp: `https://wa.me/?text=${msg}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
      messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(link)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${msg}`,
      instagram: "",
    };
    if (platform === "instagram") {
      copy(text, "insta");
      toast.info("লিংক কপি হয়েছে — Instagram-এ পেস্ট করুন");
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      return;
    }
    window.open(urls[platform], "_blank", "noopener,noreferrer");
  }

  const buttons: { key: Platform; label: string; gradient: string; Icon: typeof MessageCircle }[] = [
    { key: "whatsapp", label: "WhatsApp", gradient: "from-green-400 via-emerald-500 to-teal-600", Icon: MessageCircle },
    { key: "facebook", label: "Facebook", gradient: "from-blue-500 via-indigo-600 to-violet-700", Icon: Facebook },
    { key: "telegram", label: "Telegram", gradient: "from-sky-400 via-cyan-500 to-blue-600", Icon: Send },
    { key: "messenger", label: "Messenger", gradient: "from-sky-500 via-blue-500 to-purple-600", Icon: MessageCircle },
    { key: "instagram", label: "Instagram", gradient: "from-yellow-400 via-pink-500 to-purple-600", Icon: Instagram },
    { key: "twitter", label: "Twitter/X", gradient: "from-slate-700 via-slate-800 to-black", Icon: Twitter },
  ];

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
        <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] items-center">
          <div className="min-w-0">
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

          {qr && (
            <div className="hidden sm:flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-xl ring-2 ring-white/60">
              <div className="rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 p-1.5 ring-1 ring-violet-200">
                <img src={qr} alt="QR" className="h-[130px] w-[130px] rounded-lg" />
              </div>
              <span className="text-[10px] font-bold text-violet-700 flex items-center gap-1"><QrCode className="h-3 w-3" /> স্ক্যান করুন</span>
            </div>
          )}
        </div>
      </div>

      {qr && (
        <div className="sm:hidden flex justify-center">
          <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-pop ring-1 ring-violet-200">
            <div className="rounded-xl bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 p-1.5 ring-1 ring-violet-200">
              <img src={qr} alt="QR" className="h-[140px] w-[140px] rounded-lg" />
            </div>
            <span className="text-[10px] font-bold text-violet-700 flex items-center gap-1"><QrCode className="h-3 w-3" /> স্ক্যান করে জয়েন করুন</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {buttons.map(({ key, label, gradient, Icon }) => (
          <button
            key={key}
            onClick={() => share(key)}
            className={`group flex flex-col items-center gap-1.5 rounded-2xl p-3 sm:p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br ${gradient} hover:-translate-y-0.5`}
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
