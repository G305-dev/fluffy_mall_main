import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  fetchTraceposProducts,
  normalizeTraceposCode,
} from "@/lib/tracepos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest
) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const query = (
    req.nextUrl.searchParams.get("q") || ""
  ).trim();

  if (query.length < 2) {
    return NextResponse.json(
      {
        error:
          "Enter at least two characters to search.",
      },
      { status: 400 }
    );
  }

  try {
    const products =
      await fetchTraceposProducts();

    const lowerQuery = query.toLowerCase();
    const normalizedQuery =
      normalizeTraceposCode(query);

    const results = products
      .filter((product) => {
        const searchableValues = [
          product.name,
          product.item_code,
          product.sku,
          product.xid,
          product.id,
        ]
          .filter(Boolean)
          .map((value) => String(value));

        return searchableValues.some((value) => {
          return (
            value
              .toLowerCase()
              .includes(lowerQuery) ||
            normalizeTraceposCode(value).includes(
              normalizedQuery
            )
          );
        });
      })
      .slice(0, 50)
      .map((product) => ({
        xid: product.xid || "",
        id: product.id || "",
        name: product.name || "",
        itemCode: product.item_code || "",
        sku: product.sku || "",
        stock: Number(
          product.current_stock || 0
        ),
      }));

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tracepos product search failed.",
      },
      { status: 500 }
    );
  }
}