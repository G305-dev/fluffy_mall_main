import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProducts } from "@/lib/db";
import { code128Text, claimBarcode, existingBarcodes, newBarcode } from "@/lib/product-barcodes";
import { isProductUnit } from "@/lib/product-units";
import { saveProductCosts } from "@/lib/product-costs";
import { getDb, COLLECTIONS } from "@/lib/mongo";
import {
  barcodeKey, createProductMatcher, heldLadderSize,
  stockQuantity, stockReportCategory,
} from "@/lib/product-import-matching";
import { readProductSheet } from "@/lib/product-spreadsheet";
import type { CategorySlug, Product, ProductVariant } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER = "/images/product-placeholder.svg";
const DELIVERY_TIMES = "Lagos delivery: 1–2 working days. Nationwide delivery: 3–5 working days.";
const SINGLE_NOTE = "No obvious variant marker; product type is not confirmed by this report";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product";
}

function numberField(value: string, label: string, allowZero = false) {
  const number = Number(value.replace(/[₦,\s]/g, ""));
  if (!value.trim() || !Number.isFinite(number) || (allowZero ? number < 0 : number <= 0)) {
    throw new Error(`${label} must be ${allowZero ? "zero or more" : "greater than zero"}.`);
  }
  return number;
}

function flag(value: string) {
  if (!value.trim()) return false;
  if (/^(true|yes|1)$/i.test(value)) return true;
  if (/^(false|no|0)$/i.test(value)) return false;
  throw new Error(`Invalid yes/no value: ${value.slice(0, 30)}`);
}

function safeImage(value: string) {
  const url = value.trim();
  if (/^\/images\/(?!.*(?:\.\.|%2e%2e|[?#]))[a-zA-Z0-9_./%() -]+$/i.test(url)) return url;
  if (/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[a-zA-Z0-9_./%()-]+$/i.test(url)) return url;
  throw new Error("Image URL must be a local /images/ path or a public Vercel Blob URL. Leave blank to use the placeholder.");
}

function readImages(value: string) {
  if (!value.trim()) return [PLACEHOLDER];
  let values: unknown;
  if (value.trim().startsWith("[")) {
    try { values = JSON.parse(value); } catch { throw new Error("image_urls contains invalid JSON."); }
  } else {
    values = value.split("|");
  }
  if (!Array.isArray(values) || !values.length || values.length > 12) {
    throw new Error("Use up to 12 image URLs separated by | (or a JSON array).");
  }
  return Array.from(new Set(values.map((entry) => safeImage(String(entry)))));
}

function readVariants(value: string, productId: string, mainImage: string): ProductVariant[] {
  if (!value.trim()) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error("variants_json contains invalid JSON."); }
  if (!Array.isArray(parsed) || parsed.length > 40) {
    throw new Error("variants_json must be an array with up to 40 options.");
  }
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid variant.");
    const raw = entry as Record<string, unknown>;
    const size = String(raw.size ?? "").trim();
    const color = String(raw.color ?? "").trim();
    const name = String(raw.name ?? "").trim() || [size, color].filter(Boolean).join(" / ");
    if (!name) throw new Error("Every variant needs a name, size or color.");
    const image = raw.image && String(raw.image) !== PLACEHOLDER
      ? safeImage(String(raw.image)) : mainImage;
    const stock = numberField(String(raw.stock ?? ""), "Variant stock", true);
    if (!Number.isSafeInteger(stock)) throw new Error("Variant stock must be a whole number.");
    return {
      id: `${productId}-variant-${index + 1}`,
      name: name.slice(0, 120),
      size: size || undefined,
      color: color || undefined,
      price: numberField(String(raw.price ?? ""), "Variant price"),
      stock,
      image,
      barcode: raw.barcode ? code128Text(raw.barcode) : undefined,
    };
  });
}

type Issue = { row: number; message: string };
type ExistingUpdate = { product: Product; barcode: string; price: number; stock: number };
class CatalogChangedError extends Error {}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode !== "preview" && mode !== "import") {
      return NextResponse.json({ error: "Select preview or import mode." }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Choose a non-empty CSV or XLSX file under 5 MB." }, { status: 400 });
    }
    const categories = await getAdminCategories();
    const defaultCategory = String(form.get("defaultCategory") || "").trim();
    if (defaultCategory && !stockReportCategory(defaultCategory, categories)) {
      return NextResponse.json({ error: "Unknown default category." }, { status: 400 });
    }

