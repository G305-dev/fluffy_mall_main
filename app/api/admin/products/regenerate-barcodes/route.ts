import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { COLLECTIONS, getDb, getMongoClient } from "@/lib/mongo";
import { regenerateInStockBarcodes } from "@/lib/product-barcodes";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_POS_ORDER_FIELDS = [
  "traceposSaleStatus",
  "traceposSaleReference",
  "traceposSaleAttemptedAt",
  "traceposSaleSyncedAt",
  "traceposSaleInvoiceNumber",
  "traceposSaleError",
] as const;

export async function POST() {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();
  let regenerated = 0;
  let outOfStock = 0;
  let updatedProducts = 0;
  let cleanedOrders = 0;

  try {
    await session.withTransaction(async () => {
      const collection = db.collection(COLLECTIONS.PRODUCTS);
      const documents = await collection.find({}, { session }).toArray();
      const products = documents.map((document) => {
        const { _id, sortOrder, key, ...product } = document;
        return product as Product;
      });
      const result = regenerateInStockBarcodes(products);
      regenerated = result.regenerated;
      outOfStock = result.outOfStock;
      updatedProducts = 0;

      for (const product of result.products) {
        const set: Record<string, unknown> = {
          variants: (product.variants || []).map((variant) => {
            const cleanedVariant = { ...variant } as typeof variant & {
              traceposItemCode?: unknown;
            };
            delete cleanedVariant.traceposItemCode;
            return cleanedVariant;
          }),
        };
        if (product.barcode) {
          set.barcode = product.barcode;
        }

        const update = await collection.updateOne(
          { id: product.id },
          {
            $set: set,
            $unset: { traceposItemCode: "" },
          },
          { session }
        );
        if (update.matchedCount !== 1) {
          throw new Error(`Product ${product.id} disappeared during barcode update.`);
        }
        updatedProducts += 1;
      }

      const unsetOrders = Object.fromEntries(
        LEGACY_POS_ORDER_FIELDS.map((field) => [field, ""])
      );
      const orderResult = await db.collection(COLLECTIONS.ORDERS).updateMany(
        { $or: LEGACY_POS_ORDER_FIELDS.map((field) => ({ [field]: { $exists: true } })) },
        { $unset: unsetOrders },
        { session }
      );
      cleanedOrders = orderResult.modifiedCount;
    });
  } catch (error) {
    console.error("[barcode regeneration and legacy POS data cleanup]", error);
    const message = error instanceof Error ? error.message : "";
    if (
      (error && typeof error === "object" && "code" in error && error.code === 20) ||
      message.includes("Transaction numbers are only allowed")
    ) {
      return NextResponse.json(
        {
          error:
            "Your MongoDB deployment does not support transactions. Use a replica-set MongoDB deployment (MongoDB Atlas supports this), then try again. No changes were saved.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not update barcodes and remove saved external POS data. No partial changes were saved." },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }

  for (const product of await db.collection(COLLECTIONS.PRODUCTS).find({}, { projection: { slug: 1 } }).toArray()) {
    if (typeof product.slug === "string") revalidatePath(`/product/${product.slug}`);
  }
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");

  return NextResponse.json({
    regenerated,
    outOfStock,
    updatedProducts,
    cleanedOrders,
  });
}
