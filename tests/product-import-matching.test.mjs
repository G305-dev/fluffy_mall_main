import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES } from "../lib/categories.ts";
import {
  createProductMatcher,
  heldLadderSize,
  productNameKey,
  stockQuantity,
  stockReportCategory,
} from "../lib/product-import-matching.ts";

function product(overrides = {}) {
  return {
    id: "existing-1", name: "Acrylic Cutlery Organiser", price: 10500,
    stock: 20, category: "cutlery-utensils", variants: [],
    slug: "acrylic-cutlery-organiser", ...overrides,
  };
}

test("stock quantities retain one and zero, reject negatives, fractions and unknown suffixes", () => {
  assert.deepEqual(stockQuantity("1.00 PC"), { stock: 1, unit: "pcs" });
  assert.deepEqual(stockQuantity("0.00 Pcs"), { stock: 0, unit: "pcs" });
  assert.deepEqual(stockQuantity("12", "kg"), { stock: 12, unit: "kg" });
  for (const value of ["-1.00 PC", "1.5 PC", "4.00 Steps", "NaN", "1 PC plus 2"]) {
    assert.throws(() => stockQuantity(value));
  }
  assert.throws(() => stockQuantity("2 PC", "kg"));
});

test("the report's category labels resolve to main categories, preserving saved names", () => {
  const aliases = {
    "Food Storage": "pantry-storage-organiser", "Refridgerator storage": "pantry-storage-organiser",
    Organisers: "pantry-storage-organiser", "Pantry Organiser": "pantry-storage-organiser",
    "Spice/Sauce Bottles": "pantry-storage-organiser", Glasswares: "glassware",
    Laundries: "laundry", "Vaccum Cleaner": "vacuum-cleaner", "Cooking spoon": "spoons",
    Spoon: "spoons", Utensils: "cutlery-utensils", cutleries: "cutlery-utensils",
    Woodens: "wooden-utensils", Straw: "straws", cover: "covers", Mold: "moulds",
    "Spray bottles": "cleaning-tools", Tray: "trays", Trays: "trays",
  };
  for (const [label, expected] of Object.entries(aliases)) {
    assert.equal(stockReportCategory(label, CATEGORIES), expected, label);
  }
  assert.equal(stockReportCategory("Air Fryers", CATEGORIES), "air-fryers");
  assert.equal(stockReportCategory("Unknown section", CATEGORIES), null);
  const saved = { slug: "food-storage", name: "Food Storage" };
  assert.equal(stockReportCategory("Food Storage", [...CATEGORIES, saved]), "food-storage");
});

test("names match punctuation, spacing and organiser/organizer spelling", () => {
  assert.equal(productNameKey("3-in-1 Professional Blender"), productNameKey("3in1 Professional Blender"));
  assert.equal(productNameKey("Acrylic Cutlery Organiser"), productNameKey("Acrylic Cutlery Organizer"));
  assert.notEqual(productNameKey("2-Tier Fruit Platter"), productNameKey("3-Tier Fruit Platter"));
});

test("existing single gets an item code, CSV price and stock without a duplicate", () => {
  const existing = product();
  const matcher = createProductMatcher([existing]);
  const first = matcher.match("Acrylic Cutlery Organizer", "TEST-0001", 10500, 13, true);
  assert.equal(first.kind, "update");
  assert.equal(first.product?.id, existing.id);
  matcher.accept("Acrylic Cutlery Organizer", "TEST-0001", existing.id);
  assert.equal(matcher.match("Acrylic Cutlery Organizer", "TEST-0001", 10500, 13, true).kind, "duplicate");
  const rerun = createProductMatcher([product({ traceposItemCode: "TEST-0001", stock: 13 })]);
  assert.equal(rerun.match("Acrylic Cutlery Organizer", "TEST-0001", 10500, 13, true).kind, "duplicate");
  assert.equal(rerun.match("Acrylic Cutlery Organizer", "TEST-0001", 11000, 1, true).kind, "update");
});

test("ambiguous codes, conflicting names and variant codes are never treated as new singles", () => {
  const existing = product({ traceposItemCode: "123" });
  assert.equal(createProductMatcher([existing]).match("Other product", "123", 10500, 1, true).kind, "held");
  assert.equal(createProductMatcher([existing]).match("Acrylic Cutlery Organizer", "456", 10500, 1, true).kind, "held");
  const ladder = product({
    id: "ladder", name: "Multipurpose Folding Ladder", productType: "variable",
    variants: [{ name: "4 steps", traceposItemCode: "777" }],
  });
  assert.equal(createProductMatcher([ladder]).match("4 Steps Ladder", "777", 47000, 3, true).kind, "held");
  assert.equal(createProductMatcher([ladder]).match("Multipurpose Folding Ladder", "800", 40000, 1, true).kind, "held");
  const repeated = createProductMatcher([existing, product({ id: "existing-2" })]);
  assert.equal(repeated.match("Acrylic Cutlery Organizer", "456", 10500, 1, true).kind, "held");
});

test("only unambiguous new names are accepted; likely same-price duplicates are held", () => {
  const existing = product({ id: "brush", name: "Toilet Brush", price: 7500 });
  const matcher = createProductMatcher([existing]);
  assert.equal(matcher.match("Toilet Brush 1", "NEW", 7500, 27, true).kind, "held");
  assert.equal(matcher.match("Toilet Brush 1", "NEW", 8000, 27, true).kind, "new");
  matcher.accept("Toilet Brush 1", "NEW");
  assert.equal(matcher.match("Toilet Brush 1", "DIFFERENT", 8000, 27, true).kind, "held");
  assert.equal(matcher.match("Unrelated product", "NEW", 8000, 1, true).kind, "held");
});

test("ordinary CSV imports still skip existing products instead of changing their details", () => {
  const matcher = createProductMatcher([product()]);
  assert.equal(matcher.match("Acrylic Cutlery Organizer", "NEW-CODE", 9000, 1, false).kind, "duplicate");
  assert.equal(matcher.match("Different product", "NEW-CODE", 9000, 1, false).kind, "new");
});

test("five ladder-size rows are held, not turned into standard products", () => {
  for (const name of ["3 Steps Ladder", "4 Steps Ladder", "5 Steps Ladder", "6 Steps Ladder", "Ladder 6 steps"]) {
    assert.equal(heldLadderSize(name, "Ladders"), true, name);
  }
  assert.equal(heldLadderSize("Multipurpose Folding Ladder", "Ladders"), false);
  assert.equal(heldLadderSize("4 Steps Ladder", "Tools"), false);
});
