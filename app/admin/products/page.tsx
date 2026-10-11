import { getProducts } from "@/lib/db";
import NewProductForm from "./NewProductForm";
import ProductList from "./ProductList";
import CategoryMigrationButton from "./CategoryMigrationButton";

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1 className="font-display text-3xl">
        Products
      </h1>

      <p className="mt-2 text-sm text-cocoa-700/70">
        Add new products, or edit prices, stock, names and images
        on existing products.
      </p>

      <div className="mt-6">
        <NewProductForm />
        <CategoryMigrationButton />
      </div>

      <ProductList products={products} />
    </div>
  );
}
