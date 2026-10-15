import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-categories";
import {
  getProducts,
  saveProducts,
} from "@/lib/db";
import { nativeItemCode } from "@/lib/native-item-codes";
import {
  code128Text,
  claimBarcode,
  existingBarcodes,
  newBarcode,
} from "@/lib/product-barcodes";
import { isProductUnit } from "@/lib/product-units";
import { saveProductCosts } from "@/lib/product-costs";
import {
  productNameKey,
  stockQuantity,
  stockReportCategory,
} from "@/lib/product-import-matching";
import { readProductSheet } from "@/lib/product-spreadsheet";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES =
  5 * 1024 * 1024;
const PLACEHOLDER =
  "/images/product-placeholder.svg";
const DELIVERY_TIMES =
  "Lagos delivery: 1–2 working days. Nationwide delivery: 3–5 working days.";

type Issue = {
  row: number;
  message: string;
};

function price(
  raw: string,
  label: string,
  allowZero = false
) {
  const cleaned =
    raw.replace(
      /[₦,\s]/g,
      ""
    );

  const value =
    Number(cleaned);

  if (
    !raw.trim() ||
    !Number.isFinite(
      value
    ) ||
    (
      allowZero
        ? value < 0
        : value <= 0
    ) ||
    Math.abs(
      value * 100 -
        Math.round(
          value * 100
        )
    ) > 0.000001
  ) {
    throw new Error(
      `${label} must be ${
        allowZero
          ? "zero or more"
          : "greater than zero"
      }, with up to two decimals.`
    );
  }

  return (
    Math.round(
      value * 100
    ) / 100
  );
}

function flag(value: string) {
  if (!value.trim()) {
    return false;
  }

  if (
    /^(true|yes|1)$/i.test(
      value
    )
  ) {
    return true;
  }

  if (
    /^(false|no|0)$/i.test(
      value
    )
  ) {
    return false;
  }

  throw new Error(
    "Use yes/no or true/false for flags."
  );
}

function safeImage(
  raw: string
) {
  const url =
    raw.trim();

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

  throw new Error(
    "Image URL must be a local /images/ path or public Vercel Blob URL."
  );
}

function images(
  raw: string
) {
  if (!raw.trim()) {
    return [
      PLACEHOLDER,
    ];
  }

  let values: unknown;

  if (
    raw
      .trim()
      .startsWith("[")
  ) {
    try {
      values =
        JSON.parse(
          raw
        );
    } catch {
      throw new Error(
        "image_urls is not valid JSON."
      );
    }
  } else {
    values =
      raw.split(
        "|"
      );
  }

  if (
    !Array.isArray(
      values
    ) ||
    !values.length ||
    values.length > 12
  ) {
    throw new Error(
      "Use up to 12 images."
    );
  }

  return Array.from(
    new Set(
      values.map(
        (value) =>
          safeImage(
            String(
              value
            )
          )
      )
    )
  );
}

function slugify(
  name: string
) {
  return (
    name
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .slice(
        0,
        80
      ) ||
    "product"
  );
}

