import { getProducts } from "@/lib/db";
import NewProductForm from "./NewProductForm";
import ProductList from "./ProductList";
import ProductImportExport from "./ProductImportExport";
import CategoryMigrationButton from "./CategoryMigrationButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
        Inventory / Products
      </p>
      <h1 className="mt-1 font-display text-3xl text-cocoa-800">Products</h1>
      <p className="mt-2 text-sm text-stone-600">
        Add and edit products, or import and export the product catalogue.
        Imported products without a photo display an “Image coming soon” placeholder in the store.
      </p>

      <div className="mt-6">
        <ProductImportExport />
        <NewProductForm />
        <CategoryMigrationButton />
      </div>

      <ProductList products={products} />
    </div>
  );
}