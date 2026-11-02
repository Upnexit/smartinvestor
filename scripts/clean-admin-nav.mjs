import fs from "node:fs";

const file = "src/components/admin/AdminLayout.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Replace the duplicate in children of /admin/tasks
const oldTaskBlock = `  { to: "/admin/ads",          label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },
  { to: "/admin/tasks",        label: "টাস্ক লিংক (স্থগিত)",  Icon: ListChecks,      accent: "rose",
    children: [
      { to: "/admin/ads", label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles },
      { to: "/admin/tasks", label: "টাস্ক লিংক ম্যানেজমেন্ট", Icon: ListChecks },
      { to: "/admin/tasks/daily-report", label: "দৈনিক রিপোর্ট", Icon: CalendarDays },
      { to: "/admin/tasks/distributor-activity", label: "ডিস্ট্রিবিউটর কার্যক্রম", Icon: Activity },
    ] },`;

const newTaskBlock = `  { to: "/admin/ads",          label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },
  { to: "/admin/tasks",        label: "টাস্ক লিংক (স্থগিত)",  Icon: ListChecks,      accent: "rose",
    children: [
      { to: "/admin/tasks", label: "টাস্ক লিংক ম্যানেজমেন্ট", Icon: ListChecks },
      { to: "/admin/tasks/daily-report", label: "দৈনিক রিপোর্ট", Icon: CalendarDays },
      { to: "/admin/tasks/distributor-activity", label: "ডিস্ট্রিবিউটর কার্যক্রম", Icon: Activity },
    ] },`;

content = content.replace(oldTaskBlock, newTaskBlock);

fs.writeFileSync(file, content, "utf-8");
console.log("Cleaned AdminLayout menu: ad control is now pure standalone main menu");

