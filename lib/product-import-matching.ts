import type { AdminCategory } from "./admin-categories";
import type { Product } from "./types";

// Map labels from the stock report onto existing *main* website categories.
// A saved admin category with the same name always wins, except Tray/Trays.
const STOCK_CATEGORY_ALIASES: Record<string, string> = {
  "food storage": "pantry-storage-organiser",
  "refridgerator storage": "pantry-storage-organiser",
  "organisers": "pantry-storage-organiser",
  "pantry organiser": "pantry-storage-organiser",
  "pantry": "pantry-storage-organiser",
  "spice sauce bottles": "pantry-storage-organiser",
  "glasswares": "glassware",
  "laundries": "laundry",
  "cloth dryer": "clothes-dryer",
  "vaccum cleaner": "vacuum-cleaner",
  "cooking spoon": "spoons",
  "spoon": "spoons",
  "utensils": "cutlery-utensils",
  "cutleries": "cutlery-utensils",
  "woodens": "wooden-utensils",
  "straw": "straws",
  "cover": "covers",
  "mold": "moulds",
  "spray bottles": "cleaning-tools",
};

function words(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase().replace(/organizer/g, "organiser")
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function productNameKey(name: string) {
  return words(name).replace(/ /g, "");
}

export function itemCodeKey(code: unknown) {
  return String(code ?? "").trim().toUpperCase();
}

export function stockReportCategory(label: string, categories: AdminCategory[]): string | null {
  const key = words(label);
  if (key === "tray" || key === "trays") {
    return categories.some((item) => item.slug === "trays") ? "trays" : null;
  }
  const exact = categories.find((item) => words(item.name) === key || words(item.slug) === key);
  if (exact) return exact.slug;
  const alias = STOCK_CATEGORY_ALIASES[key];
  return alias && categories.some((item) => item.slug === alias) ? alias : null;
}

export function stockQuantity(raw: string, explicitUnit = "") {
  if (!raw.trim()) return { stock: 0, unit: explicitUnit.trim().toLowerCase() || "pcs" };
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*(pc|pcs)?$/i);
  if (!match) throw new Error("Stock must be a whole number, optionally followed by PC or Pcs.");
  const stock = Number(match[1]);
  if (!Number.isSafeInteger(stock) || stock < 0) {
    throw new Error("Stock must be a non-negative whole number; no quantity was changed.");
  }
  const unit = explicitUnit.trim().toLowerCase() || "pcs";
  if (match[2] && unit !== "pcs") {
    throw new Error("Stock uses pieces (PC/Pcs), but the unit column specifies another unit.");
  }
  return { stock, unit };
}

// The report classified these as singles because it lacks a product-type flag.
// They are sizes of an existing variable ladder and the two 6-step codes conflict.
export function heldLadderSize(name: string, category: string) {
  return words(category) === "ladders" &&
    /^(?:[3456] steps? ladder|ladder [3456] steps?)$/.test(words(name));
}

function possibleDuplicate(name: string, price: number, existing: Product) {
  if (existing.price !== price || existing.variants?.length) return false;
  const a = new Set(words(name).split(" "));
  const b = new Set(words(existing.name).split(" "));
  if (a.size < 2 || b.size < 2) return false;
  const common = Array.from(a).filter((part) => b.has(part));
  return common.length >= 2 && (common.length === a.size || common.length === b.size);
}

type CodeOwner = { product: Product; variantName?: string };
export type MatchResult =
  | { kind: "new" }
  | { kind: "update"; product: Product }
  | { kind: "duplicate" | "held"; message: string };

// Checks the live catalogue, *including variant item codes*, before a row is
// accepted. The returned plan only matches existing STANDARD products by name
// or code; ambiguous matches and possible duplicates must be reviewed by hand.
export function createProductMatcher(existing: Product[]) {
  const byCode = new Map<string, CodeOwner[]>();
  const byName = new Map<string, Product[]>();
  const acceptedCodes = new Map<string, string>();
  const acceptedNames = new Map<string, string>();
  const acceptedIds = new Set<string>();

  function addCode(code: unknown, owner: CodeOwner) {
    const key = itemCodeKey(code);
    if (key) byCode.set(key, [...(byCode.get(key) || []), owner]);
  }
  for (const product of existing) {
    const name = productNameKey(product.name);
    byName.set(name, [...(byName.get(name) || []), product]);
    addCode(product.traceposItemCode, { product });
    for (const variant of product.variants || []) {
      addCode(variant.traceposItemCode, { product, variantName: variant.name });
    }
  }

  function match(name: string, rawCode: string, price: number, stock: number, updateExisting: boolean): MatchResult {
    const nameKey = productNameKey(name);
    const code = itemCodeKey(rawCode);
    const priorCodeName = acceptedCodes.get(code);
    if (code && priorCodeName) {
      return priorCodeName === nameKey
        ? { kind: "duplicate", message: `Item code ${code} occurs more than once in this file.` }
        : { kind: "held", message: `Item code ${code} is assigned to two different names in this file.` };
    }
    const priorNameCode = acceptedNames.get(nameKey);
    if (priorNameCode !== undefined) {
      return priorNameCode === code
        ? { kind: "duplicate", message: `The product ${name} occurs more than once in this file.` }
        : { kind: "held", message: `The name ${name} occurs with different item codes in this file.` };
    }

    const codeOwners = code ? byCode.get(code) || [] : [];
    const nameOwners = byName.get(nameKey) || [];
    if (codeOwners.length > 1 || nameOwners.length > 1) {
      return { kind: "held", message: "More than one existing product matches this name or item code; review it manually." };
    }
    if (codeOwners[0]?.variantName) {
      return { kind: "held", message: `Item code ${code} belongs to an existing product option. No new single product was added.` };
    }
    if (codeOwners[0] && nameOwners[0] && codeOwners[0].product.id !== nameOwners[0].id) {
      return { kind: "held", message: `Item code ${code} and name ${name} belong to different existing products.` };
    }
    const product = codeOwners[0]?.product || nameOwners[0];
    if (product) {
      if (product.variants?.length || product.productType === "variable") {
        return { kind: "held", message: `${product.name} is already a variable product. Its options were not changed.` };
      }
      if (codeOwners[0] && productNameKey(product.name) !== nameKey) {
        return { kind: "held", message: `Item code ${code} already belongs to ${product.name}, not ${name}.` };
      }
      const oldCode = itemCodeKey(product.traceposItemCode);
      if (code && oldCode && code !== oldCode) {
        return { kind: "held", message: `${product.name} already has a different item code (${oldCode}).` };
      }
      if (acceptedIds.has(product.id)) {
        return { kind: "held", message: `${product.name} was matched by another row in this file.` };
      }
      if (updateExisting && (product.price !== price || product.stock !== stock || (code && !oldCode))) {
        return { kind: "update", product };
      }
      return { kind: "duplicate", message: `${product.name} is already on the website; it was not added twice.` };
    }

    if (updateExisting) {
      const close = existing.find((item) => possibleDuplicate(name, price, item));
      if (close) {
        return { kind: "held", message: `Possible duplicate of ${close.name} (same price). Review before importing.` };
      }
    }
    return { kind: "new" };
  }

  function accept(name: string, rawCode: string, productId?: string) {
    const code = itemCodeKey(rawCode);
    const key = productNameKey(name);
    if (code) acceptedCodes.set(code, key);
    acceptedNames.set(key, code);
    if (productId) acceptedIds.add(productId);
  }

  return { match, accept };
}