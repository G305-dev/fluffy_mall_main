// ─────────────────────────────────────────────────────────────
//  scripts/reset.mjs  (NEW — copy into your project's `scripts/` folder)
//
//  FRESH START: deletes ALL orders and customers from the database,
//  but KEEPS products and settings.
//  Also renames the local data/orders.json and data/customers.json to
//  .bak.json so a future `npm run seed` can't accidentally re-import them.
//
//  Usage (from the project root):
//      npm run reset
//
//  ⚠️  This is destructive and cannot be undone (the .bak.json files are
//      kept locally, but the database rows are gone for good).
// ─────────────────────────────────────────────────────────────

import { MongoClient } from "mongodb";
import { readFileSync, existsSync, renameSync } from "node:fs";
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

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db(dbName);

const ordersBefore = await db.collection("orders").countDocuments();
const customersBefore = await db.collection("customers").countDocuments();

const r1 = await db.collection("orders").deleteMany({});
const r2 = await db.collection("customers").deleteMany({});

console.log(`🧹 Deleted ${r1.deletedCount} order(s)   (was ${ordersBefore})`);
console.log(`🧹 Deleted ${r2.deletedCount} customer(s) (was ${customersBefore})`);

/* Rename local JSON files so a future seed can't re-import old data. */
for (const file of ["orders.json", "customers.json"]) {
  const full = path.join(process.cwd(), "data", file);
  if (existsSync(full)) {
    const bak = full.replace(/\.json$/, ".bak.json");
    try {
      renameSync(full, bak);
      console.log(`📦 Renamed data/${file} → data/${path.basename(bak)} (backup kept locally)`);
    } catch {
      console.warn(`⚠️  Could not rename data/${file} — please delete or move it manually.`);
    }
  }
}

const products = await db.collection("products").countDocuments();
const settingsCount = await db.collection("settings").countDocuments();

console.log(`✅ Kept: ${products} product(s), ${settingsCount} settings doc(s).`);
console.log("   The database is now a clean slate for orders & customers.");
console.log("   (Remember to change CUSTOMER_SESSION_SECRET if you rotate secrets.)");
await client.close();
