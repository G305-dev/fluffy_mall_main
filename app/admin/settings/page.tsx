import { getProducts } from "@/lib/db";
import { summarizeInventory, toInventoryItems } from "@/lib/admin-inventory";
import type { Product } from "@/lib/types";
import SettingsTabs, { type ProductTypeStats } from "./SettingsTabs";

export const dynamic = "force-dynamic";

// Matches the variable-product discriminator already used in the admin UI
// (see app/admin/products/ProductList.tsx).
function isVariable(product: Product) {
  return product.productType === "variable" || (product.variants?.length ?? 0) > 0;
}

function statsFor(products: Product[], variable: boolean): ProductTypeStats {
  const subset = products.filter((product) => isVariable(product) === variable);
  const summary = summarizeInventory(toInventoryItems(subset));
  return {
    products: subset.length,
    options: summary.options,
    units: summary.units,
    healthy: summary.healthy,
    low: summary.low,
    out: summary.out,
    coded: summary.coded,
  };
}

export default async function AdminSettingsPage() {
  // Catalogue stats are a convenience for the product-type tabs only — if the
  // products collection is unreadable, the page still renders and both tabs
  // show a "stats unavailable" note instead of failing the whole page.
  let standard: ProductTypeStats | null = null;
  let variable: ProductTypeStats | null = null;
  try {
    const products = await getProducts();
    standard = statsFor(products, false);
    variable = statsFor(products, true);
  } catch {
    standard = null;
    variable = null;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Store settings</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">
        View catalogue information for standard and variable products.
      </p>
      <SettingsTabs standard={standard} variable={variable} />
    </div>
  );
}