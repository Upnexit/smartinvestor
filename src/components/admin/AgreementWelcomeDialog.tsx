import { useEffect, useState } from "react";
import { PartyPopper, CheckCircle2, Handshake } from "lucide-react";

const STORAGE_KEY = "si_admin_agreement_welcome_v1";

export function AgreementWelcomeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const close = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 px-6 py-7 text-center text-white">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h2 className="bn-display mt-3 text-2xl">অভিনন্দন আপনাকে!</h2>
          <p className="mt-1 text-sm text-emerald-50">
            Agreement সাইন করার জন্য আন্তরিক ধন্যবাদ
          </p>
        </div>

        <div className="space-y-3 px-6 py-6">
          <p className="text-center text-sm leading-relaxed text-slate-600">
            আপনার সাথে আনুষ্ঠানিক চুক্তি সম্পন্ন হয়েছে। এখন থেকে আপনার প্ল্যাটফর্মের সকল
            সেবা স্বাভাবিকভাবে চালু থাকবে এবং আমরা পূর্ণ সাপোর্ট দিয়ে পাশে আছি।
          </p>
          <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            {[
              "সম্পূর্ণ সিস্টেম অ্যাক্সেস সচল",
              "নিয়মিত মেইনটেন্যান্স ও আপডেট",
              "ডেডিকেটেড ডেভেলপার সাপোর্ট",
            ].map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {x}
              </div>
            ))}
          </div>

          <button
            onClick={close}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-110"
          >
            <Handshake className="h-4 w-4" /> ধন্যবাদ, শুরু করি
          </button>
        </div>
      </div>
    </div>
  );
}
