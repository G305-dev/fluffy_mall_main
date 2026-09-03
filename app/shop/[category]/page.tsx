import ProductCard from "@/components/ProductCard";
import { CATEGORIES, categoryName } from "@/lib/categories";
import { getProducts } from "@/lib/db";
import { CategorySlug } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: { params: { category: string } }) {
  return { title: categoryName(params.category) };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) notFound();
  const products = (await getProducts()).filter((p) => p.category === (params.category as CategorySlug));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link href="/shop" className="text-sm text-terracotta-600">
        ← All products
      </Link>
      <h1 className="mt-3 break-words font-display text-3xl text-cocoa-800 sm:text-4xl">{cat.name}</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">{cat.blurb}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <div key={p.id} className="reveal" data-reveal-delay={(i % 4) * 80}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
