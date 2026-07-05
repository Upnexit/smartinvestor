import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Smartphone, Wifi, Zap, CheckCircle2, ArrowLeft, Share2 } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/install")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "অ্যাপ ইনস্টল করুন — Smart Investor" },
      { name: "description", content: "Smart Investor মোবাইল অ্যাপ এক ক্লিকে ইনস্টল করুন এবং অফলাইনেও ব্যবহার করুন।" },
      { property: "og:title", content: "Smart Investor অ্যাপ ডাউনলোড করুন" },
      { property: "og:description", content: "এক ক্লিকে ইনস্টল করে হোম স্ক্রিন থেকে ব্যবহার করুন।" },
      { property: "og:url", content: "/install" },
    ],
    links: [{ rel: "canonical", href: "/install" }],
  }),
  component: InstallPage,
});

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function InstallPage() {
  const { site_name, logo_url } = useSiteSettings();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS standalone
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  };

  const canPrompt = !!deferred && !installed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> হোমে ফিরুন
        </Link>

        {/* Card */}
        <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-amber-100">
          {/* Hero */}
          <div
            className="relative px-6 pt-8 pb-6 text-center text-white"
            style={{ backgroundImage: "linear-gradient(135deg, #f59e0b 0%, #f97316 55%, #e11d48 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-yellow-300/30 blur-3xl" />
            <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-white p-2 shadow-2xl ring-4 ring-white/40">
              {logo_url ? (
                <img
                  src={logo_url}
                  alt={`${site_name} লোগো`}
                  className="h-full w-full rounded-2xl object-cover"
                />
              ) : (
                <img
                  src="/app-icon-512.png"
                  alt="Smart Investor"
                  className="h-full w-full rounded-2xl object-cover"
                />
              )}
            </div>
            <h1 className="bn-display mt-4 text-2xl font-bold">{site_name || "Smart Investor"}</h1>
            <p className="mt-1 text-sm text-white/90">অফিসিয়াল মোবাইল অ্যাপ</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" /> ফ্রি ইনস্টল • কোনো Play Store লাগবে না
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {installed ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <p className="bn-display mt-2 text-base font-bold text-emerald-900">
                  অ্যাপ ইনস্টল হয়ে গিয়েছে
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  আপনার হোম স্ক্রিনের আইকন থেকে অ্যাপটি খুলুন।
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={handleInstall}
                  disabled={!canPrompt || busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  <Download className="h-5 w-5" />
                  {busy ? "ইনস্টল হচ্ছে…" : "Click to Install"}
                </button>

                {!canPrompt && (
                  <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                    {platform === "ios" ? (
                      <>
                        <p className="bn-display font-bold">iPhone / iPad — ম্যানুয়াল ইনস্টল:</p>
                        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed">
                          <li>Safari ব্রাউজারে এই পেজটি খুলুন।</li>
                          <li>নিচের <Share2 className="inline h-3.5 w-3.5" /> Share বাটনে ট্যাপ করুন।</li>
                          <li>“Add to Home Screen” সিলেক্ট করুন।</li>
                        </ol>
                      </>
                    ) : platform === "android" ? (
                      <p className="text-[13px] leading-relaxed">
                        Chrome ব্রাউজারে এই পেজটি খুললে ইনস্টল বাটন এনাবল হবে। মেনু (⋮) → <b>“Install app”</b> / <b>“Add to Home Screen”</b> থেকেও ইনস্টল করতে পারেন।
                      </p>
                    ) : (
                      <p className="text-[13px] leading-relaxed">
                        Chrome / Edge ব্রাউজারে অ্যাড্রেস বারের ডান পাশে <b>Install</b> আইকন ক্লিক করুন।
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Features */}
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <Feature icon={<Smartphone className="h-5 w-5" />} label="নেটিভ ফিল" />
              <Feature icon={<Wifi className="h-5 w-5" />} label="অফলাইন সাপোর্ট" />
              <Feature icon={<Zap className="h-5 w-5" />} label="দ্রুত লোড" />
            </div>

            <ul className="mt-6 space-y-2 text-sm text-slate-700">
              <Bullet>হোম স্ক্রিনে অ্যাপ আইকন যোগ হবে।</Bullet>
              <Bullet>ইন্টারনেট ছাড়াও অ্যাপ ওপেন হবে (ক্যাশড পেজ)।</Bullet>
              <Bullet>ব্রাউজারের অ্যাড্রেস বার ছাড়া ফুলস্ক্রিন অভিজ্ঞতা।</Bullet>
              <Bullet>ফাইল সাইজ প্রায় শূন্য — ডেটা বাঁচবে।</Bullet>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {site_name || "Smart Investor"} — সকল অধিকার সংরক্ষিত।
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white text-amber-600 shadow-soft">
        {icon}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}
