import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Order, Product, StoreSettings } from "./types";
import { getDb, COLLECTIONS } from "./mongo";
import { nativeItemCode } from "./native-item-codes";
import { nativePosControl } from "./native-pos";

const dataDir = path.join(process.cwd(), "data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(dataDir, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

// Historical integration fields may remain in Mongo for audit. They are not
// returned to the website or reused as product identifiers.
function withoutLegacy<T>(doc: Record<string, unknown> | null): T | null {
  if (!doc) return null;
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (
      key === "_id" ||
      key === "sortOrder" ||
      key === "key" ||
      key.toLowerCase().startsWith("tracepos")
    ) continue;
    rest[key] = value;
  }
  if (Array.isArray(rest.variants)) {
    rest.variants = rest.variants.map((variant: Record<string, unknown>) => {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(variant)) {
        if (!key.toLowerCase().startsWith("tracepos")) clean[key] = value;
      }
      return clean;
    });
  }
  return rest as T;
}

function productFromDoc(doc: Record<string, unknown> | null): Product | null {
  const product = withoutLegacy<Product>(doc);
  if (product?.id) product.itemCode = nativeItemCode(product.id);
  return product;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getSettings(): Promise<StoreSettings> {
  const db = await getDb();
  const doc = await db.collection(COLLECTIONS.SETTINGS).findOne({ key: "store" });
  if (doc) return withoutLegacy<StoreSettings>(doc) as StoreSettings;
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

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTIONS.PRODUCTS)
    .find({})
    .sort({ sortOrder: 1, _id: 1 })
    .toArray();
  return docs.map((doc) => productFromDoc(doc) as Product);
}

// Older admin screens submit the whole catalogue. Once the cashier is active,
// reject deletion or stock rewrites rather than overwriting a concurrent sale.
// Stock corrections go through the audited POS adjustment endpoint.
export async function saveProducts(products: Product[]) {
  const db = await getDb();
  const collection = db.collection(COLLECTIONS.PRODUCTS);
  const input = new Map<string, Product>();

  for (const product of products) {
    if (!product.id || input.has(product.id))
      throw new Error("Missing or duplicate product ID.");
    input.set(product.id, product);
  }

  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      // Check the mode inside the transaction. An in-flight bulk edit must not
      // overwrite stock after activation or after a concurrent cashier sale.
      const active = Boolean(await nativePosControl(db, session));
      const oldDocs = await collection.find({}, { session }).toArray();

      if (active && oldDocs.some((old) => !input.has(String(old.id)))) {
        throw new Error(
          "Deleting products from bulk edit is disabled while POS is active. Preserve sale history."
        );
      }

      const byId = new Map(oldDocs.map((old) => [String(old.id), old]));
      const ids: string[] = [];

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        ids.push(product.id);
        const old = byId.get(product.id);
        const clean = withoutLegacy<Product>(
          product as unknown as Record<string, unknown>
        ) as Product;
        const data = {
          ...clean,
          itemCode: nativeItemCode(product.id),
          sortOrder: i,
        };

        if (active && old) {
          const before = old as unknown as Product;
          if (
            product.stock !== before.stock ||
            (product.variants || []).length !== (before.variants || []).length ||
            (product.variants || []).some(
              (variant) =>
                !before.variants?.some(
                  (prior) =>
                    prior.id === variant.id &&
                    prior.stock === variant.stock
                )
            )
          ) {
            throw new Error(
              `Stock or variants changed for ${product.name}. Use audited POS stock adjustments for standard products; options are paused.`
            );
          }
        }

        if (old) {
          const updated = await collection.updateOne(
            { id: product.id, stock: old.stock },
            {
              $set: data,
              $unset: { traceposItemCode: "" },
            },
            { session }
          );
          if (updated.matchedCount !== 1)
            throw new Error(`${product.name} changed. Refresh and retry.`);
        } else {
          if (!Number.isSafeInteger(product.stock))
            throw new Error("New product stock must be a whole number.");

          await collection.insertOne(data, { session });

          if (active) {
            await db.collection<{
              _id: string;
              [key: string]: unknown;
            }>("inventory_movements").insertOne(
              {
                _id: `create:${product.id}`,
                type: "product_added",
                productId: product.id,
                itemCode: nativeItemCode(product.id),
                productName: product.name,
                quantityChange: product.stock,
                resultingStock: product.stock,
                reason: "New product added in admin",
                createdAt: new Date().toISOString(),
              },
              { session }
            );
          }
        }
      }

      if (!active)
        await collection.deleteMany({ id: { $nin: ids } }, { session });
    });
  } finally {
    await session.endSession();
  }
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  return productFromDoc(
    await db.collection(COLLECTIONS.PRODUCTS).findOne({ slug })
  );
}

export async function getProductById(id: string) {
  const db = await getDb();
  return productFromDoc(
    await db.collection(COLLECTIONS.PRODUCTS).findOne({ id })
  );
}

export async function getOrders(): Promise<Order[]> {
  const db = await getDb();
  const docs = await db.collection(COLLECTIONS.ORDERS)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => withoutLegacy<Order>(doc) as Order);
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  const db = await getDb();
  const expression = new RegExp(
    "^" + escapeRegExp(email.trim()) + "$",
    "i"
  );
  const docs = await db.collection(COLLECTIONS.ORDERS)
    .find({ "customer.email": expression })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => withoutLegacy<Order>(doc) as Order);
}

export async function getOrder(id: string) {
  const db = await getDb();
  const expression = new RegExp(
    "^" + escapeRegExp(id) + "$",
    "i"
  );
  return withoutLegacy<Order>(
    await db.collection(COLLECTIONS.ORDERS).findOne({ id: expression })
  );
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

export function makeOrderId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `FNY-${year}${month}${day}-${random}`;
}