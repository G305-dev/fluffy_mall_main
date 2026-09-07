import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getProducts, saveProducts } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import type {
  CategorySlug,
  Product,
  ProductVariant,
} from "@/lib/types";

const DELIVERY_TIMES =
  "Lagos delivery: 1–2 working days. Nationwide delivery: 3–5 working days.";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseVariants(
  input: unknown,
  productId: string
): ProductVariant[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const variants: ProductVariant[] = [];
  const usedCombinations = new Set<string>();

  for (let index = 0; index < input.length; index++) {
    const item = input[index];

    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;

    const size = String(raw.size ?? "").trim();
    const color = String(raw.color ?? "").trim();
    const rawPrice = String(raw.price ?? "").trim();
    const rawStock = String(raw.stock ?? "").trim();

    const hasAnyValue = Boolean(
      size || color || rawPrice || rawStock
    );

    if (!hasAnyValue) {
      continue;
    }

    if (!size && !color) {
      throw new Error(
        `Variant ${index + 1} needs a size or a color.`
      );
    }

    const price = Number(raw.price);
    const stock = Number(raw.stock ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `Variant ${index + 1} has an invalid price.`
      );
    }

    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error(
        `Variant ${index + 1} has an invalid stock quantity.`
      );
    }

    const combinationKey =
      `${size.toLowerCase()}|${color.toLowerCase()}`;

    if (usedCombinations.has(combinationKey)) {
      throw new Error(
        `Variant ${index + 1} duplicates another size and color combination.`
      );
    }

    usedCombinations.add(combinationKey);

    const name = [size, color]
      .filter(Boolean)
      .join(" / ");

    variants.push({
      id: `${productId}-variant-${index + 1}`,
      name,
      size: size || undefined,
      color: color || undefined,
      price,
      stock,
    });
  }

  return variants;
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const name = String(body.name || "").trim();

  if (!name) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 }
    );
  }

  const price = Number(body.price);

  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "Enter a valid price." },
      { status: 400 }
    );
  }

  const category = String(body.category || "") as CategorySlug;

  if (!CATEGORIES.some((item) => item.slug === category)) {
    return NextResponse.json(
      { error: "Unknown category." },
      { status: 400 }
    );
  }

  const image = String(body.image || "").trim();

  if (!image) {
    return NextResponse.json(
      { error: "Product image is required." },
      { status: 400 }
    );
  }

  const products = await getProducts();

  const baseSlug = slugify(name) || "product";
  let slug = baseSlug;
  let counter = 2;

  while (products.some((product) => product.slug === slug)) {
    slug = `${baseSlug}-${counter++}`;
  }

  const productId = `p-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  let variants: ProductVariant[];

  try {
    variants = parseVariants(body.variants, productId);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid product variants.",
      },
      { status: 400 }
    );
  }

  const product: Product = {
    id: productId,
    slug,
    name,
    price,
    category,
    subcategory: String(body.subcategory || "").trim() || undefined,
    featured: Boolean(body.featured),
    bestseller: Boolean(body.bestseller),
    stock: Math.max(0, Number(body.stock) || 0),
    images: [image],
    short: String(body.short || "").trim(),
    description: String(body.description || "").trim(),
    variants,
    deliveryNote: [
      DELIVERY_TIMES,
      String(body.deliveryNote || "").trim(),
    ]
      .filter(Boolean)
      .join(" "),
  };

  products.unshift(product);
  await saveProducts(products);

  return NextResponse.json(
    { product },
    { status: 201 }
  );
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const products = await getProducts();
  const index = products.findIndex(
    (product) => product.id === body.id
  );

  if (index < 0) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  let variants = products[index].variants;

  if (Array.isArray(body.variants)) {
    try {
      variants = parseVariants(
        body.variants,
        products[index].id
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid product variants.",
        },
        { status: 400 }
      );
    }
  }

  products[index] = {
    ...products[index],
    name: body.name ?? products[index].name,
    price: Number(body.price ?? products[index].price),
    stock: Number(body.stock ?? products[index].stock),
    variants,
  };

  if (
    typeof body.image === "string" &&
    body.image.trim()
  ) {
    products[index].images = [
      body.image.trim(),
      ...products[index].images.slice(1),
    ];
  }

  await saveProducts(products);

  return NextResponse.json({
    product: products[index],
  });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const id = String(body.id || "");
  const products = await getProducts();
  const index = products.findIndex(
    (product) => product.id === id
  );

  if (index < 0) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const [removed] = products.splice(index, 1);

  await saveProducts(products);

  return NextResponse.json({
    ok: true,
    removed: removed.id,
  });
}