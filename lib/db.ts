import { promises as fs } from "fs";
import path from "path";
import {
  Order,
  Product,
  StoreSettings,
} from "./types";
import { getDb, COLLECTIONS } from "./mongo";

const dataDir = path.join(process.cwd(), "data");

async function readJson<T>(
  file: string,
  fallback: T
): Promise<T> {
  try {
    const raw = await fs.readFile(
      path.join(dataDir, file),
      "utf8"
    );

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function stripMongoFields<T>(
  doc: Record<string, unknown> | null
): T | null {
  if (!doc) return null;

  const {
    _id,
    sortOrder,
    key,
    ...rest
  } = doc;

  return rest as T;
}

function escapeRegExp(s: string): string {
  return s.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/* Settings */

export async function getSettings(): Promise<StoreSettings> {
  const db = await getDb();

  const doc = await db
    .collection(COLLECTIONS.SETTINGS)
    .findOne({ key: "store" });

  if (doc) {
    const {
      _id,
      key,
      ...rest
    } = doc;

    return rest as StoreSettings;
  }

  return readJson<StoreSettings>(
    "settings.json",
    {} as StoreSettings
  );
}

export async function saveSettings(
  settings: StoreSettings
) {
  const db = await getDb();

  await db
    .collection(COLLECTIONS.SETTINGS)
    .updateOne(
      { key: "store" },
      {
        $set: {
          key: "store",
          ...settings,
        },
      },
      { upsert: true }
    );
}

/* Products */

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();

  const docs = await db
    .collection(COLLECTIONS.PRODUCTS)
    .find({})
    .sort({
      sortOrder: 1,
      _id: 1,
    })
    .toArray();

  return docs.map(
    (doc) =>
      stripMongoFields<Product>(doc) as Product
  );
}

export async function saveProducts(
  products: Product[]
) {
  const db = await getDb();
  const collection = db.collection(
    COLLECTIONS.PRODUCTS
  );

  const ids: string[] = [];

  for (let index = 0; index < products.length; index++) {
    const product = products[index];

    ids.push(product.id);

    await collection.updateOne(
      { id: product.id },
      {
        $set: {
          ...product,
          sortOrder: index,
        },
      },
      { upsert: true }
    );
  }

  await collection.deleteMany({
    id: {
      $nin: ids,
    },
  });
}

export async function getProductBySlug(
  slug: string
) {
  const db = await getDb();

  const doc = await db
    .collection(COLLECTIONS.PRODUCTS)
    .findOne({ slug });

  return stripMongoFields<Product>(doc);
}

export async function getProductById(
  id: string
) {
  const db = await getDb();

  const doc = await db
    .collection(COLLECTIONS.PRODUCTS)
    .findOne({ id });

  return stripMongoFields<Product>(doc);
}

/* Orders */

export async function getOrders(): Promise<Order[]> {
  const db = await getDb();

  const docs = await db
    .collection(COLLECTIONS.ORDERS)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(
    (doc) =>
      stripMongoFields<Order>(doc) as Order
  );
}

export async function getOrdersByEmail(
  email: string
): Promise<Order[]> {
  const db = await getDb();

  const expression = new RegExp(
    "^" + escapeRegExp(email.trim()) + "$",
    "i"
  );

  const docs = await db
    .collection(COLLECTIONS.ORDERS)
    .find({
      "customer.email": expression,
    })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(
    (doc) =>
      stripMongoFields<Order>(doc) as Order
  );
}

export async function getOrder(id: string) {
  const db = await getDb();

  const expression = new RegExp(
    "^" + escapeRegExp(id) + "$",
    "i"
  );

  const doc = await db
    .collection(COLLECTIONS.ORDERS)
    .findOne({
      id: expression,
    });

  return stripMongoFields<Order>(doc);
}

export async function saveOrder(order: Order) {
  const db = await getDb();

  await db
    .collection(COLLECTIONS.ORDERS)
    .updateOne(
      { id: order.id },
      { $set: order },
      { upsert: true }
    );

  return order;
}

/*
 * Claims an order for Tracepos sale synchronization.
 *
 * Only one payment callback can claim the order at a time.
 * A processing claim older than ten minutes can be retried.
 */
export async function claimTraceposSale(
  orderId: string,
  orderReference: string
) {
  const db = await getDb();

  const staleBefore = new Date(
    Date.now() - 10 * 60 * 1000
  ).toISOString();

  const orderIdRegex = new RegExp(
    "^" + escapeRegExp(orderId) + "$",
    "i"
  );

  const document =
    await db
      .collection(COLLECTIONS.ORDERS)
      .findOneAndUpdate(
        {
          id: orderIdRegex,
          $or: [
            {
              traceposSaleStatus: {
                $exists: false,
              },
            },
            {
              traceposSaleStatus: "failed",
            },
            {
              traceposSaleStatus: "processing",
              traceposSaleAttemptedAt: {
                $lt: staleBefore,
              },
            },
          ],
        },
        {
          $set: {
            traceposSaleStatus: "processing",
            traceposSaleReference: orderReference,
            traceposSaleAttemptedAt:
              new Date().toISOString(),
          },
          $unset: {
            traceposSaleError: "",
          },
        },
        {
          returnDocument: "after",
          includeResultMetadata: false,
        }
      );

  return stripMongoFields<Order>(
    document as Record<string, unknown> | null
  );
}

export async function markTraceposSaleSynced(
  orderId: string,
  details: {
    orderReference: string;
    invoiceNumber?: string;
  }
) {
  const db = await getDb();

  const orderIdRegex = new RegExp(
    "^" + escapeRegExp(orderId) + "$",
    "i"
  );

  const updates: Record<string, unknown> = {
    traceposSaleStatus: "synced",
    traceposSaleReference:
      details.orderReference,
    traceposSaleSyncedAt:
      new Date().toISOString(),
  };

  if (details.invoiceNumber) {
    updates.traceposSaleInvoiceNumber =
      details.invoiceNumber;
  }

  await db
    .collection(COLLECTIONS.ORDERS)
    .updateOne(
      { id: orderIdRegex },
      {
        $set: updates,
        $unset: {
          traceposSaleError: "",
        },
      }
    );
}

export async function markTraceposSaleFailed(
  orderId: string,
  errorMessage: string
) {
  const db = await getDb();

  const orderIdRegex = new RegExp(
    "^" + escapeRegExp(orderId) + "$",
    "i"
  );

  await db
    .collection(COLLECTIONS.ORDERS)
    .updateOne(
      { id: orderIdRegex },
      {
        $set: {
          traceposSaleStatus: "failed",
          traceposSaleError:
            errorMessage.slice(0, 1000),
          traceposSaleAttemptedAt:
            new Date().toISOString(),
        },
      }
    );
}

/* Order IDs */

export function makeOrderId() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const random = Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `FNY-${year}${month}${day}-${random}`;
}