    const sheet = await readProductSheet(file);
    const stockReport = sheet.every((row) => Boolean(row.stockReport));
    let existing: Product[];
    try {
      existing = await getProducts();
    } catch (error) {
      console.error("[product import load]", error);
      return NextResponse.json({ error: "Could not load existing products." }, { status: 500 });
    }
    const matcher = createProductMatcher(existing);
    const usedBarcodes = existingBarcodes(existing);
    const usedSlugs = new Set(existing.map((product) => product.slug));
    const purchaseCosts: Record<string, number> = {};

    const candidates: Product[] = [];
    const updates: ExistingUpdate[] = [];
    const duplicates: Issue[] = [];
    const held: Issue[] = [];
    const invalid: Issue[] = [];
    for (const { line, fields, stockReport: source } of sheet) {
      const prefix = source?.sourceRow ? `Source row ${source.sourceRow}: ` : "";
      try {
        const name = fields.name.trim();
        if (!name || name.length > 200) throw new Error("Product name is required (max 200 characters).");
        if (source && source.classificationNote !== SINGLE_NOTE) {
          held.push({ row: line, message: `${prefix}Only classified Single candidates can be imported; review this row.` });
          continue;
        }
        if (source && (heldLadderSize(name, fields.category) || name.includes(" - ") || fields.variants_json.trim() || fields.product_type.trim().toLowerCase() === "variable")) {
          held.push({ row: line, message: `${prefix}Possible variant/ladder size held for review; no single product created.` });
          continue;
        }
        const barcode = barcodeKey(fields.barcode);
        const category = stockReportCategory(fields.category || defaultCategory, categories);
        if (!category) throw new Error(`Unknown category ${fields.category || defaultCategory || "(blank)"}. Choose a website category.`);
        const price = numberField(fields.price, "Price");
        const { stock, unit } = stockQuantity(fields.stock, fields.unit);
        if (!isProductUnit(unit)) throw new Error("Choose a valid unit (pcs, kg, g, l, ml, pack, box, set, pair or dozen).");

        const match = matcher.match(name, barcode, price, stock, Boolean(source));
        if (match.kind === "held") {
          held.push({ row: line, message: prefix + match.message });
          continue;
        }
        if (match.kind === "duplicate") {
          duplicates.push({ row: line, message: prefix + match.message });
          continue;
        }
        if (match.kind === "update") {
          // Stock reports update ONLY the matching standard product's barcode,
          // price and stock. Existing photos, category and copy stay intact.
          updates.push({ product: match.product, barcode: fields.barcode.trim(), price, stock });
          matcher.accept(name, barcode, match.product.id);
          continue;
        }

        const compareAt = fields.compare_at ? numberField(fields.compare_at, "Compare-at price") : undefined;
        const images = readImages(fields.image_urls);
        const featured = flag(fields.featured);
        const bestseller = flag(fields.bestseller);
        const productId = `p-${randomUUID().replace(/-/g, "").slice(0, 20)}`;
        const variants = readVariants(fields.variants_json, productId, images[0]);
        const checkedBarcodes = new Set(usedBarcodes);
        const productBarcode = fields.barcode.trim()
          ? claimBarcode(code128Text(fields.barcode), checkedBarcodes)
          : newBarcode(checkedBarcodes);
        const barcodedVariants = variants.map((variant) => ({
          ...variant,
          barcode: variant.barcode
            ? claimBarcode(variant.barcode, checkedBarcodes)
            : newBarcode(checkedBarcodes),
        }));
        const rowBarcodes = [productBarcode, ...barcodedVariants.map((variant) => variant.barcode)];
        const productType = fields.product_type.trim().toLowerCase() || (variants.length ? "variable" : "standard");
        if (productType !== "standard" && productType !== "variable") throw new Error("Product type must be standard or variable.");
        if ((productType === "variable") !== (variants.length > 0)) throw new Error("Variable products need options; standard products cannot have options.");
        const purchaseCost = fields.purchase_cost.trim() ? numberField(fields.purchase_cost, "Purchase cost", true) : undefined;
        let slug = slugify(fields.slug || name);
        const base = slug;
        let suffix = 2;
        while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
        usedSlugs.add(slug);
        rowBarcodes.forEach((value) => usedBarcodes.add(value));
        matcher.accept(name, barcode);
        if (purchaseCost !== undefined) purchaseCosts[productId] = purchaseCost;
        candidates.push({
          id: productId,
          slug,
          name,
          category: category as CategorySlug,
          price,
          unit,
          productType,
          barcode: productBarcode,
          compareAt,
          stock: variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : stock,
          images,
          short: fields.short.slice(0, 500),
          description: fields.description.slice(0, 5000),
          deliveryNote: fields.delivery_note.includes(DELIVERY_TIMES)
            ? fields.delivery_note
            : [DELIVERY_TIMES, fields.delivery_note].filter(Boolean).join(" "),
          featured,
          bestseller,
          variants: barcodedVariants,
        });
      } catch (error) {
        invalid.push({ row: line, message: prefix + (error instanceof Error ? error.message : "Invalid row.") });
      }
    }

