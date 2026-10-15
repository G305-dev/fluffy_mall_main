import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProductById } from "@/lib/db";
import { getProductCosts } from "@/lib/product-costs";
import ProductEditor from "../../ProductEditor";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  const [categories, costs] = await Promise.all([
    getAdminCategories(),
    getProductCosts([product.id]),
  ]);

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
        Inventory / Products / Edit
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-3xl text-cocoa-800">
            Edit product
          </h1>
          <p className="mt-2 break-words text-sm text-stone-600">
            {product.name}
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          Back to products
        </Link>
      </div>
      <div className="mt-6 max-w-2xl">
        <ProductEditor
          key={product.id}
          product={product}
          categories={categories}
          initialPurchaseCost={costs[product.id]}
          mobile
        />
      </div>
    </div>
  );
}