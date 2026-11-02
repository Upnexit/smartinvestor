import fs from "node:fs";

const file = "src/routes/_authenticated/tasks.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. Add import for AdWatchTaskCard
content = `import { AdWatchTaskCard } from "@/components/panel/AdWatchTaskCard";\n` + content;

// 2. Put AdWatchTaskCard right after the header, and keep old manual link tasks hidden or disabled
const targetHeader = `      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">DAILY TASKS</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">আজকের টাস্ক 🎯</h1>
        <p className="mt-1 text-sm text-slate-600">প্রতিটি টাস্ক সম্পন্ন করে দৈনিক আয় বাড়ান।</p>
      </div>`;

const replacementHeader = `      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">DAILY AD REWARDS</p>
        <h1 className="bn-display mt-1 text-2xl text-slate-900 sm:text-3xl">বিজ্ঞাপন দেখে প্রতিদিন আয় 🎯</h1>
        <p className="mt-1 text-sm text-slate-600">কোনো ইনভেস্ট ছাড়া ৫০টি বিজ্ঞাপন দেখুন এবং সরাসরি আপনার অ্যাকাউন্টে ব্যালেন্স যোগ করুন।</p>
      </div>

      {/* Main Rewarded Ad Watch Section */}
      <AdWatchTaskCard />`;

content = content.replace(targetHeader, replacementHeader);

// 3. Remove lock block requiring package
const lockBlock = `      {hasActivePkg === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <Lock className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">কোন active প্যাকেজ নেই</p>
            <p className="mt-0.5 text-xs">টাস্ক করতে হলে একটি প্যাকেজ ক্রয় করুন।</p>
          </div>
          <Link to="/packages" className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">প্যাকেজ দেখুন</Link>
        </div>
      )}`;

content = content.replace(lockBlock, "");

fs.writeFileSync(file, content, "utf-8");
console.log("Updated tasks.tsx successfully");

