import { getProducts } from "@/lib/db";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProductCosts } from "@/lib/product-costs";
import NewProductForm from "./NewProductForm";
import ProductList from "./ProductList";
import ProductImportExport from "./ProductImportExport";
import ProductBarcodeList from "./ProductBarcodeList";
import CategoryMigrationButton from "./CategoryMigrationButton";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getAdminCategories()]);
  const costs = await getProductCosts(products.map((product) => product.id));

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
        <NewProductForm categories={categories} />
        <ProductImportExport categories={categories} />
        <ProductBarcodeList products={products} costs={costs} />
        <CategoryMigrationButton />
      </div>

      <ProductList products={products} categories={categories} costs={costs} />
    </div>
  );
}