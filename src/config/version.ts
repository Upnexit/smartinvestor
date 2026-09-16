// Central application version & release metadata.
// This is updated on releases so the system can auto-detect updates
// and display the professional release notes to admins.

export const APP_VERSION = "2.5.1";
export const APP_BUILD_DATE = "১৬ সেপ্টেম্বর, ২০২৬";
export const APP_BUILD_TIMESTAMP = 1789551444373;

export type ReleaseHighlight = {
  icon: string;
  title: string;
  desc: string;
  tag?: string;
};

export type ReleaseInfo = {
  version: string;
  name: string;
  date: string;
  summary: string;
  highlights: ReleaseHighlight[];
};

export const CURRENT_RELEASE_INFO: ReleaseInfo = {
  version: APP_VERSION,
  name: "স্মার্ট ইনভেস্টর v2.5.0 অটো-আপডেট ও সিকিউরিটি রিলিজ",
  date: APP_BUILD_DATE,
  summary: "এই সংস্করণে কোনো প্রকার হার্ড-রিফ্রেশ ছাড়া অটো-আপডেট ইঞ্জিন, চেকআউট স্ক্রিনশট প্রিভিউ ও পার্মানেন্ট ইউজার ডিলিট সিস্টেম যুক্ত করা হয়েছে।",
  highlights: [
    {
      icon: "zap",
      title: "অটো-আপডেট ইঞ্জিন (ক্যাশিং সমস্যা সমাধান)",
      desc: "ডেস্কটপ ও মোবাইলে এখন ব্রাউজার ক্যাশ ক্লিয়ার বা হার্ড-রিফ্রেশ ছাড়াই স্বয়ংক্রিয়ভাবে নতুন আপডেট তাৎক্ষণিক কার্যকর হবে।",
      tag: "কোর ইঞ্জিন",
    },
    {
      icon: "camera",
      title: "পেমেন্ট স্ক্রিনশট ভেরিফিকেশন",
      desc: "প্যাকেজ কেনার সময় ইউজারদের পেমেন্ট স্লিপের স্ক্রিনশট আপলোড এবং অ্যাডমিন প্যানেলে সরাসরি ফুল-স্ক্রিন প্রিভিউ সুবিধা।",
      tag: "চেকআউট",
    },
    {
      icon: "shield",
      title: "পার্মানেন্ট ইউজার ডিলিট ও অথ পার্জ",
      desc: "অ্যাডমিন প্যানেল থেকে কোনো ইউজার ডিলিট করলে ডাটাবেসের পাশাপাশি Supabase Auth থেকেও চিরতরে একাউন্ট মুছে যাবে।",
      tag: "নিরাপত্তা",
    },
    {
      icon: "sparkles",
      title: "সেন্ট্রাল ভার্সন ট্র্যাকিং ও অ্যাডমিন নোটিস",
      desc: "ইউজার ও অ্যাডমিন প্যানেলে লাইভ ভার্সন প্রদর্শন এবং অ্যাডমিন লগইনে নতুন ফিচারের প্রফেশনাল ওয়েলকাম ডায়ালগ।",
      tag: "ইউজার ইন্টারফেস",
    },
  ],
};
