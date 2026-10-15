import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/db";
import {
  COLLECTIONS,
  getDb,
} from "@/lib/mongo";
import type {
  CategorySlug,
  Product,
} from "@/lib/types";
import seedProducts from "@/data/products.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LegacyProduct =
  Product & {
    subcategory?: unknown;
  };

type Classification = {
  category: CategorySlug;
  reason: string;
};

type CategoryChange = {
  id: string;
  name: string;
  slug: string;
  fromCategory: string;
  fromSubcategory: string;
  toCategory: CategorySlug;
  reason: string;
};

const validCategories =
  new Set<CategorySlug>(
    CATEGORIES.map(
      (category) =>
        category.slug
    )
  );

function normalize(
  value: unknown
): string {
  return String(
    value ?? ""
  )
    .toLowerCase()
    .replace(
      /&/g,
      "and"
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

const categoryByName =
  new Map(
    CATEGORIES.map(
      (
        category
      ) => [
        normalize(
          category.name
        ),
        category.slug,
      ]
    )
  );

// These aliases interpret old stored data. They do not
// introduce subcategories into the new product model.
const legacyAliases: Record<
  string,
  CategorySlug
> = {
  "pantry storage organiser":
    "pantry-storage-organiser",
  laundries:
    "laundry",
  "vaccum cleaner":
    "vacuum-cleaner",
  cutlery:
    "cutlery-utensils",
  utensils:
    "cutlery-utensils",
  "cutleries utensils":
    "cutlery-utensils",
  glasswares:
    "glassware",
  "cloth dryer":
    "clothes-dryer",
  "cooking spoon":
    "spoons",
  spoon:
    "spoons",
  woodens:
    "wooden-utensils",
  straw:
    "straws",
  tray:
    "trays",
  "tray trays":
    "trays",
  cover:
    "covers",
  mold:
    "moulds",
  mould:
    "moulds",
  table:
    "tables",
  "pant hanger":
    "hangers",
  peg:
    "hangers",
  "ironing board":
    "iron",
  "spray bottles":
    "cleaning-tools",
  "fruit platter":
    "trays",
};

function legacySubcategoryToCategory(
  value: unknown
): CategorySlug | null {
  const key =
    normalize(value);

  if (!key) {
    return null;
  }

  return (
    legacyAliases[
      key
    ] ||
    categoryByName.get(
      key
    ) ||
    null
  );
}

// The checked-in catalogue is a reviewed mapping for its 24 IDs.
// Use it only for products still stored under an old parent category.
const seedCategoryById =
  new Map<
    string,
    CategorySlug
  >(
    seedProducts.flatMap(
      (
        product
      ) => {
        const category =
          product.category as CategorySlug;

        return validCategories.has(
          category
        )
          ? [
              [
                product.id,
                category,
              ] as const,
            ]
          : [];
      }
    )
  );

// Uncertain matches appear in "unresolved" for manual review.
const nameRules: Array<{
  pattern: RegExp;
  category: CategorySlug;
}> = [
  {
    pattern:
      /\btoilet\b|\bbathroom\b/i,
    category:
      "bath-series",
  },
  {
    pattern:
      /\bwhistling kettle\b/i,
    category:
      "cookware",
  },
  {
    pattern:
      /\bair[ -]?fryers?\b/i,
    category:
      "air-fryers",
  },
  {
    pattern:
      /\bblenders?\b/i,
    category:
      "blenders",
  },
  {
    pattern:
      /\belectric kettle\b/i,
    category:
      "electric-kettle",
  },
  {
    pattern:
      /\b(?:electric )?chopper\b/i,
    category:
      "electric-chopper",
  },
  {
    pattern:
      /\bslow juicer\b/i,
    category:
      "slow-juicer",
  },
  {
    pattern:
      /\bfood processor\b/i,
    category:
      "food-processor",
  },
  {
    pattern:
      /\bbreakfast maker\b/i,
    category:
      "breakfast-makers",
  },
  {
    pattern:
      /\bfood warmer\b/i,
    category:
      "food-warmer",
  },
  {
    pattern:
      /\bpressure cooker\b/i,
    category:
      "pressure-cooker",
  },
  {
    pattern:
      /\bgas burner\b/i,
    category:
      "gas-burner",
  },
  {
    pattern:
      /\bdehydrator\b/i,
    category:
      "dehydrator",
  },
  {
    pattern:
      /\bbakeware\b/i,
    category:
      "bakeware",
  },
  {
    pattern:
      /\b(?:mould|mold)s?\b/i,
    category:
      "moulds",
  },
  {
    pattern:
      /\b(?:fruit platter|trays?)\b/i,
    category:
      "trays",
  },
  {
    pattern:
      /\bwooden (?:spoon|utensil)/i,
    category:
      "wooden-utensils",
  },
  {
    pattern:
      /\b(?:cutlery|utensils?)\b/i,
    category:
      "cutlery-utensils",
  },
  {
    pattern:
      /\bspoons?\b/i,
    category:
      "spoons",
  },
  {
    pattern:
      /\bstraws?\b/i,
    category:
      "straws",
  },
  {
    pattern:
      /\b(?:colander|sieve)\b/i,
    category:
      "sieve",
  },
  {
    pattern:
      /\bchopping board\b/i,
    category:
      "chopping-board",
  },
  {
    pattern:
      /\bscales?\b/i,
    category:
      "scale",
  },
  {
    pattern:
      /\bwaste bins?\b/i,
    category:
      "waste-bin",
  },
  {
    pattern:
      /\b(?:vacuum|vaccum) cleaner\b/i,
    category:
      "vacuum-cleaner",
  },
  {
    pattern:
      /\bclothes? dryer\b/i,
    category:
      "clothes-dryer",
  },
  {
    pattern:
      /\bironing board\b|\birons?\b/i,
    category:
      "iron",
  },
  {
    pattern:
      /\blaundry\b/i,
    category:
      "laundry",
  },
  {
    pattern:
      /\b(?:hanger|peg)s?\b/i,
    category:
      "hangers",
  },
  {
    pattern:
      /\bladders?\b/i,
    category:
      "ladders",
  },
  {
    pattern:
      /\bglassware\b/i,
    category:
      "glassware",
  },
  {
    pattern:
      /\bdinnerware\b/i,
    category:
      "dinnerware",
  },
  {
    pattern:
      /\bcleaning\b/i,
    category:
      "cleaning-tools",
  },
  {
    pattern:
      /\bracks?\b/i,
    category:
      "rack",
  },
  {
    pattern:
      /\bcovers?\b/i,
    category:
      "covers",
  },
  {
    pattern:
      /\bmats?\b/i,
    category:
      "mats",
  },
  {
    pattern:
      /\btables?\b/i,
    category:
      "tables",
  },
  {
    pattern:
      /\bpantry\b|\bstorage\b|\bcontainers?\b|\bcanisters?\b/i,
    category:
      "pantry-storage-organiser",
  },
  {
    pattern:
      /\bcookware\b/i,
    category:
      "cookware",
  },
  {
    pattern:
      /\bovens?\b/i,
    category:
      "oven",
  },
  {
    pattern:
      /\bmixers?\b/i,
    category:
      "mixer",
  },
];

function classify(
  product: LegacyProduct
): Classification | null {
  const currentCategory =
    String(
      product.category ||
        ""
    ).trim();

  const isAlreadyFlat =
    validCategories.has(
      currentCategory as CategorySlug
    );

  // Old "cookware" was also a parent name; stored subtype wins.
  const subtype =
    legacySubcategoryToCategory(
      product.subcategory
    );

  if (
    isAlreadyFlat &&
    currentCategory !==
      "cookware"
  ) {
    return {
      category:
        currentCategory as CategorySlug,
      reason:
        "Already a flat category",
    };
  }

  if (
    subtype
  ) {
    return {
      category:
        subtype,
      reason:
        "Existing product type mapped to a flat category",
    };
  }

  if (
    isAlreadyFlat
  ) {
    return {
      category:
        currentCategory as CategorySlug,
      reason:
        "Already a flat category",
    };
  }

  const seedCategory =
    seedCategoryById.get(
      product.id
    );

  if (
    seedCategory
  ) {
    return {
      category:
        seedCategory,
      reason:
        "Reviewed seed product mapping",
    };
  }

  const name =
    product.name ||
    "";

  const nameRule =
    nameRules.find(
      (
        rule
      ) =>
        rule.pattern.test(
          name
        )
    );

  if (
    nameRule
  ) {
    return {
      category:
        nameRule.category,
      reason:
        "Product name match — check the preview",
    };
  }

  if (
    currentCategory ===
    "bathroom"
  ) {
    return {
      category:
        "bath-series",
      reason:
        "Old bathroom category",
    };
  }

  return null;
}

async function createPreview() {
  const products =
    (
      await getProducts()
    ) as LegacyProduct[];

  const changes: CategoryChange[] = [];
  const unresolved: Array<{
    id: string;
    name: string;
    category: string;
    subcategory: string;
  }> = [];

  let unchanged = 0;

  for (
    const product of
    products
  ) {
    const fromCategory =
      String(
        product.category ||
          ""
      ).trim();

    const hadSubcategory =
      Object.prototype.hasOwnProperty.call(
        product,
        "subcategory"
      );

    const fromSubcategory =
      String(
        product.subcategory ??
          ""
      ).trim();

    const result =
      classify(
        product
      );

    if (
      !result
    ) {
      unresolved.push({
        id:
          product.id,
        name:
          product.name,
        category:
          fromCategory,
        subcategory:
          fromSubcategory,
      });
      continue;
    }

    if (
      result.category ===
        fromCategory &&
      !hadSubcategory
    ) {
      unchanged +=
        1;
      continue;
    }

    changes.push({
      id:
        product.id,
      name:
        product.name,
      slug:
        product.slug,
      fromCategory,
      fromSubcategory,
      toCategory:
        result.category,
      reason:
        result.reason,
    });
  }

  const fingerprint =
    createHash(
      "sha256"
    )
      .update(
        JSON.stringify(
          products.map(
            (
              product
            ) => [
              product.id,
              product.name,
              product.slug,
              product.category,
              product.subcategory ??
                null,
            ]
          )
        )
      )
      .digest(
        "hex"
      );

  return {
    total:
      products.length,
    updated:
      changes.length,
    unchanged,
    unresolved,
    changes,
    fingerprint,
  };
}

export async function GET() {
  if (
    !isAdminAuthed()
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    return NextResponse.json(
      await createPreview(),
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not preview product categories.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  if (
    !isAdminAuthed()
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      { status: 401 }
    );
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  if (
    body?.confirm !==
      true ||
    typeof body?.fingerprint !==
      "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Preview and confirm this migration first.",
      },
      { status: 400 }
    );
  }

  try {
    const preview =
      await createPreview();

    if (
      body.fingerprint !==
      preview.fingerprint
    ) {
      return NextResponse.json(
        {
          error:
            "Products changed after the preview. Preview again.",
        },
        { status: 409 }
      );
    }

    if (
      preview.total ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No products to migrate.",
        },
        { status: 409 }
      );
    }

    if (
      preview.unresolved.length >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Some products need manual category review.",
          unresolved:
            preview.unresolved,
        },
        { status: 409 }
      );
    }

    const db =
      await getDb();
    const collection =
      db.collection(
        COLLECTIONS.PRODUCTS
      );
    let updated =
      0;

    // Only category data changes. IDs, slugs, images, prices,
    // variants, stock and native item codes remain untouched.
    for (
      const change of
      preview.changes
    ) {
      const result =
        await collection.updateOne(
          {
            id:
              change.id,
            category:
              change.fromCategory,
          },
          {
            $set: {
              category:
                change.toCategory,
            },
            $unset: {
              subcategory:
                "",
            },
          }
        );

      if (
        result.matchedCount !==
        1
      ) {
        throw new Error(
          `Product ${change.id} changed during migration. Preview again and review the database.`
        );
      }

      updated +=
        1;

      revalidatePath(
        `/product/${change.slug}`
      );
      revalidatePath(
        `/shop/${change.fromCategory}`
      );
      revalidatePath(
        `/shop/${change.toCategory}`
      );
    }

    revalidatePath("/");
    revalidatePath(
      "/shop"
    );
    revalidatePath(
      "/admin/products"
    );

    return NextResponse.json({
      ok: true,
      updated,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Category migration failed. Check the database before retrying.",
      },
      { status: 500 }
    );
  }
}