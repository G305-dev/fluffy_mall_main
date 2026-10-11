import {
  NextRequest,
  NextResponse,
} from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  getProducts,
  saveProducts,
} from "@/lib/db";
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

function parseProductImages(
  input: unknown
): string[] {
  if (Array.isArray(input)) {
    const images = input
      .filter(
        (value): value is string =>
          typeof value === "string"
      )
      .map((value) => value.trim())
      .filter(Boolean);

    if (images.length === 0) {
      throw new Error(
        "At least one product image is required."
      );
    }

    return Array.from(new Set(images));
  }

  const image = String(input ?? "").trim();

  if (!image) {
    throw new Error(
      "At least one product image is required."
    );
  }

  return [image];
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

  for (
    let index = 0;
    index < input.length;
    index++
  ) {
    const item = input[index];

    if (!item || typeof item !== "object") {
      continue;
    }

    const raw = item as Record<string, unknown>;

    const size = String(
      raw.size ?? ""
    ).trim();

    const color = String(
      raw.color ?? ""
    ).trim();

    const image = String(
      raw.image ?? ""
    ).trim();

    const traceposItemCode =
      String(
        raw.traceposItemCode ?? ""
      ).trim() || undefined;

    const rawPrice = String(
      raw.price ?? ""
    ).trim();

    const rawStock = String(
      raw.stock ?? ""
    ).trim();

    if (
      !size &&
      !color &&
      !image &&
      !rawPrice &&
      !rawStock &&
      !traceposItemCode
    ) {
      continue;
    }

    if (!size && !color) {
      throw new Error(
        `Variant ${index + 1} needs a size or a color.`
      );
    }

    if (!image) {
      throw new Error(
        `Variant ${index + 1} needs an image.`
      );
    }

    const price = Number(raw.price);
    const stock = Number(raw.stock ?? 0);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error(
        `Variant ${index + 1} has an invalid price.`
      );
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      throw new Error(
        `Variant ${index + 1} has an invalid stock quantity.`
      );
    }

    const combinationKey =
      `${size.toLowerCase()}|${color.toLowerCase()}`;

    if (
      usedCombinations.has(combinationKey)
    ) {
      throw new Error(
        `Variant ${
          index + 1
        } duplicates another size and color combination.`
      );
    }

    usedCombinations.add(combinationKey);

    variants.push({
      id: `${productId}-variant-${index + 1}`,
      name: [size, color]
        .filter(Boolean)
        .join(" / "),
      size: size || undefined,
      color: color || undefined,
      price,
      stock,
      image,
      traceposItemCode,
    });
  }

  return variants;
}

