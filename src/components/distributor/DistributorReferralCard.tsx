import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Sparkles, Facebook, MessageCircle, Send, Share2, QrCode, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function DistributorReferralCard() {
  const [id, setId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string; district?: string; commission_rate?: number } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const site = useSiteSettings();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setId(u.user.id);
      const { data } = await supabase.from("distributors").select("full_name,district,commission_rate")
        .eq("user_id", u.user.id).maybeSingle();
      if (data) setProfile(data as never);
    })();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = id ? `${origin}/register?dist=${id}` : "";
  const shortId = id ? id.slice(0, 8).toUpperCase() : "—";

  async function copy(v: string, key: string) {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(key);
      toast.success("কপি হয়েছে");
      setTimeout(() => setCopied(null), 1500);
    } catch { /* ignore */ }
  }

  function share(platform: "whatsapp" | "facebook" | "telegram") {
    if (!link) return;
    const nm = profile?.full_name ? ` (${profile.full_name})` : "";
    const msg = encodeURIComponent(
      `${site.site_name} — ${profile?.district ?? "বাংলাদেশ"} অঞ্চলের অফিসিয়াল ডিস্ট্রিবিউটর${nm}। এই লিংক থেকে সাইনআপ করে ৳৩০০ বোনাস নিন: ${link}`,
    );
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msg}`,
    };
    window.open(urls[platform], "_blank", "noopener,noreferrer");
  }

  const qr = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(link)}&margin=6&color=6d28d9`
    : "";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="bn-display text-lg text-slate-900 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-indigo-600" /> নতুন ইউজার রেফার করুন
        </h2>
        <span className="text-[11px] font-bold rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white px-2 py-0.5">
          কমিশন {profile?.commission_rate ?? 5}%
        </span>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-pop">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-fuchsia-300/25 blur-2xl" />

        <div className="relative grid gap-4 sm:grid-cols-[1fr_auto] items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-white/85">
              <Sparkles className="h-4 w-4" /> আপনার ডিস্ট্রিবিউটর কোড
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/30 px-4 py-3">
                <p className="bn-display text-2xl font-mono tracking-widest sm:text-3xl">{shortId}</p>
                <p className="text-[10px] text-white/70 mt-1 font-mono truncate">{id ?? ""}</p>
              </div>
              <button
                onClick={() => id && copy(id, "code")}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-indigo-600 shadow-lg hover:scale-105 transition"
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
            <div className="hidden sm:flex flex-col items-center gap-1 rounded-2xl bg-white p-2 shadow-lg">
              <img src={qr} alt="QR" className="h-[130px] w-[130px]" />
              <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"><QrCode className="h-3 w-3" /> স্ক্যান করুন</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => share("whatsapp")}
          className="group flex flex-col items-center gap-1.5 rounded-2xl p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 hover:-translate-y-0.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
            <MessageCircle className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">WhatsApp</span>
        </button>
        <button onClick={() => share("facebook")}
          className="group flex flex-col items-center gap-1.5 rounded-2xl p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700 hover:-translate-y-0.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
            <Facebook className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">Facebook</span>
        </button>
        <button onClick={() => share("telegram")}
          className="group flex flex-col items-center gap-1.5 rounded-2xl p-4 text-white shadow-pop transition-all duration-300 bg-gradient-to-br from-sky-400 via-cyan-500 to-blue-600 hover:-translate-y-0.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/25 ring-1 ring-white/30 backdrop-blur">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold">Telegram</span>
        </button>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-3 text-xs text-indigo-900 flex items-start gap-2">
        <UserPlus className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
        <span>এই লিংক দিয়ে সাইনআপ করলে ইউজার স্বয়ংক্রিয়ভাবে আপনার অধীনে যুক্ত হবে এবং প্রতিটি প্যাকেজ ক্রয় থেকে {profile?.commission_rate ?? 5}% কমিশন পাবেন।</span>
      </div>
    </section>
  );
}
