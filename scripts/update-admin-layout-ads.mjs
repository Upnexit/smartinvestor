import fs from "node:fs";

const file = "src/components/admin/AdminLayout.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// In NAV items: update /admin/tasks/ads to /admin/ads
content = content.replace(
  `{ to: "/admin/tasks/ads",    label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },`,
  `{ to: "/admin/ads",          label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },`
);
content = content.replace(
  `{ to: "/admin/tasks/ads", label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles },`,
  `{ to: "/admin/ads", label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles },`
);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated AdminLayout to point to /admin/ads");

