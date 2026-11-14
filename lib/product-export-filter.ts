import type { Product } from "./types";

export type ProductExportType = "all" | "standard" | "variable";

/** Match spreadsheet type inference for older products without productType. */
export function filterProductsForExport(products: Product[], type: ProductExportType): Product[] {
  return products.filter((product) => {
    const productType = product.productType || (product.variants?.length ? "variable" : "standard");
    return type === "all" || productType === type;
  });
}
