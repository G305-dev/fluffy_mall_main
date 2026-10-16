import { test } from "node:test";
import assert from "node:assert/strict";
import { regenerateInStockBarcodes } from "../lib/product-barcodes.ts";

test("regenerates in-stock barcodes and preserves out-of-stock barcodes", () => {
  const products = [
    { id: "standard", stock: 4, barcode: "old-standard", variants: [] },
    {
      id: "options",
      stock: 0,
      barcode: "old-parent",
      variants: [
        { id: "out", stock: 0, barcode: "old-out-option" },
        { id: "in", stock: 2, barcode: "old-in-option" },
      ],
    },
  ];

  const result = regenerateInStockBarcodes(products);
  const [standard, options] = result.products;

  assert.equal(result.regenerated, 2);
  assert.equal(result.outOfStock, 2);
  assert.match(standard.barcode, /^FM[0-9A-F]{20}$/);
  assert.equal(options.barcode, "old-parent");
  assert.equal(options.variants[0].barcode, "old-out-option");
  assert.match(options.variants[1].barcode, /^FM[0-9A-F]{20}$/);
  assert.notEqual(standard.barcode, options.variants[1].barcode);
});