export async function POST(
  req: NextRequest
) {
  if (
    !isAdminAuthed()
  ) {
    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status:
          401,
      }
    );
  }

  try {
    const mode =
      req.nextUrl.searchParams.get(
        "mode"
      );

    if (
      mode !== "preview" &&
      mode !== "import"
    ) {
      return NextResponse.json(
        {
          error:
            "Select preview or import.",
        },
        {
          status:
            400,
        }
      );
    }

    const form =
      await req.formData();
    const file =
      form.get("file");

    if (
      !(file instanceof File) ||
      !file.size ||
      file.size >
        MAX_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a CSV or XLSX file under 5 MB.",
        },
        {
          status:
            400,
        }
      );
    }

    const sheet =
      await readProductSheet(
        file
      );
    const categories =
      await getAdminCategories();

    const fallbackCategory =
      String(
        form.get(
          "defaultCategory"
        ) || ""
      ).trim();

    if (
      fallbackCategory &&
      !stockReportCategory(
        fallbackCategory,
        categories
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unknown default category.",
        },
        {
          status:
            400,
        }
      );
    }

    const existing =
      await getProducts();
    const byId =
      new Map(
        existing.map(
          (product) => [
            product.id,
            product,
          ]
        )
      );
    const names =
      new Set(
        existing.map(
          (product) =>
            productNameKey(
              product.name
            )
        )
      );
    const usedBarcodes =
      existingBarcodes(
        existing
      );
    const slugs =
      new Set(
        existing.map(
          (product) =>
            product.slug
        )
      );

    const candidates: Product[] = [];
    const updates =
      new Map<
        string,
        Product
      >();
    const costs: Record<
      string,
      number
    > = {};
    const duplicates: Issue[] = [];
    const held: Issue[] = [];
    const invalid: Issue[] = [];

    const stockReport =
      sheet.some(
        (row) =>
          Boolean(
            row.stockReport
          )
      );

    for (
      const {
        line,
        fields,
        stockReport:
          source,
      } of sheet
    ) {
      try {
        const name =
          fields.name.trim();

        if (
          !name ||
          name.length >
            200
        ) {
          throw new Error(
            "Product name is required (up to 200 characters)."
          );
        }

        if (
          stockReport ||
          source
        ) {
          held.push({
            row: line,
            message:
              "Classified stock-report rows are not used to replace the current website inventory.",
          });
          continue;
        }

        if (
          fields.product_type
            .trim()
            .toLowerCase() ===
            "variable" ||
          fields.variants_json.trim()
        ) {
          held.push({
            row: line,
            message:
              "Variant imports are paused. Existing variant products are preserved.",
          });
          continue;
        }

        const current =
          fields.id.trim()
            ? byId.get(
                fields.id.trim()
              )
            : undefined;

        if (
          fields.id.trim() &&
          !current
        ) {
          held.push({
            row: line,
            message:
              "Website product ID not found. Remove the ID only if this really is a new product.",
          });
          continue;
        }

        if (
          current &&
          (
            current.productType ===
              "variable" ||
            current.variants?.length
          )
        ) {
          held.push({
            row: line,
            message:
              "This existing product has variants and is paused.",
          });
          continue;
        }

        if (
          !current &&
          names.has(
            productNameKey(
              name
            )
          )
        ) {
          duplicates.push({
            row: line,
            message:
              "Name matches an existing or earlier new product. Supply the website ID to edit it.",
          });
          continue;
        }

        if (
          current &&
          updates.has(
            current.id
          )
        ) {
          duplicates.push({
            row: line,
            message:
              "The same website product appears twice in this file.",
          });
          continue;
        }

        const category =
          stockReportCategory(
            fields.category ||
              fallbackCategory ||
              current?.category ||
              "",
            categories
          );

        if (
          !category
        ) {
          throw new Error(
            "Unknown category. Choose an existing website category."
          );
        }

        const sellingPrice =
          price(
            fields.price,
            "Selling price"
          );

        const compareAt =
          fields.compare_at.trim()
            ? price(
                fields.compare_at,
                "Compare-at price"
              )
            : undefined;

        const parsed =
          fields.stock.trim()
            ? stockQuantity(
                fields.stock,
                fields.unit
              )
            : {
                stock:
                  current?.stock ??
                  0,
                unit:
                  fields.unit
                    .trim()
                    .toLowerCase() ||
                  current?.unit ||
                  "pcs",
              };

        if (
          !isProductUnit(
            parsed.unit
          )
        ) {
          throw new Error(
            "Choose a supported unit."
          );
        }

        if (
          !current &&
          parsed.stock <
            0
        ) {
          throw new Error(
            "New product stock cannot be negative."
          );
        }

        if (
          current &&
          parsed.stock !==
            current.stock
        ) {
          held.push({
            row: line,
            message:
              "Existing website stock is not changed by a spreadsheet. Use an audited stock adjustment.",
          });
          continue;
        }

        const purchaseCost =
          fields.purchase_cost.trim()
            ? price(
                fields.purchase_cost,
                "Purchase cost",
                true
              )
            : undefined;

        const checkedBarcodes =
          new Set(
            usedBarcodes
          );

        if (
          current
        ) {
          const barcode =
            fields.barcode.trim() &&
            fields.barcode.trim() !==
              current.barcode
              ? claimBarcode(
                  code128Text(
                    fields.barcode
                  ),
                  checkedBarcodes
                )
              : current.barcode;

          const next: Product = {
            ...current,
            name,
            category,
            price:
              sellingPrice,
            barcode,
            compareAt:
              compareAt ===
              undefined
                ? current.compareAt
                : compareAt,
            images:
              fields.image_urls.trim()
                ? images(
                    fields.image_urls
                  )
                : current.images,
            short:
              fields.short ||
              current.short,
            description:
              fields.description ||
              current.description,
            deliveryNote:
              fields.delivery_note ||
              current.deliveryNote,
            unit:
              parsed.unit,
            featured:
              fields.featured.trim()
                ? flag(
                    fields.featured
                  )
                : current.featured,
            bestseller:
              fields.bestseller.trim()
                ? flag(
                    fields.bestseller
                  )
                : current.bestseller,
          };

          updates.set(
            current.id,
            next
          );

          for (
            const code of
            Array.from(
              checkedBarcodes
            )
          ) {
            usedBarcodes.add(
              code
            );
          }

          if (
            purchaseCost !==
            undefined
          ) {
            costs[
              current.id
            ] =
              purchaseCost;
          }

          continue;
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

        let slug =
          slugify(
            name
          );
        let counter =
          2;

        while (
          slugs.has(
            slug
          )
        ) {
          slug = `${slugify(
            name
          )}-${counter++}`;
        }

        const imagePaths =
          images(
            fields.image_urls
          );

        const barcode =
          fields.barcode.trim()
            ? claimBarcode(
                code128Text(
                  fields.barcode
                ),
                checkedBarcodes
              )
            : newBarcode(
                checkedBarcodes
              );

        const product: Product = {
          id,
          itemCode:
            nativeItemCode(
              id
            ),
          slug,
          name,
          category,
          price:
            sellingPrice,
          compareAt,
          stock:
            parsed.stock,
          unit:
            parsed.unit,
          images:
            imagePaths,
          barcode,
          short:
            fields.short ||
            "",
          description:
            fields.description ||
            "",
          deliveryNote:
            fields.delivery_note ||
            DELIVERY_TIMES,
          featured:
            flag(
              fields.featured
            ),
          bestseller:
            flag(
              fields.bestseller
            ),
          productType:
            "standard",
          variants: [],
        };

        candidates.push(
          product
        );
        slugs.add(
          slug
        );
        names.add(
          productNameKey(
            name
          )
        );

        for (
          const code of
          Array.from(
            checkedBarcodes
          )
        ) {
          usedBarcodes.add(
            code
          );
        }

        if (
          purchaseCost !==
          undefined
        ) {
          costs[
            id
          ] =
            purchaseCost;
        }
      } catch (
        error
      ) {
        invalid.push({
          row: line,
          message:
            error instanceof
            Error
              ? error.message
              : "Invalid row.",
        });
      }
    }

    const report = {
      total:
        sheet.length,
      stockReport,
      importable:
        candidates.length,
      updatable:
        updates.size,
      duplicates:
        duplicates.length,
      held:
        held.length,
      invalid:
        invalid.length,
      issues: [
        ...invalid,
        ...held,
        ...duplicates,
      ].slice(
        0,
        100
      ),
      sample:
        candidates
          .slice(
            0,
            10
          )
          .map(
            (
              item
            ) => ({
              name:
                item.name,
              code:
                mode ===
                "preview"
                  ? "Generated when applied"
                  : item.itemCode ||
                    "",
              category:
                item.category,
              price:
                item.price,
              image:
                item.images[0] !==
                PLACEHOLDER,
            })
          ),
      updateSample:
        Array.from(
          updates.values()
        )
          .slice(
            0,
            10
          )
          .map(
            (
              item
            ) => ({
              name:
                item.name,
              code:
                item.itemCode ||
                "",
              price:
                item.price,
              stock:
                item.stock,
            })
          ),
    };

    if (
      mode ===
      "preview"
    ) {
      return NextResponse.json(
        report
      );
    }

    if (
      invalid.length
    ) {
      return NextResponse.json(
        {
          ...report,
          error:
            "Fix invalid rows before importing; no products were changed.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !candidates.length &&
      !updates.size
    ) {
      return NextResponse.json({
        ...report,
        imported:
          0,
        updated:
          0,
      });
    }

    const nextProducts =
      existing
        .map(
          (
            item
          ) =>
            updates.get(
              item.id
            ) ||
            item
        )
        .concat(
          candidates
        );

    try {
      await saveProducts(
        nextProducts
      );

      if (
        Object.keys(
          costs
        ).length
      ) {
        await saveProductCosts(
          costs
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[product import]",
        error
      );
      return NextResponse.json(
        {
          ...report,
          error:
            error instanceof
            Error
              ? error.message
              : "Import failed. Refresh and preview again.",
        },
        {
          status:
            409,
        }
      );
    }

    revalidatePath(
      "/"
    );
    revalidatePath(
      "/shop"
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

    for (
      const item of [
        ...candidates,
        ...Array.from(
          updates.values()
        ),
      ]
    ) {
      revalidatePath(
        `/product/${item.slug}`
      );
    }

    return NextResponse.json({
      ...report,
      imported:
        candidates.length,
      updated:
        updates.size,
    });
  } catch (
    error
  ) {
    console.error(
      "[product import]",
      error
    );
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Could not read product file.",
      },
      {
        status:
          400,
      }
    );
  }
}