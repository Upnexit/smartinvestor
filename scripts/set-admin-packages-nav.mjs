import fs from "node:fs";

const file = "src/components/admin/AdminLayout.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Replace /admin/ads or old packages nav with /admin/packages labeled as বিজ্ঞাপন (Ad) কন্ট্রোল
const oldAdNav = `{ to: "/admin/ads",          label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles,        accent: "amber" },`;
const oldPkgNav = `{ to: "/admin/packages",     label: "প্যাকেজ",            Icon: Package,         accent: "fuchsia" },`;

if (content.includes(oldAdNav)) {
  content = content.replace(oldAdNav, `{ to: "/admin/packages", label: "বিজ্ঞাপন (Ad) কন্ট্রোল", Icon: Sparkles, accent: "amber" },`);
}
if (content.includes(oldPkgNav)) {
  content = content.replace(oldPkgNav, "");
}

fs.writeFileSync(file, content, "utf-8");
console.log("Updated AdminLayout navigation pointing to /admin/packages");