export async function POST(
  req: NextRequest
) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json();

  const name = String(
    body.name || ""
  ).trim();

  if (!name) {
    return NextResponse.json(
      {
        error: "Product name is required.",
      },
      { status: 400 }
    );
  }

  const price = Number(body.price);

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return NextResponse.json(
      {
        error: "Enter a valid price.",
      },
      { status: 400 }
    );
  }

  const category =
    String(body.category || "") as CategorySlug;

  if (
    !CATEGORIES.some(
      (item) => item.slug === category
    )
  ) {
    return NextResponse.json(
      {
        error: "Unknown category.",
      },
      { status: 400 }
    );
  }

  let images: string[];

  try {
    images = parseProductImages(
      body.images !== undefined
        ? body.images
        : body.image
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Product images are invalid.",
      },
      { status: 400 }
    );
  }

  const products = await getProducts();

  const baseSlug =
    slugify(name) || "product";

  let slug = baseSlug;
  let counter = 2;

  while (
    products.some(
      (product) => product.slug === slug
    )
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  const productId = `p-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  let variants: ProductVariant[];

  try {
    variants = parseVariants(
      body.variants,
      productId
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

  const product: Product = {
    id: productId,
    slug,
    name,

    traceposItemCode:
      String(
        body.traceposItemCode ?? ""
      ).trim() || undefined,

    price,
    category,

    subcategory:
      String(
        body.subcategory || ""
      ).trim() || undefined,

    featured: Boolean(body.featured),
    bestseller: Boolean(body.bestseller),

    stock: Math.max(
      0,
      Number(body.stock) || 0
    ),

    images,

    short: String(
      body.short || ""
    ).trim(),

    description: String(
      body.description || ""
    ).trim(),

    variants,

    deliveryNote: [
      DELIVERY_TIMES,
      String(
        body.deliveryNote || ""
      ).trim(),
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

export async function PATCH(
  req: NextRequest
) {
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

  let variants =
    products[index].variants;

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

  let nextCategory: CategorySlug =
    products[index].category;

  let nextSubcategory =
    products[index].subcategory;

  if (body.category !== undefined) {
    const requestedCategory =
      String(body.category).trim() as CategorySlug;

    const categoryDefinition =
      CATEGORIES.find(
        (item) =>
          item.slug === requestedCategory
      );

    if (!categoryDefinition) {
      return NextResponse.json(
        {
          error: "Unknown category.",
        },
        { status: 400 }
      );
    }

    nextCategory = requestedCategory;

    if (body.subcategory === undefined) {
      const currentSubcategoryIsValid =
        typeof nextSubcategory === "string" &&
        categoryDefinition.subcategories.includes(
          nextSubcategory
        );

      nextSubcategory =
        currentSubcategoryIsValid
          ? nextSubcategory
          : categoryDefinition.subcategories[0] ||
            undefined;
    }
  }

  if (body.subcategory !== undefined) {
    const categoryDefinition =
      CATEGORIES.find(
        (item) =>
          item.slug === nextCategory
      );

    const requestedSubcategory =
      String(
        body.subcategory ?? ""
      ).trim();

    if (
      requestedSubcategory &&
      (!categoryDefinition ||
        !categoryDefinition.subcategories.includes(
          requestedSubcategory
        ))
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid subcategory for this category.",
        },
        { status: 400 }
      );
    }

    nextSubcategory =
      requestedSubcategory || undefined;
  }

  if (
    body.variantItemCodes &&
    typeof body.variantItemCodes === "object" &&
    !Array.isArray(body.variantItemCodes)
  ) {
    const codes =
      body.variantItemCodes as Record<
        string,
        unknown
      >;

    variants = variants.map((variant) => {
      if (!(variant.id in codes)) {
        return variant;
      }

      return {
        ...variant,
        traceposItemCode:
          String(
            codes[variant.id] ?? ""
          ).trim() || undefined,
      };
    });
  }

  let nextImages =
    products[index].images || [];

  if (body.images !== undefined) {
    try {
      nextImages = parseProductImages(
        body.images
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Product images are invalid.",
        },
        { status: 400 }
      );
    }
  } else if (
    typeof body.image === "string" &&
    body.image.trim()
  ) {
    /*
     * Backward compatibility for old callers that
     * still send one image.
     */
    nextImages = [
      body.image.trim(),
      ...nextImages.slice(1),
    ];
  }

  products[index] = {
    ...products[index],

    name:
      body.name !== undefined
        ? String(body.name).trim()
        : products[index].name,

    price: Number(
      body.price ?? products[index].price
    ),

    stock: Number(
      body.stock ?? products[index].stock
    ),

    category: nextCategory,
    subcategory: nextSubcategory,

    featured:
      body.featured !== undefined
        ? Boolean(body.featured)
        : products[index].featured,

    bestseller:
      body.bestseller !== undefined
        ? Boolean(body.bestseller)
        : products[index].bestseller,

    traceposItemCode:
      body.traceposItemCode !== undefined
        ? String(
            body.traceposItemCode ?? ""
          ).trim() || undefined
        : products[index].traceposItemCode,

    images: nextImages,
    variants,
  };

  await saveProducts(products);

  return NextResponse.json({
    product: products[index],
  });
}

export async function DELETE(
  req: NextRequest
) {
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

  const [removed] =
    products.splice(index, 1);

  await saveProducts(products);

  return NextResponse.json({
    ok: true,
    removed: removed.id,
  });
}