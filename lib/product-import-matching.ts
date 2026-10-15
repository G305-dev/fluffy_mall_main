import type { AdminCategory } from "./admin-categories";

// Spreadsheet labels map to existing main website categories only.
const CATEGORY_ALIASES: Record<string, string> = {
  "food storage": "pantry-storage-organiser",
  "refridgerator storage": "pantry-storage-organiser",
  organisers: "pantry-storage-organiser",
  "pantry organiser": "pantry-storage-organiser",
  "spice sauce bottles": "pantry-storage-organiser",
  glasswares: "glassware",
  laundries: "laundry",
  "vaccum cleaner": "vacuum-cleaner",
  "cooking spoon": "spoons",
  spoon: "spoons",
  utensils: "cutlery-utensils",
  cutleries: "cutlery-utensils",
  woodens: "wooden-utensils",
  straw: "straws",
  cover: "covers",
  mold: "moulds",
  "spray bottles": "cleaning-tools",
  "cloth dryer": "clothes-dryer",
  "cloth dryers": "clothes-dryer",
};

function words(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/organizer/g, "organiser")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function productNameKey(name: string) {
  return words(name).replace(/ /g, "");
}

export function stockReportCategory(
  label: string,
  categories: AdminCategory[]
): string | null {
  const key = words(label);

  if (key === "tray" || key === "trays") {
    return categories.some((item) => item.slug === "trays")
      ? "trays"
      : null;
  }

  const exact = categories.find(
    (item) =>
      words(item.name) === key ||
      words(item.slug) === key
  );

  if (exact) return exact.slug;

  const alias = CATEGORY_ALIASES[key];

  return alias &&
    categories.some((item) => item.slug === alias)
    ? alias
    : null;
}

export function stockQuantity(
  raw: string,
  explicitUnit = ""
) {
  if (!raw.trim()) {
    return {
      stock: 0,
      unit:
        explicitUnit.trim().toLowerCase() || "pcs",
    };
  }

  const match = raw
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*(pc|pcs)?$/i);

  if (!match) {
    throw new Error(
      "Stock must be a whole number, optionally followed by PC or Pcs."
    );
  }

  const stock = Number(match[1]);

  if (!Number.isSafeInteger(stock)) {
    throw new Error(
      "Stock must be a whole number. Negative balances are preserved."
    );
  }

  const unit =
    explicitUnit.trim().toLowerCase() ||
    "pcs";

  if (match[2] && unit !== "pcs") {
    throw new Error(
      "PC/Pcs cannot be combined with another unit."
    );
  }

  return { stock, unit };
}