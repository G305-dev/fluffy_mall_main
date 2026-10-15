import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getProducts } from "@/lib/db";
import {
  fetchTraceposProducts,
  normalizeTraceposCode,
} from "@/lib/tracepos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const [
      websiteProducts,
      traceposProducts,
    ] = await Promise.all([
      getProducts(),
      fetchTraceposProducts(),
    ]);

    const traceposByCode = new Map<
      string,
      (typeof traceposProducts)[number]
    >();

    for (const product of traceposProducts) {
      const code = normalizeTraceposCode(
        product.item_code || product.sku
      );

      if (code) {
        traceposByCode.set(code, product);
      }
    }

    const websiteItems: Array<{
      code: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      websiteStock: number;
    }> = [];

    for (const product of websiteProducts) {
      if (product.traceposItemCode) {
        websiteItems.push({
          code: normalizeTraceposCode(
            product.traceposItemCode
          ),
          productId: product.id,
          productName: product.name,
          websiteStock: product.stock,
        });
      }

      for (const variant of product.variants) {
        if (!variant.traceposItemCode) {
          continue;
        }

        websiteItems.push({
          code: normalizeTraceposCode(
            variant.traceposItemCode
          ),
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantName: variant.name,
          websiteStock: variant.stock,
        });
      }
    }

    const codeCounts = new Map<string, number>();

    for (const item of websiteItems) {
      codeCounts.set(
        item.code,
        (codeCounts.get(item.code) || 0) + 1
      );
    }

    const duplicateWebsiteCodes = Array.from(
      codeCounts.entries()
    )
      .filter(([, count]) => count > 1)
      .map(([code]) => code);

    const matched = websiteItems
      .filter((item) => traceposByCode.has(item.code))
      .map((item) => {
        const traceposProduct =
          traceposByCode.get(item.code)!;

        return {
          code: item.code,
          productId: item.productId,
          productName: item.productName,
          variantId: item.variantId,
          variantName: item.variantName,
          websiteStock: item.websiteStock,
          traceposName: traceposProduct.name || "",
          traceposId: traceposProduct.id || "",
          traceposStock: Number(
            traceposProduct.current_stock || 0
          ),
        };
      });

    const unmatchedWebsite = websiteItems
      .filter((item) => !traceposByCode.has(item.code))
      .map((item) => ({
        code: item.code,
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        websiteStock: item.websiteStock,
      }));

    const websiteCodes = new Set(
      websiteItems.map((item) => item.code)
    );

    const unmatchedTracepos = traceposProducts
      .map((product) => {
        const code = normalizeTraceposCode(
          product.item_code || product.sku
        );

        return {
          code,
          name: product.name || "",
          traceposId: product.id || "",
          traceposStock: Number(
            product.current_stock || 0
          ),
        };
      })
      .filter(
        (product) =>
          product.code && !websiteCodes.has(product.code)
      );

    return NextResponse.json({
      summary: {
        traceposProducts: traceposProducts.length,
        websiteMappedItems: websiteItems.length,
        matched: matched.length,
        unmatchedWebsite: unmatchedWebsite.length,
        unmatchedTracepos: unmatchedTracepos.length,
        duplicateWebsiteCodes:
          duplicateWebsiteCodes.length,
      },
      matched,
      unmatchedWebsite,
      unmatchedTracepos,
      duplicateWebsiteCodes,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tracepos check failed.",
      },
      { status: 500 }
    );
  }
}