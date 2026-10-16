import { categoryName } from "@/lib/categories";
import type { Product } from "@/lib/types";

// A sellable product/variant with 1–5 units left needs attention.
export const LOW_STOCK_LIMIT = 5;

export type InventoryItem = {
  key: string;
  productId: string;
  productName: string;
  variantName: string;
  category: string;
  categoryLabel: string;
  barcode: string;
  stock: number;
  price: number;
};

function nonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

// Count variants instead of their parent when variants exist so units are not double-counted.
export function toInventoryItems(products: Product[]): InventoryItem[] {
  return products.flatMap((product) => {
    const shared = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      categoryLabel: categoryName(product.category),
    };

    if (product.variants?.length) {
      return product.variants.map((variant, index) => ({
        ...shared,
        key: `${product.id}:${variant.id || index}`,
        variantName: variant.name || "Option",
        barcode: String(variant.barcode ?? "").trim(),
        stock: nonNegativeNumber(variant.stock),
        price: nonNegativeNumber(variant.price) || nonNegativeNumber(product.price),
      }));
    }

    return [{
      ...shared,
      key: product.id,
      variantName: "",
      barcode: String(product.barcode ?? "").trim(),
      stock: nonNegativeNumber(product.stock),
      price: nonNegativeNumber(product.price),
    }];
  });
}

export type StockLevel = "healthy" | "low" | "out";

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return "out";
  if (stock <= LOW_STOCK_LIMIT) return "low";
  return "healthy";
}

export function summarizeInventory(items: InventoryItem[]) {
  const summary = {
    options: items.length,
    units: 0,
    healthy: 0,
    low: 0,
    out: 0,
    coded: 0,
  };

  for (const item of items) {
    summary.units += item.stock;
    summary[stockLevel(item.stock)] += 1;
    if (item.barcode) summary.coded += 1;
  }

  return { ...summary, attention: summary.low + summary.out };
}