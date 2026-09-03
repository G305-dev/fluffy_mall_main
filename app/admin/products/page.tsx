import { getProducts } from "@/lib/db";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import ProductEditor from "./ProductEditor";
import NewProductForm from "./NewProductForm";

export default async function AdminProductsPage() {
  const products = await getProducts();
  return (
    <div>
      <h1 className="font-display text-3xl">Products</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">
        Add new products, or edit prices, stock and names on existing ones. Changes write to the catalog immediately.
      </p>
      <div className="mt-6">
        <NewProductForm />
      </div>
      <div className="space-y-3 lg:hidden">
        {products.map((p) => (
          <ProductEditor key={p.id} product={p} mobile />
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-3xl bg-white ring-1 ring-cream-200 lg:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-cream-200 text-xs uppercase tracking-wider text-gold-600">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">Price</th>
              <th className="p-4">Stock</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <ProductEditor key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-500">{products.length} launch products · {naira(products.reduce((s, p) => s + p.price, 0))} listed value at base prices</p>
    </div>
  );
}