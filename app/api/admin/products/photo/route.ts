import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/mongo";
import type { ProductVariant } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER = "/images/product-placeholder.svg";
const PRODUCT_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/products\/[a-zA-Z0-9_./%()-]+$/i;

export async function PATCH(req: NextRequest) {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Send a product and uploaded image." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Send a product and uploaded image." }, { status: 400 });
  }
  const body = input as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!id || id.length > 120 || !PRODUCT_BLOB.test(path)) {
    return NextResponse.json({ error: "Upload a valid product image first." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.PRODUCTS);
    const product = await collection.findOne({ id });
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const oldImages = Array.isArray(product.images)
      ? product.images.filter((value): value is string => typeof value === "string") : [];
    const oldMain = oldImages[0] || PLACEHOLDER;
    const images = [path, ...oldImages.slice(1).filter((image) => image !== path && image !== PLACEHOLDER)];
    // Options using the old main image should display the newly saved photo too.
    // Distinct option images are preserved, as are the other gallery photos.
    const variants = Array.isArray(product.variants)
      ? (product.variants as ProductVariant[]).map((option) => ({
          ...option,
          image: !option.image || option.image === oldMain || option.image === PLACEHOLDER
            ? path : option.image,
        })) : [];

    const updated = await collection.updateOne({ id }, { $set: { images, variants } });
    if (!updated.matchedCount) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const slug = typeof product.slug === "string" ? product.slug : "";
    const category = typeof product.category === "string" ? product.category : "";
    for (const route of ["/admin/products", "/", "/shop", "/sitemap.xml"]) revalidatePath(route);
    if (slug) revalidatePath(`/product/${slug}`);
    if (category) revalidatePath(`/shop/${category}`);

    return NextResponse.json({ path, images });
  } catch (error) {
    console.error("[save product photo]", error);
    return NextResponse.json({ error: "Could not save the product image. Try again." }, { status: 500 });
  }
}