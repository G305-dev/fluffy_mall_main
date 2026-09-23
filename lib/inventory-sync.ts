import { revalidatePath } from "next/cache";
import {
  fetchTraceposProducts,
  normalizeTraceposCode,
  type TraceposProduct,
} from "@/lib/tracepos";
import { getProducts, saveProducts } from "@/lib/db";

function parseStock(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (String(value).trim() === "") {
    return null;
  }

  const stock = Number(value);

  if (!Number.isFinite(stock) || stock < 0) {
    return null;
  }

  return stock;
}

export async function syncWebsiteStockFromTracepos() {
  const [websiteProducts, traceposProducts] =
    await Promise.all([
      getProducts(),
      fetchTraceposProducts(),
    ]);

  const traceposByCode = new Map<
    string,
    TraceposProduct
  >();

  const duplicateTraceposCodes = new Set<string>();

  for (const traceposProduct of traceposProducts) {
    const code = normalizeTraceposCode(
      traceposProduct.item_code ||
        traceposProduct.sku
    );

    if (!code) {
      continue;
    }

    if (traceposByCode.has(code)) {
      duplicateTraceposCodes.add(code);
      continue;
    }

    traceposByCode.set(code, traceposProduct);
  }

  const websiteCodeCounts = new Map<string, number>();

  function countWebsiteCode(value: unknown) {
    const code = normalizeTraceposCode(value);

    if (!code) {
      return;
    }

    websiteCodeCounts.set(
      code,
      (websiteCodeCounts.get(code) || 0) + 1
    );
  }

  for (const product of websiteProducts) {
    countWebsiteCode(product.traceposItemCode);

    for (const variant of product.variants) {
      countWebsiteCode(variant.traceposItemCode);
    }
  }

  const duplicateWebsiteCodes = new Set(
    Array.from(websiteCodeCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([code]) => code)
  );

  let updated = 0;
  let unchanged = 0;
  let unmatchedWebsiteItems = 0;
  let unmappedWebsiteItems = 0;
  let ambiguousWebsiteItems = 0;
  let invalidTraceposStock = 0;

  const changedSlugs = new Set<string>();

  function resolveStock(codeValue: unknown) {
    const code = normalizeTraceposCode(codeValue);

    if (!code) {
      unmappedWebsiteItems += 1;
      return null;
    }

    if (
      duplicateWebsiteCodes.has(code) ||
      duplicateTraceposCodes.has(code)
    ) {
      ambiguousWebsiteItems += 1;
      return null;
    }

    const traceposProduct = traceposByCode.get(code);

    if (!traceposProduct) {
      unmatchedWebsiteItems += 1;
      return null;
    }

    const stock = parseStock(
      traceposProduct.current_stock
    );

    if (stock === null) {
      invalidTraceposStock += 1;
      return null;
    }

    return stock;
  }

  const nextProducts = websiteProducts.map((product) => {
    let productStock = product.stock;
    let productChanged = false;

    const productStockFromTracepos = resolveStock(
      product.traceposItemCode
    );

    if (
      productStockFromTracepos !== null &&
      productStock !== productStockFromTracepos
    ) {
      productStock = productStockFromTracepos;
      productChanged = true;
      updated += 1;
    } else if (productStockFromTracepos !== null) {
      unchanged += 1;
    }

    let variantsChanged = false;

    const nextVariants = product.variants.map(
      (variant) => {
        const variantStockFromTracepos =
          resolveStock(variant.traceposItemCode);

        if (
          variantStockFromTracepos === null
        ) {
          return variant;
        }

        if (
          variant.stock === variantStockFromTracepos
        ) {
          unchanged += 1;
          return variant;
        }

        variantsChanged = true;
        updated += 1;

        return {
          ...variant,
          stock: variantStockFromTracepos,
        };
      }
    );

    if (productChanged || variantsChanged) {
      changedSlugs.add(product.slug);

      return {
        ...product,
        stock: productStock,
        variants: nextVariants,
      };
    }

    return product;
  });

  if (updated > 0) {
    await saveProducts(nextProducts);

    revalidatePath("/");
    revalidatePath("/shop");

    for (const slug of changedSlugs) {
      revalidatePath(`/product/${slug}`);
    }
  }

  const websiteCodes = new Set(
    websiteCodeCounts.keys()
  );

  const unmatchedTraceposItems =
    traceposProducts.filter((product) => {
      const code = normalizeTraceposCode(
        product.item_code || product.sku
      );

      return code && !websiteCodes.has(code);
    }).length;

  return {
    traceposProducts: traceposProducts.length,
    websiteProducts: websiteProducts.length,
    updated,
    unchanged,
    unmatchedWebsiteItems,
    unmappedWebsiteItems,
    ambiguousWebsiteItems,
    unmatchedTraceposItems,
    invalidTraceposStock,
    duplicateWebsiteCodes: Array.from(
      duplicateWebsiteCodes
    ),
    duplicateTraceposCodes: Array.from(
      duplicateTraceposCodes
    ),
    changedSlugs: Array.from(changedSlugs),
  };
}