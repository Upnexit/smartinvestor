import { AlertTriangle, Database, Clock, Mail, Sparkles } from "lucide-react";

// ============================================================
// MAINTENANCE / DOWNTIME SCREEN
// To disable this screen later, open src/routes/__root.tsx and
// set: const MAINTENANCE_MODE = false;
// ============================================================
export function MaintenanceScreen() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <style>{`
        @keyframes mnt-gradient { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes mnt-blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.1)} 66%{transform:translate(-25px,15px) scale(0.95)} }
        @keyframes mnt-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes mnt-spin-slow { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes mnt-dot { 0%,20%{opacity:0.2} 50%{opacity:1} 100%{opacity:0.2} }
        .mnt-bg{background:linear-gradient(120deg,#0f172a,#1e1b4b,#312e81,#0f172a,#1e293b);background-size:400% 400%;animation:mnt-gradient 20s ease-in-out infinite}
        .mnt-blob{animation:mnt-blob 14s ease-in-out infinite}
        .mnt-pulse{animation:mnt-pulse 2.4s ease-in-out infinite}
        .mnt-spin-slow{animation:mnt-spin-slow 18s linear infinite}
        .mnt-dot{animation:mnt-dot 1.4s ease-in-out infinite}
      `}</style>

      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 mnt-bg" />
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl mnt-blob" />
        <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-sky-500/25 blur-3xl mnt-blob" style={{ animationDelay: "-5s" }} />
        <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl mnt-blob" style={{ animationDelay: "-10s" }} />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-2xl">
          {/* Brand */}
          <div className="mb-8 flex items-center justify-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 shadow-lg ring-1 ring-white/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="bn-display text-xl tracking-wide">Smart Click BD</span>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            {/* Icon */}
            <div className="relative mx-auto mb-6 h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/30 to-rose-500/30 blur-2xl mnt-pulse" />
              <div className="mnt-spin-slow absolute inset-0 rounded-full border-2 border-dashed border-white/25" />
              <div className="absolute inset-2 grid place-items-center rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 shadow-xl ring-2 ring-white/20">
                <AlertTriangle className="h-10 w-10 text-white" strokeWidth={2.2} />
              </div>
            </div>

            {/* Status pill */}
            <div className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-4 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                </span>
                সাময়িকভাবে বন্ধ • Temporarily Down
              </span>
            </div>

            {/* Title */}
            <h1 className="bn-display text-center text-3xl sm:text-4xl leading-tight">
              ওয়েবসাইটটি সাময়িকভাবে<br className="hidden sm:block" /> বন্ধ রয়েছে
            </h1>

            <p className="mt-4 text-center text-slate-300 leading-relaxed sm:text-lg">
              প্রয়োজনীয় <span className="font-semibold text-amber-300">স্টোরেজ আপগ্রেড</span> সম্পন্ন
              না হওয়ায় Smart Click BD প্ল্যাটফর্মটি সীমিত সময়ের জন্য বন্ধ রাখা হয়েছে।
              দ্রুতই আমরা আবার ফিরে আসছি।
            </p>

            {/* Info tiles */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <InfoTile
                icon={Database}
                title="কারণ"
                text="Storage limit exceeded"
                accent="from-amber-500/20 to-amber-500/5 text-amber-200 ring-amber-400/30"
              />
              <InfoTile
                icon={Clock}
                title="স্ট্যাটাস"
                text="আপগ্রেড প্রক্রিয়াধীন"
                accent="from-sky-500/20 to-sky-500/5 text-sky-200 ring-sky-400/30"
              />
              <InfoTile
                icon={Mail}
                title="সাপোর্ট"
                text="support@smartclickbd.com"
                accent="from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-200 ring-fuchsia-400/30"
              />
            </div>

            {/* Progress-like animated dots */}
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-300">
              <span>সার্ভার পুনরায় চালু করা হচ্ছে</span>
              <span className="mnt-dot">•</span>
              <span className="mnt-dot" style={{ animationDelay: "0.2s" }}>•</span>
              <span className="mnt-dot" style={{ animationDelay: "0.4s" }}>•</span>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              আপনার ধৈর্যের জন্য ধন্যবাদ। — Smart Click BD Team
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} Smart Click BD. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  title,
  text,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${accent} p-4 ring-1 backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{title}</p>
      </div>
      <p className="mt-1.5 text-sm font-medium text-white/95">{text}</p>
    </div>
  );
}
