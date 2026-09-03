// ─────────────────────────────────────────────────────────────
//  scripts/db-check.mjs  (NEW — copy into your project's `scripts/` folder)
//  Quick connectivity test: does NOT touch any data, just connects and
//  counts documents. Run it before `npm run seed` to see a clear error.
//
//  Usage (from the project root):
//      node scripts/db-check.mjs
// ─────────────────────────────────────────────────────────────

import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "fluffy_mall";

if (!uri) {
  console.error("❌ MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}

if (uri.includes("+srv")) {
  console.warn(
    "⚠️  You are still using mongodb+srv:// — if this fails with 'querySrv',\n" +
    "   switch to the mongodb:// string (without +srv)."
  );
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
try {
  await client.connect();
  const db = client.db(dbName);
  const counts = {};
  for (const c of ["products", "customers", "orders"]) {
    counts[c] = await db.collection(c).countDocuments();
  }
  console.log(`✅ CONNECTED OK — database: ${dbName}`);
  console.log(
    `   products: ${counts.products} | customers: ${counts.customers} | orders: ${counts.orders}`
  );
} catch (err) {
  console.error("❌ Connection failed:", err.message);
  process.exit(1);
} finally {
  await client.close();
}
