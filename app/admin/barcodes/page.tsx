import { getProducts } from "@/lib/db";
import { getProductCosts } from "@/lib/product-costs";
import ProductBarcodeList from "../products/ProductBarcodeList";

export const dynamic = "force-dynamic";

export default async function BarcodeManagementPage() {
  const products = await getProducts();
  const costs = await getProductCosts(products.map((product) => product.id));
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Inventory</p>
      <h1 className="mt-1 font-display text-3xl text-cocoa-800">Barcode management</h1>
      <p className="mt-2 text-sm text-stone-600">Find products and their Code 128 labels. Open a barcode and use your browser to print it.</p>
      <div className="mt-6"><ProductBarcodeList products={products} costs={costs} defaultOpen /></div>
    </div>
  );
}