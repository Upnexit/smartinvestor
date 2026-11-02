import fs from "node:fs";

const file = "src/routes/admin.ads.tsx";
let content = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n");

content = content.replace(
  `createFileRoute("/admin/tasks/ads")`,
  `createFileRoute("/admin/ads")`
);

fs.writeFileSync(file, content, "utf-8");
console.log("Updated admin.ads.tsx route path to /admin/ads");

