import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getProducts } from "@/lib/db";
import { getProductCosts } from "@/lib/product-costs";
import { filterProductsForExport, type ProductExportType } from "@/lib/product-export-filter";
import { writeProductSheet } from "@/lib/product-spreadsheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format");
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Choose CSV or Excel (.xlsx)." }, { status: 400 });
  }

  const type = req.nextUrl.searchParams.get("type") || "all";
  if (!["all", "standard", "variable"].includes(type)) {
    return NextResponse.json({ error: "Choose all, standard or variable products." }, { status: 400 });
  }

  try {
    const template = req.nextUrl.searchParams.get("template") === "1";
    const allProducts = template ? [] : await getProducts();
    const products = filterProductsForExport(allProducts, type as ProductExportType);
    const costs = template ? {} : await getProductCosts(products.map((product) => product.id));
    const content = await writeProductSheet(products, format, costs);
    const filename = `products-${template ? "template" : `${type}-${new Date().toISOString().slice(0, 10)}`}.${format}`;

    return new NextResponse(typeof content === "string" ? content : new Uint8Array(content), {
      headers: {
        "Content-Type": format === "csv"
          ? "text/csv; charset=utf-8"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[product export]", error);
    return NextResponse.json({ error: "Could not export products." }, { status: 500 });
  }
}