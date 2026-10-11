import ProductCard from "@/components/ProductCard";
import MobileCategorySubcategories from "@/components/MobileCategorySubcategories";
import {
  CATEGORIES,
  categoryName,
} from "@/lib/categories";
import { getProducts } from "@/lib/db";
import { CategorySlug } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export function generateMetadata({
  params,
}: {
  params: { category: string };
}) {
  return {
    title: categoryName(params.category),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: {
    category: string;
  };
  searchParams: {
    subcategory?: string;
  };
}) {
  const category = CATEGORIES.find(
    (item) => item.slug === params.category
  );

  if (!category) {
    notFound();
  }

  const activeSubcategory =
    category.subcategories.includes(
      searchParams.subcategory || ""
    )
      ? searchParams.subcategory || ""
      : "";

  const allProducts = await getProducts();

  const products = allProducts
    .filter(
      (product) =>
        product.category ===
        (params.category as CategorySlug)
    )
    .filter((product) => {
      if (!activeSubcategory) {
        return true;
      }

      return (
        product.subcategory ===
        activeSubcategory
      );
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/shop"
        className="text-sm text-terracotta-600 hover:underline"
      >
        ← All products
      </Link>

      <div className="mt-5">
        <h1 className="break-words font-display text-3xl text-cocoa-800 sm:text-4xl">
          {category.name}
        </h1>

        <p className="mt-2 text-sm text-cocoa-700/70">
          {category.blurb}
        </p>
      </div>

      <MobileCategorySubcategories
        categoryName={category.name}
        subcategories={category.subcategories}
        activeSubcategory={activeSubcategory}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-cream-200">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa-800">
              Category
            </p>

            <h2 className="mt-4 text-lg font-semibold text-cocoa-900">
              {category.name}
            </h2>

            <nav
              aria-label={`${category.name} subcategories`}
              className="mt-4 space-y-1"
            >
              <Link
                href={`/shop/${category.slug}`}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  !activeSubcategory
                    ? "bg-cream-100 font-semibold text-cocoa-900"
                    : "text-cocoa-700 hover:bg-cream-50"
                }`}
              >
                All {category.name}
              </Link>

              {category.subcategories.map(
                (subcategory) => {
                  const selected =
                    activeSubcategory ===
                    subcategory;

                  return (
                    <Link
                      key={subcategory}
                      href={`/shop/${category.slug}?subcategory=${encodeURIComponent(
                        subcategory
                      )}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        selected
                          ? "bg-cream-100 font-semibold text-cocoa-900"
                          : "text-cocoa-700 hover:bg-cream-50"
                      }`}
                    >
                      {subcategory}
                    </Link>
                  );
                }
              )}
            </nav>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-cream-200 pb-4">
            <div>
              {activeSubcategory && (
                <p className="text-sm text-cocoa-700">
                  Showing products in{" "}
                  <strong>
                    {activeSubcategory}
                  </strong>
                </p>
              )}

              {!activeSubcategory && (
                <p className="text-sm text-cocoa-700/70">
                  Browse all products in{" "}
                  {category.name}.
                </p>
              )}
            </div>

            <p className="shrink-0 text-sm text-cocoa-700/70">
              {products.length}{" "}
              {products.length === 1
                ? "item"
                : "items"}
            </p>
          </div>

          {products.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="reveal"
                  data-reveal-delay={
                    (index % 4) * 80
                  }
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-cream-200">
              <p className="text-sm text-cocoa-700/70">
                No products are currently listed
                in this subcategory.
              </p>

              <Link
                href={`/shop/${category.slug}`}
                className="mt-4 inline-flex rounded-full bg-cocoa-800 px-5 py-2.5 text-sm font-semibold text-white"
              >
                View all {category.name}
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}