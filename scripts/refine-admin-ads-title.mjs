import fs from "node:fs";

const file = "src/routes/admin.ads.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

// Make sure the header reads explicitly as requested
content = content.replace(
  `title="অ্যাড কন্ট্রোল প্যানেল"`,
  `title="বিজ্ঞাপন (Ad) ও ভেরিফিকেশন কন্ট্রোল"`
);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated admin.ads.tsx title");

