import fs from "node:fs";

const file = "src/routes/index.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// 1. Update Hero Headline & Subtitle
const oldHeroHeading = `        {/* Main Animated Headline */}
        <div className="relative mt-5">
          <h1 className="bn-display text-[2.5rem] leading-[1.08] text-slate-900 sm:text-6xl md:text-7xl">
            <span className="relative inline-block">
              <span className="text-gradient">লাইক ও কমেন্ট</span>
              <span className="absolute -top-3 -right-6 hidden sm:inline-block animate-float-badge">
                <FbLikeReaction className="h-7 w-7 drop-shadow-md" />
              </span>
            </span>{" "}
            করে টাকা{" "}
            <span className="relative inline-block">
              <span className="text-gradient">ইনকাম</span>
              <span className="absolute -top-3 -right-6 hidden sm:inline-block animate-reaction-bob">
                <FbLoveReaction className="h-7 w-7 drop-shadow-md" />
              </span>
            </span>{" "}
            করুন
          </h1>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          ঘরে বসে মোবাইল দিয়ে সহজেই আয় করুন। প্রতিদিন কয়েক মিনিট কাজ করেই পেয়ে যান রিয়েল ক্যাশ —{" "}
          <span className="font-semibold text-pink-600">bKash</span>,{" "}
          <span className="font-semibold text-orange-600">Nagad</span> ও{" "}
          <span className="font-semibold text-purple-600">Rocket</span>-এ ইনস্ট্যান্ট পেমেন্ট।
        </p>`;

const newHeroHeading = `        {/* Main Animated Headline */}
        <div className="relative mt-5">
          <h1 className="bn-display text-[2.5rem] leading-[1.08] text-slate-900 sm:text-6xl md:text-7xl">
            বিজ্ঞাপন দেখে সরাসরি{" "}
            <span className="relative inline-block">
              <span className="text-gradient">ইনকাম</span>
              <span className="absolute -top-3 -right-6 hidden sm:inline-block animate-reaction-bob">
                <FbLoveReaction className="h-7 w-7 drop-shadow-md" />
              </span>
            </span>{" "}
            শুরু করুন
          </h1>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg">
          কোনো ইনভেস্টমেন্ট বা প্যাকেজ ছাড়াই ঘরে বসে মোবাইল দিয়ে প্রতিদিন ৫০টি বিজ্ঞাপন দেখে আয় করুন। কোনো ফি নেই, রেজিস্ট্রেশন করেই সঙ্গে সঙ্গে কাজ শুরু করুন —{" "}
          <span className="font-semibold text-pink-600">bKash</span>,{" "}
          <span className="font-semibold text-orange-600">Nagad</span> ও{" "}
          <span className="font-semibold text-purple-600">Rocket</span>-এ সরাসরি পেমেন্ট।
        </p>`;

if (content.includes(oldHeroHeading)) {
  content = content.replace(oldHeroHeading, newHeroHeading);
}

// 2. Update the Rate Cards
const oldRateCards = `        {/* Rate Cards with Official Emojis */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4">
          <div className="group rounded-2xl border border-blue-200/80 bg-white/95 p-5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-pop hover:border-blue-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-grid h-11 w-11 place-items-center rounded-xl bg-blue-50 shadow-soft ring-1 ring-blue-200/80">
                <FbLikeReaction className="h-7 w-7" />
              </div>
              <FacebookIcon className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-medium text-slate-600">প্রতি Facebook Like</div>
            <div className="bn-display mt-1 text-2xl sm:text-3xl text-blue-700">৳ ০.৫০</div>
          </div>

          <div className="group rounded-2xl border border-red-200/80 bg-white/95 p-5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-pop hover:border-red-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-grid h-11 w-11 place-items-center rounded-xl bg-red-50 shadow-soft ring-1 ring-red-200/80">
                <YouTubeIcon className="h-7 w-7" />
              </div>
              <FbLoveReaction className="h-5 w-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-medium text-slate-600">প্রতি YouTube Comment</div>
            <div className="bn-display mt-1 text-2xl sm:text-3xl text-red-600">৳ ১.২০</div>
          </div>
        </div>`;

