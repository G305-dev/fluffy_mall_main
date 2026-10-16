import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _fnyMongoClient:
    | MongoClient
    | undefined;

  // eslint-disable-next-line no-var
  var _fnyMongoClientPromise:
    | Promise<MongoClient>
    | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set."
    );
  }

  if (global._fnyMongoClient) return global._fnyMongoClient;

  if (!global._fnyMongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    global._fnyMongoClientPromise =
      client
        .connect()
        .then((connectedClient) => {
          global._fnyMongoClient =
            connectedClient;

          return connectedClient;
        })
        .catch((error) => {
          global._fnyMongoClientPromise =
            undefined;

          void client.close().catch(() => {
            // Ignore cleanup errors.
          });

          throw error;
        });
  }

  return global._fnyMongoClientPromise;
}

export async function getDb() {
  const dbName =
    process.env.MONGODB_DB?.trim() ||
    "fluffy_mall";
  const client = await getMongoClient();
  return client.db(dbName);
}

export const COLLECTIONS = {
  ORDERS: "orders",
  CUSTOMERS: "customers",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  SETTINGS: "settings",
  SUBSCRIBERS: "subscribers",
  STAFF: "staff",
} as const;