import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getProducts, saveProducts } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { CategorySlug, Product } from "@/lib/types";

const DELIVERY_TIMES =
  "Lagos delivery: 1–2 working days. Nationwide delivery: 3–5 working days.";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  }

  const category = String(body.category || "") as CategorySlug;
  if (!CATEGORIES.some((c) => c.slug === category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

  const image = String(body.image || "").trim();
  if (!image) {
    return NextResponse.json({ error: "Product image is required" }, { status: 400 });
  }

  const products = await getProducts();

  // Make sure the slug is unique (append a counter if the name already exists).
  const baseSlug = slugify(name) || "product";
  let slug = baseSlug;
  let counter = 2;
  while (products.some((p) => p.slug === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const product: Product = {
    id: `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    slug,
    name,
    price,
    category,
    featured: Boolean(body.featured),
    bestseller: Boolean(body.bestseller),
    stock: Math.max(0, Number(body.stock) || 0),
    images: [image],
    short: String(body.short || "").trim(),
    description: String(body.description || "").trim(),
    variants: [],
    deliveryNote: [DELIVERY_TIMES, String(body.deliveryNote || "").trim()]
      .filter(Boolean)
      .join(" "),
  };

  products.unshift(product);
  await saveProducts(products);
  return NextResponse.json({ product }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const products = await getProducts();
  const idx = products.findIndex((p) => p.id === body.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  products[idx] = {
    ...products[idx],
    name: body.name ?? products[idx].name,
    price: Number(body.price ?? products[idx].price),
    stock: Number(body.stock ?? products[idx].stock),
  };
  if (typeof body.image === "string" && body.image.trim()) {
    // Replace the main (first) image, keep any extra gallery images.
    products[idx].images = [body.image.trim(), ...products[idx].images.slice(1)];
  }
  await saveProducts(products);
  return NextResponse.json({ product: products[idx] });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = String(body.id || "");
  const products = await getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [removed] = products.splice(idx, 1);
  await saveProducts(products);
  return NextResponse.json({ ok: true, removed: removed.id });
}
