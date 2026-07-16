import { createFileRoute } from "@tanstack/react-router";
import { Wrench, Sparkles } from "lucide-react";

export const Route = createFileRoute("/distributor/tasks")({
  head: () => ({ meta: [{ title: "Task Management — Distributor" }] }),
  component: DistTasksComingSoon,
});

function DistTasksComingSoon() {
  return (
    <div className="grid place-items-center py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 p-[2px] shadow-xl">
        <div className="rounded-[22px] bg-white p-8 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 text-white shadow-lg">
            <Wrench className="h-8 w-8" />
          </div>
          <h1 className="bn-display mt-4 text-2xl text-slate-900">
            এই সেকশনটির কাজ চলমান
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Task Management সেকশনটি বর্তমানে upgrade ও improvement-এর কাজ চলছে।
            আমরা এই সেকশনটি লাইভ করলে আপনাদের জানিয়ে দেওয়া হবে।
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-50 to-fuchsia-50 px-4 py-2 text-xs font-bold text-fuchsia-700 ring-1 ring-fuchsia-200">
            <Sparkles className="h-4 w-4" />
            শীঘ্রই আসছে
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            ধন্যবাদ আপনার ধৈর্যের জন্য 💜
          </p>
        </div>
      </div>
    </div>
  );
}
