import { createHash } from "crypto";

/** Stable internal code derived solely from the website product's own ID.
 * This never reads imported POS codes or changes the Code 128 barcode. */
export function nativeItemCode(productId: string): string {
  const id = String(productId || "").trim();
  if (!id) throw new Error("A product without an ID cannot receive an item code.");
  const suffix = createHash("sha256")
    .update(`fluffy-mall:item-code:v1:${id}`, "utf8")
    .digest("hex")
    .slice(0, 20)
    .toUpperCase();
  return `FM-${suffix}`;
}