import { test } from "node:test";
import assert from "node:assert/strict";
import { regenerateInStockBarcodes } from "../lib/product-barcodes.ts";

test("regenerates in-stock barcodes, preserves existing out-of-stock barcodes, and adds missing ones", () => {
  const products = [
    { id: "standard", stock: 4, barcode: "old-standard", variants: [] },
    {
      id: "options",
      stock: 0,
      barcode: "old-parent",
      variants: [
        { id: "out", stock: 0, barcode: "old-out-option" },
        { id: "in", stock: 2, barcode: "old-in-option" },
        { id: "missing-out", stock: 0 },
      ],
    },
    { id: "missing-out-product", stock: 0, variants: [] },
  ];

  const result = regenerateInStockBarcodes(products);
  const [standard, options, missingOutOfStockProduct] = result.products;

  assert.equal(result.regenerated, 4);
  assert.equal(result.outOfStock, 4);
  assert.match(standard.barcode, /^FM[0-9A-F]{20}$/);
  assert.equal(options.barcode, "old-parent");
  assert.equal(options.variants[0].barcode, "old-out-option");
  assert.match(options.variants[1].barcode, /^FM[0-9A-F]{20}$/);
  assert.match(options.variants[2].barcode, /^FM[0-9A-F]{20}$/);
  assert.match(missingOutOfStockProduct.barcode, /^FM[0-9A-F]{20}$/);
  const generated = [
    standard.barcode,
    options.variants[1].barcode,
    options.variants[2].barcode,
    missingOutOfStockProduct.barcode,
  ];
  assert.equal(new Set(generated).size, generated.length);
});
