import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/referral")({
  head: () => ({ meta: [{ title: "referral — Smart Investor" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <h1 className="bn-display text-2xl text-slate-900 capitalize">referral</h1>
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-6 text-sm text-amber-900 flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0" />
        <span>এই পেজটি পরবর্তী ধাপে তৈরি হবে। ফাউন্ডেশন (DB + Auth + Layout) সম্পন্ন।</span>
      </div>
    </div>
  );
}
