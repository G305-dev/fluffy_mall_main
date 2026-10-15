import { test } from "node:test";
import assert from "node:assert/strict";
import {
  availableStock, hasVariants, isOutOfStock, startingPrice,
  resolveAvailableOrderItems, StockUnavailableError,
} from "../lib/product-availability.ts";

function product(overrides = {}) {
  return {
    id: "p-1", slug: "test-product", name: "Test Product", price: 2000,
    stock: 8, images: ["/images/product-placeholder.svg"], variants: [],
    ...overrides,
  };
}
function option(id, stock, price = 2000) {
  return { id, name: id, stock, price, image: "/images/product-placeholder.svg" };
}
function cart(variantId, qty = 1) {
  return { productId: "p-1", slug: "test-product", name: "Test Product", image: "/images/product-placeholder.svg", unitPrice: 2000, qty, ...(variantId ? { variantId } : {}) };
}

test("a variant product is sold out only if every option has no stock", () => {
  const none = product({ stock: 99, variants: [option("black", 0), option("white", 0)] });
  assert.equal(hasVariants(none), true);
  assert.equal(availableStock(none), 0);
  assert.equal(isOutOfStock(none), true);
  const some = product({ stock: 0, variants: [option("black", 0, 1000), option("white", 1, 2500)] });
  assert.equal(availableStock(some), 1);
  assert.equal(isOutOfStock(some), false);
  assert.equal(startingPrice(some), 2500, "use the lowest purchasable option price");
  assert.equal(startingPrice(none), 2000);
  assert.equal(isOutOfStock(product({ productType: "variable", variants: [] })), true);
  assert.equal(availableStock(product({ variants: [option("black", -5), option("white", 1)] })), 1);
});

test("standard products still use their own stock", () => {
  assert.equal(availableStock(product({ stock: 1 })), 1);
  assert.equal(isOutOfStock(product({ stock: 0 })), true);
  assert.equal(startingPrice(product()), 2000);
});

test("checkout accepts a selected available option at the current catalogue price", () => {
  const p = product({ stock: 0, variants: [option("black", 0, 1000), option("white", 2, 2500)] });
  const resolved = resolveAvailableOrderItems([cart("white", 1)], [p]);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].variantName, "white");
  assert.equal(resolved[0].unitPrice, 2500);
  assert.equal(resolved[0].qty, 1);
});

test("checkout blocks a sold-out option even when the parent or another option has stock", () => {
  const p = product({ stock: 50, variants: [option("black", 0), option("white", 2)] });
  assert.throws(() => resolveAvailableOrderItems([cart("black")], [p]), /black is out of stock/);
  assert.throws(() => resolveAvailableOrderItems([cart()], [p]), /Choose an option/);
  assert.throws(() => resolveAvailableOrderItems([cart("deleted-option")], [p]), /no longer available/);
  assert.throws(() => resolveAvailableOrderItems([cart("white", 3)], [p]), /Only 2/);
  assert.throws(() => resolveAvailableOrderItems([cart("white", 1), cart("white", 2)], [p]), /Only 2/);
  assert.throws(() => resolveAvailableOrderItems([cart("white", 0)], [p]), /valid whole-number quantity/);
});

test("standard products and old or invalid cart entries cannot bypass availability", () => {
  assert.throws(() => resolveAvailableOrderItems([cart()], [product({ stock: 0 })]), StockUnavailableError);
  assert.throws(() => resolveAvailableOrderItems([cart("fake")], [product({ stock: 8 })]), StockUnavailableError);
  assert.throws(() => resolveAvailableOrderItems([cart()], []), StockUnavailableError);
  assert.throws(() => resolveAvailableOrderItems([null], [product()]), StockUnavailableError);
  assert.equal(resolveAvailableOrderItems([cart()], [product({ stock: 1 })])[0].qty, 1);
});