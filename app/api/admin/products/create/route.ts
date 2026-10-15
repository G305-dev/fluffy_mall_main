import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProducts } from "@/lib/db";
import { getDb, COLLECTIONS } from "@/lib/mongo";
import { nativeItemCode } from "@/lib/native-item-codes";
import { nativePosControl } from "@/lib/native-pos";
import {
  BarcodeError,
  claimBarcode,
  code128Text,
  existingBarcodes,
  newBarcode,
} from "@/lib/product-barcodes";
import { isProductUnit } from "@/lib/product-units";
import type {
  Product,
  ProductVariant,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER =
  "/images/product-placeholder.svg";
const DELIVERY_TIMES =
  "Lagos delivery: 1–2 working days. Nationwide delivery: 3–5 working days.";

class ProductInputError extends Error {}

function text(
  value: unknown,
  label: string,
  max: number,
  required = false
) {
  if (
    value !== undefined &&
    typeof value !== "string"
  ) {
    throw new ProductInputError(
      `${label} must be text.`
    );
  }

  const result = (
    value || ""
  ).trim();

  if (
    (required && !result) ||
    result.length > max
  ) {
    throw new ProductInputError(
      `${label} ${
        required
          ? "is required and"
          : "must be"
      } ${max} characters or fewer.`
    );
  }

  return result;
}

function amount(
  value: unknown,
  label: string,
  allowZero = false
) {
  if (
    (
      typeof value !==
        "string" &&
      typeof value !==
        "number"
    ) ||
    (
      typeof value ===
        "string" &&
      !value.trim()
    )
  ) {
    throw new ProductInputError(
      `Enter a ${label.toLowerCase()}.`
    );
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    (
      allowZero
        ? number < 0
        : number <= 0
    ) ||
    Math.abs(
      number * 100 -
        Math.round(number * 100)
    ) > 0.000001
  ) {
    throw new ProductInputError(
      `${label} must be ${
        allowZero
          ? "zero or more"
          : "greater than zero"
      }, with up to two decimals.`
    );
  }

  return (
    Math.round(number * 100) /
    100
  );
}

function quantity(
  value: unknown,
  label: string
) {
  const number = amount(
    value,
    label,
    true
  );

  if (
    !Number.isSafeInteger(
      number
    )
  ) {
    throw new ProductInputError(
      `${label} must be a whole number.`
    );
  }

  return number;
}

function safeImage(raw: unknown) {
  if (
    typeof raw !==
    "string"
  ) {
    throw new ProductInputError(
      "Invalid product photo."
    );
  }

  const url = raw.trim();

  if (
    /^\/images\/(?!.*(?:\.\.|%2e%2e|[?#]))[a-zA-Z0-9_./%() -]+$/i.test(
      url
    )
  ) {
    return url;
  }

  if (
    /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[a-zA-Z0-9_./%()-]+$/i.test(
      url
    )
  ) {
    return url;
  }

  throw new ProductInputError(
    "Photo must be uploaded using the product photo section."
  );
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(0, 80) ||
    "product"
  );
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

  try {
    const input: unknown =
      await req.json();

    if (
      !input ||
      typeof input !==
        "object" ||
      Array.isArray(input)
    ) {
      throw new ProductInputError(
        "Send valid product details."
      );
    }

    const body =
      input as Record<
        string,
        unknown
      >;

    const productType =
      body.productType;

    if (
      productType !==
        "standard" &&
      productType !==
        "variable"
    ) {
      throw new ProductInputError(
        "Select Standard or Variable product."
      );
    }

    const name = text(
      body.name,
      "Product name",
      200,
      true
    );

    const category = text(
      body.category,
      "Category",
      80,
      true
    );

    const categories =
      await getAdminCategories();

    if (
      !categories.some(
        (item) =>
          item.slug ===
          category
      )
    ) {
      throw new ProductInputError(
        "Choose a category from the list."
      );
    }

    const unit = body.unit;

    if (
      !isProductUnit(unit)
    ) {
      throw new ProductInputError(
        "Choose a valid unit of measurement."
      );
    }

    const price = amount(
      body.price,
      "Selling price"
    );

    // Blank is absent. Supplied zero remains zero.
    const purchaseCost =
      body.purchaseCost ===
        undefined ||
      body.purchaseCost ===
        null ||
      body.purchaseCost ===
        ""
        ? undefined
        : amount(
            body.purchaseCost,
            "Purchase cost",
            true
          );

    const description =
      text(
        body.description,
        "Product description",
        5000
      );

    const short = text(
      body.short,
      "Short description",
      500
    );

    const deliveryNote =
      text(
        body.deliveryNote,
        "Delivery note",
        1000
      );

    if (
      body.hasBarcode !==
        true &&
      body.hasBarcode !==
        false
    ) {
      throw new ProductInputError(
        "Choose whether the product already has a barcode."
      );
    }

    const images =
      body.images ===
      undefined
        ? []
        : body.images;

    if (
      !Array.isArray(
        images
      ) ||
      images.length > 8
    ) {
      throw new ProductInputError(
        "Upload up to eight product photos."
      );
    }

    const imagePaths =
      images.length
        ? Array.from(
            new Set(
              images.map(
                safeImage
              )
            )
          )
        : [
            PLACEHOLDER,
          ];

    const products =
      await getProducts();

    const usedCodes =
      existingBarcodes(
        products
      );

    const barcode =
      body.hasBarcode
        ? claimBarcode(
            code128Text(
              body.barcode
            ),
            usedCodes
          )
        : newBarcode(
            usedCodes
          );

    const rawVariants =
      body.variants ===
      undefined
        ? []
        : body.variants;

    if (
      !Array.isArray(
        rawVariants
      ) ||
      rawVariants.length >
        40
    ) {
      throw new ProductInputError(
        "Use up to 40 options for a variable product."
      );
    }

    if (
      productType ===
        "standard" &&
      rawVariants.length
    ) {
      throw new ProductInputError(
        "Standard products cannot have variants."
      );
    }

    if (
      productType ===
        "variable" &&
      !rawVariants.length
    ) {
      throw new ProductInputError(
        "Add at least one option to a variable product."
      );
    }

    const id =
      `p-${randomUUID()
        .replace(
          /-/g,
          ""
        )
        .slice(
          0,
          20
        )}`;

    const combinations =
      new Set<string>();

    const variants: ProductVariant[] =
      rawVariants.map(
        (
          entry,
          index
        ) => {
          if (
            !entry ||
            typeof entry !==
              "object" ||
            Array.isArray(
              entry
            )
          ) {
            throw new ProductInputError(
              `Option ${
                index + 1
              } is invalid.`
            );
          }

          const raw =
            entry as Record<
              string,
              unknown
            >;

          const size =
            text(
              raw.size,
              `Option ${
                index + 1
              } size`,
              60
            );

          const color =
            text(
              raw.color,
              `Option ${
                index + 1
              } colour`,
              60
            );

          if (
            !size &&
            !color
          ) {
            throw new ProductInputError(
              `Option ${
                index + 1
              } needs a size or colour.`
            );
          }

          const key =
            `${size.toLowerCase()}|${color.toLowerCase()}`;

          if (
            combinations.has(
              key
            )
          ) {
            throw new ProductInputError(
              `Option ${
                index + 1
              } repeats the same size and colour.`
            );
          }

          combinations.add(
            key
          );

          const variantBarcode =
            body.hasBarcode &&
            raw.barcode
              ? claimBarcode(
                  code128Text(
                    raw.barcode
                  ),
                  usedCodes
                )
              : newBarcode(
                  usedCodes
                );

          const variantPrice =
            raw.price ===
              "" ||
            raw.price ===
              undefined
              ? price
              : amount(
                  raw.price,
                  `Option ${
                    index +
                    1
                  } selling price`
                );

          return {
            id: `${id}-variant-${
              index + 1
            }`,
            name: [
              size,
              color,
            ]
              .filter(
                Boolean
              )
              .join(
                " / "
              ),
            size:
              size ||
              undefined,
            color:
              color ||
              undefined,
            price:
              variantPrice,
            stock:
              quantity(
                raw.stock,
                `Option ${
                  index +
                  1
                } stock`
              ),
            image:
              raw.image
                ? safeImage(
                    raw.image
                  )
                : imagePaths[0],
            barcode:
              variantBarcode,
          };
        }
      );

    const stock =
      productType ===
      "variable"
        ? variants.reduce(
            (
              total,
              variant
            ) =>
              total +
              variant.stock,
            0
          )
        : quantity(
            body.stock,
            "Total stock"
          );

    if (
      !Number.isSafeInteger(
        stock
      )
    ) {
      throw new ProductInputError(
        "Total stock is too large."
      );
    }

    const baseSlug =
      slugify(
        name
      );

    let slug =
      baseSlug;
    let suffix =
      2;

    const slugs =
      new Set(
        products.map(
          (
            product
          ) =>
            product.slug
        )
      );

    while (
      slugs.has(
        slug
      )
    ) {
      slug =
        `${baseSlug}-${suffix++}`;
    }

    const product: Product = {
      id,
      slug,
      name,
      category,
      productType,
      itemCode:
        nativeItemCode(
          id
        ),
      price,
      stock,
      unit,
      barcode,
      images:
        imagePaths,
      short,
      description,
      variants,
      featured:
        body.featured ===
        true,
      bestseller:
        body.bestseller ===
        true,
      deliveryNote:
        [
          DELIVERY_TIMES,
          deliveryNote,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          ),
    };

    // The optional private cost and the product are committed together.
    const db =
      await getDb();
    const session =
      db.client.startSession();

    try {
      await session.withTransaction(
        async () => {
          const active =
            await nativePosControl(
              db,
              session
            );

          await db
            .collection(
              COLLECTIONS.PRODUCTS
            )
            .insertOne(
              {
                ...product,
                sortOrder:
                  -Date.now(),
              },
              { session }
            );

          if (
            purchaseCost !==
            undefined
          ) {
            await db
              .collection<{
                _id: string;
                purchaseCost: number;
                updatedAt: string;
              }>(
                "product_costs"
              )
              .insertOne(
                {
                  _id: id,
                  purchaseCost,
                  updatedAt:
                    new Date().toISOString(),
                },
                { session }
              );
          }

          if (
            active
          ) {
            await db
              .collection<{
                _id: string;
                [
                  key: string
                ]: unknown;
              }>(
                "inventory_movements"
              )
              .insertOne(
                {
                  _id: `create:${id}`,
                  type:
                    "product_added",
                  productId:
                    id,
                  itemCode:
                    product.itemCode,
                  productName:
                    product.name,
                  quantityChange:
                    stock,
                  resultingStock:
                    stock,
                  reason:
                    "New product added in admin",
                  createdAt:
                    new Date().toISOString(),
                },
                { session }
              );
          }
        }
      );
    } finally {
      await session.endSession();
    }

    revalidatePath("/");
    revalidatePath(
      "/shop"
    );
    revalidatePath(
      `/shop/${category}`
    );
    revalidatePath(
      `/product/${slug}`
    );
    revalidatePath(
      "/admin/products"
    );
    revalidatePath(
      "/admin/inventory"
    );
    revalidatePath(
      "/sitemap.xml"
    );

    return NextResponse.json(
      { product },
      { status: 201 }
    );
  } catch (
    error
  ) {
    if (
      error instanceof
        ProductInputError ||
      error instanceof
        BarcodeError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status:
            error instanceof
              BarcodeError &&
            error.message.includes(
              "already assigned"
            )
              ? 409
              : 400,
        }
      );
    }

    if (
      error instanceof
      SyntaxError
    ) {
      return NextResponse.json(
        {
          error:
            "Send valid product details.",
        },
        { status: 400 }
      );
    }

    console.error(
      "[new product]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not save product. Try again.",
      },
      { status: 500 }
    );
  }
}