const newRateCards = `        {/* Rate Cards */}
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4">
          <div className="group rounded-2xl border border-amber-200/80 bg-white/95 p-5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-pop hover:border-amber-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-grid h-11 w-11 place-items-center rounded-xl bg-amber-50 shadow-soft ring-1 ring-amber-200/80 text-amber-600 font-bold">
                AD
              </div>
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-sm font-medium text-slate-600">প্রতি বিজ্ঞাপন দেখা</div>
            <div className="bn-display mt-1 text-2xl sm:text-3xl text-amber-700">৳ ০.২০</div>
          </div>

          <div className="group rounded-2xl border border-emerald-200/80 bg-white/95 p-5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-pop hover:border-emerald-300">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 shadow-soft ring-1 ring-emerald-200/80 text-emerald-600 font-bold">
                ৫০/দিন
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-sm font-medium text-slate-600">দৈনিক বিজ্ঞাপন কোটা</div>
            <div className="bn-display mt-1 text-2xl sm:text-3xl text-emerald-600">৫০ টি</div>
          </div>
        </div>`;

if (content.includes(oldRateCards)) {
  content = content.replace(oldRateCards, newRateCards);
}

// 3. Replace Earnings (Packages) section with Free Ad Earning steps
const oldEarnings = `function Earnings() {`;
const earningIndex = content.indexOf(oldEarnings);
if (earningIndex !== -1) {
  const earningEnd = content.indexOf(`/* ---------------- 7. Products ---------------- */`, earningIndex);
  if (earningEnd !== -1) {
    const newAdSection = `function Earnings() {
  return (
    <section id="earning" className="bg-honey px-4 py-20 sm:px-6">
      <Heading
        eyebrow="বিজ্ঞাপন থেকে আয়" eyebrowColor="amber"
        title="কোনো ইনভেস্ট ছাড়াই ফ্রি ইনকাম শুরু করুন"
        sub="Smart Click BD-তে কাজ শুরু করতে কোনো টাকা বা প্যাকেজ কিনতে হয় না। সম্পূর্ণ বিনামূল্যে রেজিস্ট্রেশন করে আজ থেকেই আয় শুরু করুন।"
      />
      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-soft text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-700 font-extrabold text-xl mb-4">
            ১
          </div>
          <h3 className="bn-display text-xl text-slate-800">ফ্রি একাউন্ট খুলুন</h3>
          <p className="mt-2 text-sm text-slate-600">
            ১ মিনিটের মধ্যে আপনার নাম ও ফোন নম্বর দিয়ে একাউন্ট তৈরি করুন। কোনো রেজিস্ট্রেশন ফি নেই।
          </p>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-soft text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-700 font-extrabold text-xl mb-4">
            ২
          </div>
          <h3 className="bn-display text-xl text-slate-800">বিজ্ঞাপন দেখুন</h3>
          <p className="mt-2 text-sm text-slate-600">
            প্রতিদিন ৫০টি বিজ্ঞাপন দেখুন। প্রতিটি বিজ্ঞাপন ২০ সেকেন্ড দেখার সাথে সাথে একাউন্টে টাকা যোগ হবে।
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-soft text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold text-xl mb-4">
            ৩
          </div>
          <h3 className="bn-display text-xl text-slate-800">সরাসরি উইথড্র নিন</h3>
          <p className="mt-2 text-sm text-slate-600">
            আপনার অর্জিত টাকা যেকোনো সময় bKash, Nagad কিংবা Rocket-এ সরাসরি উত্তোলন করে নিন।
          </p>
        </div>
      </div>

      <div className="mx-auto mt-12 flex justify-center">
        <Link to="/register" className="btn-gold text-base px-8 py-3.5 shadow-lg shadow-amber-500/30">
          এখনই বিনামূল্যে শুরু করুন →
        </Link>
      </div>
    </section>
  );
}

`;
    content = content.substring(0, earningIndex) + newAdSection + content.substring(earningEnd);
  }
}

fs.writeFileSync(file, content, "utf-8");
console.log("Updated index.tsx successfully");

