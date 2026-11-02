import fs from "node:fs";

const file = "src/components/admin/AdminLayout.tsx";
let content = fs.readFileSync(file, "utf-8");

const oldText = `{ to: "/admin/tasks",        label: "টাস্ক লিংক",          Icon: ListChecks,      accent: "rose",
    children: [
      { to: "/admin/tasks", label: "টাস্ক লিংক ম্যানেজমেন্ট", Icon: ListChecks },
      { to: "/admin/tasks/daily-report", label: "দৈনিক রিপোর্ট", Icon: CalendarDays },
      { to: "/admin/tasks/distributor-activity", label: "ডিস্ট্রিবিউটর কার্যক্রম", Icon: Activity },
    ] },`;

const newText = `{ to: "/admin/tasks/ads",    label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },
  { to: "/admin/tasks",        label: "টাস্ক লিংক (স্থগিত)",  Icon: ListChecks,      accent: "rose",
    children: [
      { to: "/admin/tasks/ads", label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles },
      { to: "/admin/tasks", label: "টাস্ক লিংক ম্যানেজমেন্ট", Icon: ListChecks },
      { to: "/admin/tasks/daily-report", label: "দৈনিক রিপোর্ট", Icon: CalendarDays },
      { to: "/admin/tasks/distributor-activity", label: "ডিস্ট্রিবিউটর কার্যক্রম", Icon: Activity },
    ] },`;

// Normalize \r\n to \n for matching then write
const normalizedOld = oldText.replace(/\r\n/g, "\n");
const normalizedContent = content.replace(/\r\n/g, "\n");

if (normalizedContent.includes(normalizedOld)) {
  const updated = normalizedContent.replace(normalizedOld, newText);
  fs.writeFileSync(file, updated, "utf-8");
  console.log("Successfully updated AdminLayout.tsx");
} else {
  console.log("Old text could not be found");
}

