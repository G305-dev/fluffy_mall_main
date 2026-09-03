// ─────────────────────────────────────────────────────────────
//  lib/mongo.ts  (NEW FILE — copy into your project's `lib/` folder)
//  MongoDB Atlas connection helper, used by lib/db.ts and lib/customer-auth.ts.
// ─────────────────────────────────────────────────────────────

import { MongoClient } from "mongodb";

// Cache the connection promise on globalThis so Next.js dev-mode hot reload
// doesn't open a brand-new connection on every single request.
declare global {
  // eslint-disable-next-line no-var
  var _fnyMongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "fluffy_mall";

if (!uri) {
  console.warn(
    "[mongo] MONGODB_URI is not set. Add it to .env.local and restart the dev server."
  );
}

const clientPromise: Promise<MongoClient> | null = uri
  ? global._fnyMongoClientPromise ??
    (global._fnyMongoClientPromise = new MongoClient(uri).connect())
  : null;

/** Returns a handle to the app's database (the DB + collections are created
 *  automatically on first write). */
export async function getDb() {
  if (!clientPromise) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local and restart the dev server."
    );
  }
  const client = await clientPromise;
  return client.db(dbName);
}

/** Collection names. */
export const COLLECTIONS = {
  ORDERS: "orders",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  SETTINGS: "settings",
} as const;
