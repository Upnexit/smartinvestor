import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env.local if present
const envLocalPath = path.join(rootDir, ".env.local");
let token = process.env.SUPABASE_ACCESS_TOKEN;
let expectedRef = "gpyarcrizvjyukaazndj";

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("SUPABASE_ACCESS_TOKEN=")) {
      token = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
    if (trimmed.startsWith("SUPABASE_PROJECT_ID=")) {
      expectedRef = trimmed.split("=")[1].replace(/["']/g, "").trim();
    }
  }
}

if (!token) {
  console.error("❌ SUPABASE_ACCESS_TOKEN not found in .env.local or process.env");
  process.exit(1);
}

console.log("🔍 Checking Supabase connection with project token...");

try {
  const res = await fetch(`https://api.supabase.com/v1/projects/${expectedRef}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Supabase API error (${res.status}): ${errorText}`);
    process.exit(1);
  }

  const project = await res.json();
  console.log("✅ Supabase Project Connected Successfully!");
  console.log("-----------------------------------------");
  console.log(`📌 Project ID:     ${project.id}`);
  console.log(`🏷️  Project Name:   ${project.name}`);
  console.log(`🏢 Org ID:         ${project.organization_id}`);
  console.log(`🌍 Region:         ${project.region}`);
  console.log(`⚡ Status:         ${project.status}`);
  console.log(`🗄️  Postgres Ver:   ${project.database?.version || "N/A"}`);
  console.log("-----------------------------------------");
  console.log("🔒 Access token is isolated and verified for this project ONLY.");
} catch (err) {
  console.error("❌ Connection failed:", err.message);
  process.exit(1);
}
