import { randomBytes } from "crypto";
import type { Product } from "@/lib/types";

export class BarcodeError extends Error {}

// Code 128 can represent printable ASCII. Enforce a practical label length.
export function code128Text(value: unknown): string {
  if (typeof value !== "string") {
    throw new BarcodeError("Enter a barcode.");
  }
  const text = value.trim();
  if (!text || text.length > 48 || !/^[\x20-\x7e]+$/.test(text)) {
    throw new BarcodeError("Use 1–48 printable English letters, numbers or symbols for Code 128.");
  }
  return text;
}

export function existingBarcodes(products: Product[]) {
  const used = new Set<string>();
  for (const product of products) {
    if (product.barcode) used.add(product.barcode);
    for (const variant of product.variants || []) {
      if (variant.barcode) used.add(variant.barcode);
    }
  }
  return used;
}

export function claimBarcode(value: string, used: Set<string>) {
  if (used.has(value)) {
    throw new BarcodeError(`Barcode ${value} is already assigned to another product or option.`);
  }
  used.add(value);
  return value;
}

export function newBarcode(used: Set<string>) {
  for (let attempt = 0; attempt < 10; attempt++) {
    // 80 bits of randomness. Prefix distinguishes locally created labels.
    const value = `FM${randomBytes(10).toString("hex").toUpperCase()}`;
    if (!used.has(value)) {
      used.add(value);
      return value;
    }
  }
  throw new BarcodeError("Could not generate a unique barcode. Try again.");
}

export function regenerateInStockBarcodes(products: Product[]) {
  const used = existingBarcodes(products);
  let regenerated = 0;
  let outOfStock = 0;

  const updatedProducts = products.map((product) => {
    let barcode = product.barcode;
    if (product.stock > 0) {
      regenerated += 1;
      barcode = newBarcode(used);
    } else {
      outOfStock += 1;
      if (!barcode) {
        regenerated += 1;
        barcode = newBarcode(used);
      }
    }
    const variants = (product.variants || []).map((variant) => {
      if (variant.stock <= 0) {
        outOfStock += 1;
        if (variant.barcode) return variant;
        regenerated += 1;
        return { ...variant, barcode: newBarcode(used) };
      }
      regenerated += 1;
      return { ...variant, barcode: newBarcode(used) };
    });
    return { ...product, barcode, variants };
  });

  return { products: updatedProducts, regenerated, outOfStock };
}