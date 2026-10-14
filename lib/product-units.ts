export const PRODUCT_UNITS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "l", label: "Litres (L)" },
  { value: "ml", label: "Millilitres (mL)" },
  { value: "pack", label: "Packs" },
  { value: "box", label: "Boxes" },
  { value: "set", label: "Sets" },
  { value: "pair", label: "Pairs" },
  { value: "dozen", label: "Dozens" },
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number]["value"];

export function isProductUnit(value: unknown): value is ProductUnit {
  return typeof value === "string" && PRODUCT_UNITS.some((unit) => unit.value === value);
}