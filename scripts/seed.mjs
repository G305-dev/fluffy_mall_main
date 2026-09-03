// ─────────────────────────────────────────────────────────────
//  scripts/seed.mjs  (REPLACE the existing file with this one)
//
//  One-time import of your existing data into MongoDB Atlas.
//  Reads data/products.json, data/customers.json, data/orders.json and
//  data/settings.json and ADDS them to the database. It never overwrites
//  documents that already exist, so it is safe to re-run.
//
//  Usage (from the project root):
//      npm run seed
// ─────────────────────────────────────────────────────────────

import { MongoClient } from "mongodb";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/* Minimal .env.local loader (works on any Node version). */
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

const readJson = (rel) =>
  JSON.parse(readFileSync(path.join(process.cwd(), rel), "utf8"));

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db(dbName);

/* Unique indexes — keep lookups fast and prevent duplicates. */
const indexes = [
  ["customers", { email: 1 }, { unique: true }],
  ["orders", { id: 1 }, { unique: true }],
  ["products", { id: 1 }, { unique: true }],
  ["products", { slug: 1 }, { unique: true }],
  ["settings", { key: 1 }, { unique: true }],
];
for (const [coll, spec, opts] of indexes) {
  try {
    await db.collection(coll).createIndex(spec, opts);
  } catch {
    /* index already exists — fine */
  }
}

let p = 0, c = 0, o = 0, s = 0;

/* Products — preserve the file order via sortOrder (newest-first display). */
if (existsSync(path.join(process.cwd(), "data", "products.json"))) {
  const products = readJson("data/products.json");
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    await db.collection("products").updateOne(
      { id: product.id },
      { $setOnInsert: { ...product, sortOrder: i } },
      { upsert: true }
    );
    p++;
  }
}

/* Customers — password hashes imported as-is, so existing logins keep working. */
if (existsSync(path.join(process.cwd(), "data", "customers.json"))) {
  const customers = readJson("data/customers.json");
  for (const account of customers) {
    await db.collection("customers").updateOne(
      { email: account.email },
      { $setOnInsert: account },
      { upsert: true }
    );
    c++;
  }
}

/* Orders — history imported once; never overwritten on re-runs. */
if (existsSync(path.join(process.cwd(), "data", "orders.json"))) {
  const orders = readJson("data/orders.json");
  for (const order of orders) {
    await db.collection("orders").updateOne(
      { id: order.id },
      { $setOnInsert: order },
      { upsert: true }
    );
    o++;
  }
}

/* Settings — single document keyed "store". Admin edits then live in the DB. */
if (existsSync(path.join(process.cwd(), "data", "settings.json"))) {
  const settings = readJson("data/settings.json");
  await db.collection("settings").updateOne(
    { key: "store" },
    { $setOnInsert: { key: "store", ...settings } },
    { upsert: true }
  );
  s = 1;
}

console.log(
  `✅ Seed complete → database "${dbName}": ${p} products, ${c} customers, ${o} orders, ${s} settings doc (existing documents left untouched).`
);
await client.close();