    const report = {
      total: sheet.length,
      stockReport,
      importable: candidates.length,
      updatable: updates.length,
      duplicates: duplicates.length,
      held: held.length,
      invalid: invalid.length,
      issues: [...invalid, ...held, ...duplicates].slice(0, 100),
      sample: candidates.slice(0, 5).map((product) => ({
        name: product.name,
        barcode: product.barcode || "—",
        category: product.category,
        price: product.price,
        image: product.images[0] !== PLACEHOLDER,
      })),
      updateSample: updates.slice(0, 5).map(({ product, barcode, price, stock }) => ({ name: product.name, barcode: barcode || product.barcode || "—", price, stock })),
    };

    if (mode === "preview") return NextResponse.json(report);
    if (invalid.length) {
      return NextResponse.json({ ...report, error: "Fix all invalid rows before importing. Nothing was saved." }, { status: 422 });
    }
    if (!candidates.length && !updates.length) {
      return NextResponse.json({ ...report, imported: 0, updated: 0 });
    }

    let updated = 0;
    let imported = 0;
    try {
      // Never use saveProducts: it deletes other products. Costs stay private.
      await saveProductCosts(purchaseCosts);
      const db = await getDb();
      const collection = db.collection(COLLECTIONS.PRODUCTS);
      for (const { product, barcode, price, stock } of updates) {
        // Optimistic guard: don't overwrite an edit made after the preview.
        const changes: Record<string, unknown> = { price, stock };
        if (barcode) changes.barcode = barcode;
        const result = await collection.updateOne(
          {
            id: product.id,
            price: product.price,
            stock: product.stock,
            barcode: product.barcode || { $in: [null, ""] },
            $or: [{ variants: { $size: 0 } }, { variants: { $exists: false } }],
          },
          { $set: changes }
        );
        if (!result.matchedCount) {
          throw new CatalogChangedError(`Existing product ${product.name} changed while importing. Refresh the preview and retry.`);
        }
        updated += 1;
      }
      if (candidates.length) {
        const result = await collection.insertMany(
          candidates.map((product, index) => ({ ...product, sortOrder: existing.length + index })),
          { ordered: true }
        );
        imported = result.insertedCount;
      }
    } catch (error) {
      console.error("[product import write]", error);
      return NextResponse.json({
        ...report,
        updated,
        error: error instanceof CatalogChangedError
          ? `${error.message} ${updated ? "Some earlier rows were updated." : "No new products were inserted."}`
          : "The import may have partially completed. Refresh Products and preview again before retrying; matching barcodes and names are skipped.",
      }, { status: error instanceof CatalogChangedError ? 409 : 500 });
    }
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/admin");
    revalidatePath("/admin/products");
    revalidatePath("/admin/inventory");
    revalidatePath("/sitemap.xml");
    for (const { product } of updates) {
      revalidatePath(`/product/${product.slug}`);
    }
    for (const category of Array.from(new Set([
      ...candidates.map((product) => product.category),
      ...updates.map(({ product }) => product.category),
    ]))) {
      revalidatePath(`/shop/${category}`);
    }
    return NextResponse.json({ ...report, imported, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import products.";
    console.error("[product import]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
