import { useEffect, useState } from "react";
import { ShieldAlert, AlertTriangle, Activity } from "lucide-react";

export function SecurityAlertOverlay() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    document.body.style.overflow = "hidden";
    return () => {
      clearInterval(id);
      document.body.style.overflow = "";
    };
  }, []);

  const ts = now.toISOString().replace("T", " ").slice(0, 19) + " UTC";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.25),transparent_60%)] animate-pulse" />
      <div className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-rose-950 via-red-900 to-rose-950 p-1 shadow-2xl ring-2 ring-rose-500/60">
        <div className="rounded-[22px] bg-slate-950/95 p-6 text-white">
          <div className="flex items-center gap-3 border-b border-rose-500/30 pb-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 shadow-lg shadow-rose-500/50 animate-pulse">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
                Threat Report · Priority: CRITICAL
              </p>
              <h2 className="text-lg font-black text-white">
                ⚠️ সিকিউরিটি ব্রীচ ডিটেক্টেড
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-rose-50">
            <p className="font-bold text-rose-200">
              আমাদের সিস্টেমের রিপোর্ট থেকে ধরা পড়েছে — এই সিস্টেমটি হ্যাক হয়েছে।
            </p>
            <p className="text-rose-100/90">
              এটি একটি অত্যন্ত গুরুত্বপূর্ণ বিষয়। <b>অবিলম্বে সমাধানের চেষ্টা করুন</b>,
              না হলে সিস্টেমটি সম্পূর্ণভাবে নষ্ট হয়ে যেতে পারে অথবা
              <b> permanently hack </b> হয়ে যেতে পারে।
            </p>
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-3 font-mono text-[11px] text-rose-200 space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>SOURCE : internal_report_engine</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5" />
                <span>STATUS : UNAUTHORIZED_ACCESS_DETECTED</span>
              </div>
              <div className="opacity-80">DETECTED_AT : {ts}</div>
              <div className="opacity-80">SCOPE : admin.panel · full_system</div>
            </div>
            <p className="text-xs text-rose-200/80">
              এই সতর্কবার্তা আমাদের রিপোর্ট সেকশন থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।
              দয়া করে সিস্টেম অ্যাডমিনিস্ট্রেটরের সাথে সঙ্গে সঙ্গে যোগাযোগ করুন।
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl bg-rose-500/10 px-3 py-2 ring-1 ring-rose-500/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
              Awaiting administrator action
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
