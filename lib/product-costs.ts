import { getDb } from "@/lib/mongo";

// Purchase costs are kept out of the public products collection, which is
// serialized into storefront pages and customer-facing API responses.
const COSTS = "product_costs";

type CostDocument = {
  _id: string; // Product id
  purchaseCost: number;
  updatedAt: string;
};

export async function getProductCosts(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const db = await getDb();
  const docs = await db.collection<CostDocument>(COSTS)
    .find({ _id: { $in: ids } })
    .toArray();
  return Object.fromEntries(docs.map((doc) => [doc._id, doc.purchaseCost]));
}

export async function saveProductCost(id: string, purchaseCost: number) {
  const db = await getDb();
  await db.collection<CostDocument>(COSTS).updateOne(
    { _id: id },
    { $set: { purchaseCost, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function saveProductCosts(costs: Record<string, number>) {
  const entries = Object.entries(costs);
  if (!entries.length) return;
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await db.collection<CostDocument>(COSTS).bulkWrite(entries.map(([_id, purchaseCost]) => ({
    updateOne: {
      filter: { _id },
      update: { $set: { purchaseCost, updatedAt } },
      upsert: true,
    },
  })));
}

export async function deleteProductCost(id: string) {
  const db = await getDb();
  await db.collection<CostDocument>(COSTS).deleteOne({ _id: id });
}