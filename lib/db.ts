// ─────────────────────────────────────────────────────────────
//  lib/db.ts  (REPLACE the existing file with this one)
//
//  Storage layer migrated to MongoDB Atlas:
//    • products  → MongoDB "products" collection
//    • orders    → MongoDB "orders" collection
//    • settings  → MongoDB "settings" collection  (single doc, key: "store")
//                   with a fallback to data/settings.json on first run.
//
//  Every function keeps the exact same name and signature as before,
//  so all existing API routes keep working WITHOUT any changes.
// ─────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import { Order, Product, StoreSettings } from "./types";
import { getDb, COLLECTIONS } from "./mongo";

const dataDir = path.join(process.cwd(), "data");

/* ─────────────────────────── helpers ─────────────────────────── */

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(dataDir, file), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Strips Mongo's `_id` (and our internal `sortOrder` / `key`) so returned
 *  objects look exactly like the old file-based ones. */
function stripMongoFields<T>(doc: Record<string, unknown> | null): T | null {
  if (!doc) return null;
  const { _id, sortOrder, key, ...rest } = doc;
  return rest as T;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ──────────────────────── settings (MongoDB) ──────────────────────── */
// Settings live in the "settings" collection as ONE document (key: "store").
// Before the first seed there's no document yet, so we fall back to the file.

export async function getSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.SETTINGS).findOne({ key: "store" });
  if (doc) {
    const { _id, key, ...rest } = doc;
    return rest as StoreSettings;
  }
  return readJson<StoreSettings>("settings.json", {} as StoreSettings);
}

export async function saveSettings(settings: StoreSettings) {
  const db = await getDb();
  await db.collection(COLLECTIONS.SETTINGS).updateOne(
    { key: "store" },
    { $set: { key: "store", ...settings } },
    { upsert: true }
  );
}

/* ──────────────────────── products (MongoDB) ──────────────────────── */

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTIONS.PRODUCTS)
    .find({})
    .sort({ sortOrder: 1, _id: 1 })
    .toArray();
  return docs.map((d) => stripMongoFields<Product>(d) as Product);
}

/** Full-replacement save: the array order becomes the display order
 *  (newest-first, matching the old `unshift` behaviour), and any document
 *  whose id is missing from the array is deleted (i.e. a removed product). */
export async function saveProducts(products: Product[]) {
  const db = await getDb();
  const col = db.collection(COLLECTIONS.PRODUCTS);
  const ids: string[] = [];
  for (let index = 0; index < products.length; index++) {
    const product = products[index];
    ids.push(product.id);
    await col.updateOne(
      { id: product.id },
      { $set: { ...product, sortOrder: index } },
      { upsert: true }
    );
  }
  await col.deleteMany({ id: { $nin: ids } });
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.PRODUCTS).findOne({ slug });
  return stripMongoFields<Product>(doc);
}

export async function getProductById(id: string) {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.PRODUCTS).findOne({ id });
  return stripMongoFields<Product>(doc);
}

/* ───────────────────────── orders (MongoDB) ───────────────────────── */

export async function getOrders(): Promise<Order[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTIONS.ORDERS)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => stripMongoFields<Order>(d) as Order);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const db = await getDb();
  const re = new RegExp("^" + escapeRegExp(email.trim()) + "$", "i");
  const docs = await db
    .collection(COLLECTIONS.ORDERS)
    .find({ "customer.email": re })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => stripMongoFields<Order>(d) as Order);
}

/** Case-insensitive lookup (same behaviour as the old file version). */
export async function getOrder(id: string) {
  const db = await getDb();
  const re = new RegExp("^" + escapeRegExp(id) + "$", "i");
  const doc = await db.collection(COLLECTIONS.ORDERS).findOne({ id: re });
  return stripMongoFields<Order>(doc);
}

export async function saveOrder(order: Order) {
  const db = await getDb();
  await db.collection(COLLECTIONS.ORDERS).updateOne(
    { id: order.id },
    { $set: order },
    { upsert: true }
  );
  return order;
}

/* ──────────────────────────── order ids ──────────────────────────── */

export function makeOrderId() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FNY-${y}${m}${day}-${rand}`;
}
