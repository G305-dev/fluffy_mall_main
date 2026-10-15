import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-categories";
import {
  getProducts,
  saveProducts,
} from "@/lib/db";
import {
  deleteProductCost,
  saveProductCost,
} from "@/lib/product-costs";
import { isProductUnit } from "@/lib/product-units";
import {
  COLLECTIONS,
  getDb,
} from "@/lib/mongo";
import { nativePosControl } from "@/lib/native-pos";
import type {
  CategorySlug,
  Product,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class ProductInputError extends Error {}

function amount(
  value: unknown,
  label: string,
  allowZero = false
) {
  if (
    (
      typeof value !== "string" &&
      typeof value !== "number"
    ) ||
    String(value).trim() === ""
  ) {
    throw new ProductInputError(
      `${label} must be an amount.`
    );
  }

  const result = Number(value);

  if (
    !Number.isFinite(result) ||
    (
      allowZero
        ? result < 0
        : result <= 0
    ) ||
    Math.abs(
      result * 100 -
        Math.round(result * 100)
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

  return Math.round(result * 100) / 100;
}

function optionalImages(
  input: unknown
): string[] {
  if (
    !Array.isArray(input) ||
    !input.length ||
    input.length > 12 ||
    !input.every(
      (value) =>
        typeof value === "string" &&
        value.trim()
    )
  ) {
    throw new ProductInputError(
      "Keep at least one product image (maximum twelve)."
    );
  }

  return Array.from(
    new Set(
      input.map(
        (value: string) =>
          value.trim()
      )
    )
  );
}

function refreshProduct(
  product: Product,
  oldCategory: CategorySlug
) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath(
    `/shop/${oldCategory}`
  );
  revalidatePath(
    `/shop/${product.category}`
  );
  revalidatePath(
    `/product/${product.slug}`
  );
  revalidatePath(
    "/admin/products"
  );
  revalidatePath(
    "/admin/inventory"
  );
  revalidatePath(
    "/admin/pos"
  );
  revalidatePath(
    "/sitemap.xml"
  );
}

// The admin creates products through /api/admin/products/create.
// The old POST path would bypass barcode and movement safeguards.
export async function POST() {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Create products through /api/admin/products/create.",
    },
    { status: 405 }
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

  try {
    const input: unknown =
      await req.json();

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new ProductInputError(
        "Send product details."
      );
    }

    const body =
      input as Record<string, unknown>;

    if (
      typeof body.id !== "string" ||
      !body.id.trim()
    ) {
      throw new ProductInputError(
        "Choose a product."
      );
    }

    if (
      body.variants !== undefined
    ) {
      throw new ProductInputError(
        "Variant editing is paused; existing options are preserved."
      );
    }

    const products =
      await getProducts();

    const index =
      products.findIndex(
        (product) =>
          product.id === body.id
      );

    if (index < 0) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        { status: 404 }
      );
    }

    const original =
      products[index];

    const next: Product = {
      ...original,
    };

    if (
      body.name !== undefined
    ) {
      if (
        typeof body.name !==
          "string" ||
        !body.name.trim() ||
        body.name.trim().length >
          200
      ) {
        throw new ProductInputError(
          "Product name must be 1–200 characters."
        );
      }

      next.name =
        body.name.trim();
    }

    if (
      body.price !== undefined
    ) {
      next.price = amount(
        body.price,
        "Selling price"
      );
    }

    if (
      body.stock !== undefined
    ) {
      const stock =
        Number(
          body.stock
        );

      if (
        (
          typeof body.stock !==
            "number" &&
          typeof body.stock !==
            "string"
        ) ||
        String(
          body.stock
        ).trim() === "" ||
        !Number.isSafeInteger(
          stock
        )
      ) {
        throw new ProductInputError(
          "Stock must be a whole number."
        );
      }

      if (
        (
          original.productType ===
            "variable" ||
          original.variants?.length
        ) &&
        stock !== original.stock
      ) {
        throw new ProductInputError(
          "Variable-product stock is paused; keep its options unchanged."
        );
      }

      next.stock =
        stock;
    }

    if (
      body.category !== undefined
    ) {
      if (
        typeof body.category !==
          "string" ||
        !(
          await getAdminCategories()
        ).some(
          (item) =>
            item.slug ===
            body.category
        )
      ) {
        throw new ProductInputError(
          "Choose an existing website category."
        );
      }

      next.category =
        body.category;
    }

    if (
      body.unit !== undefined
    ) {
      if (
        !isProductUnit(
          body.unit
        )
      ) {
        throw new ProductInputError(
          "Choose a valid unit."
        );
      }

      next.unit =
        body.unit;
    }

    if (
      body.images !== undefined
    ) {
      next.images =
        optionalImages(
          body.images
        );
    }

    if (
      body.featured !== undefined
    ) {
      if (
        typeof body.featured !==
        "boolean"
      ) {
        throw new ProductInputError(
          "Invalid featured setting."
        );
      }

      next.featured =
        body.featured;
    }

    if (
      body.bestseller !== undefined
    ) {
      if (
        typeof body.bestseller !==
        "boolean"
      ) {
        throw new ProductInputError(
          "Invalid bestseller setting."
        );
      }

      next.bestseller =
        body.bestseller;
    }

    const cost =
      body.purchaseCost ===
      undefined
        ? undefined
        : amount(
            body.purchaseCost,
            "Purchase cost",
            true
          );

    products[index] =
      next;

    // Batch-1 saveProducts checks current stock and POS mode
    // in the same transaction. Stale edits cannot rewrite a sale.
    try {
      await saveProducts(
        products
      );
    } catch (
      error
    ) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not save product. Refresh and retry.",
        },
        { status: 409 }
      );
    }

    if (
      body.category !== undefined
    ) {
      try {
        const db =
          await getDb();

        await db
          .collection(
            COLLECTIONS.PRODUCTS
          )
          .updateOne(
            {
              id:
                next.id,
            },
            {
              $unset: {
                subcategory:
                  "",
              },
            }
          );
      } catch (
        error
      ) {
        console.error(
          "[product category cleanup]",
          next.id,
          error
        );

        return NextResponse.json(
          {
            error:
              "Product saved, but category cleanup failed. Refresh and review before retrying.",
          },
          { status: 500 }
        );
      }
    }

    if (
      cost !== undefined
    ) {
      try {
        await saveProductCost(
          next.id,
          cost
        );
      } catch (
        error
      ) {
        console.error(
          "[private product cost]",
          next.id,
          error
        );

        return NextResponse.json(
          {
            error:
              "Product saved, but private purchase cost was not updated. Reconcile the cost record.",
          },
          { status: 500 }
        );
      }
    }

    refreshProduct(
      next,
      original.category
    );

    return NextResponse.json({
      product: next,
    });
  } catch (
    error
  ) {
    if (
      error instanceof
        ProductInputError ||
      error instanceof
        SyntaxError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 400 }
      );
    }

    console.error(
      "[admin product edit]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not update product.",
      },
      { status: 500 }
    );
  }
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

  let id: string;

  try {
    const body: unknown =
      await req.json();

    id = String(
      (
        body as {
          id?: unknown;
        } | null
      )?.id || ""
    ).trim();
  } catch {
    return NextResponse.json(
      {
        error:
          "Choose a product.",
      },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      {
        error:
          "Choose a product.",
      },
      { status: 400 }
    );
  }

  try {
    if (
      await nativePosControl()
    ) {
      return NextResponse.json(
        {
          error:
            "Deleting products is disabled while POS is active. Preserve sale history.",
        },
        { status: 409 }
      );
    }

    const products =
      await getProducts();

    const index =
      products.findIndex(
        (product) =>
          product.id ===
          id
      );

    if (
      index < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Not found",
        },
        { status: 404 }
      );
    }

    const [removed] =
      products.splice(
        index,
        1
      );

    try {
      await saveProducts(
        products
      );
    } catch (
      error
    ) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Could not remove product. Refresh and retry.",
        },
        { status: 409 }
      );
    }

    await deleteProductCost(
      removed.id
    ).catch(
      (error) =>
        console.error(
          "[delete product cost]",
          error
        )
    );

    refreshProduct(
      removed,
      removed.category
    );

    return NextResponse.json({
      ok: true,
      removed:
        removed.id,
    });
  } catch (
    error
  ) {
    console.error(
      "[delete product]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not delete product.",
      },
      { status: 500 }
    );
  }
}