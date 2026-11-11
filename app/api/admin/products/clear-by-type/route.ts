import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { COLLECTIONS, getDb } from "@/lib/mongo";
import { deleteProductCost } from "@/lib/product-costs";

export async function POST(req: NextRequest) {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // A same-site browser request is required for this destructive action.
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "JSON required" }, { status: 415 });
  }
  let body: { kind?: unknown; confirmation?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const kind = body?.kind;
  if ((kind !== "standard" && kind !== "variable") ||
      body.confirmation !== (kind === "standard" ? "DELETE STANDARD" : "DELETE VARIABLE")) {
    return NextResponse.json({ error: "Invalid product type or confirmation" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const products = db.collection(COLLECTIONS.PRODUCTS);
    // Same classification as the Settings page: explicit variable type or at least one variant.
    const variable = { $or: [{ productType: "variable" }, { "variants.0": { $exists: true } }] };
    const filter = kind === "variable" ? variable : { $nor: variable.$or };
    const matches = await products.find(filter, { projection: { _id: 1, id: 1 } }).toArray();
    let deleted = 0;
    for (const product of matches) {
      // Recheck the type at deletion time to avoid deleting a product that changed type.
      const result = await products.deleteOne({ _id: product._id, ...filter });
      if (result.deletedCount) {
        deleted++;
        if (typeof product.id === "string") {
          await deleteProductCost(product.id).catch((error) => console.error("[clear product cost]", error));
        }
      }
    }
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error("[clear products]", error);
    return NextResponse.json({ error: "Could not complete deletion; some products may already have been deleted. Refresh and check the catalogue." }, { status: 500 });
  }
}