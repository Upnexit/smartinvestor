import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const versionTsPath = path.join(rootDir, "src", "config", "version.ts");
const versionJsonPath = path.join(rootDir, "public", "version.json");
const swJsPath = path.join(rootDir, "public", "sw.js");

// Read current version from src/config/version.ts
let versionTsContent = fs.readFileSync(versionTsPath, "utf-8");
const match = versionTsContent.match(/export const APP_VERSION = "([^"]+)";/);

if (!match) {
  console.error("Could not find APP_VERSION in src/config/version.ts");
  process.exit(1);
}

const currentVersion = match[1];
const parts = currentVersion.split(".").map(Number);
parts[2] = (parts[2] || 0) + 1;
const newVersion = parts.join(".");
const nowTimestamp = Date.now();
const todayBangla = new Intl.DateTimeFormat("bn-BD", {
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

console.log(`Bumping version: v${currentVersion} -> v${newVersion}`);

// Update src/config/version.ts
versionTsContent = versionTsContent.replace(
  /export const APP_VERSION = "[^"]+";/,
  `export const APP_VERSION = "${newVersion}";`
);
versionTsContent = versionTsContent.replace(
  /export const APP_BUILD_TIMESTAMP = \d+;/,
  `export const APP_BUILD_TIMESTAMP = ${nowTimestamp};`
);
fs.writeFileSync(versionTsPath, versionTsContent, "utf-8");

// Update public/version.json
const newJson = {
  version: newVersion,
  buildTimestamp: nowTimestamp,
  releaseDate: new Date().toISOString().split("T")[0],
  app: "smartinvestor",
};
fs.writeFileSync(versionJsonPath, JSON.stringify(newJson, null, 2) + "\n", "utf-8");

// Update public/sw.js header
if (fs.existsSync(swJsPath)) {
  let swContent = fs.readFileSync(swJsPath, "utf-8");
  swContent = swContent.replace(
    /\/\/ Smart Investor Service Worker - v[^\n]+/,
    `// Smart Investor Service Worker - v${newVersion}`
  );
  fs.writeFileSync(swJsPath, swContent, "utf-8");
}

console.log(`✓ Successfully bumped to version v${newVersion} (Timestamp: ${nowTimestamp})`);
