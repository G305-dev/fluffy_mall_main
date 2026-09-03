import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/categories";
import { getProducts } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || "").trim().toLowerCase();
  const products = await getProducts();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.short.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
    : products;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Catalog</p>
      <h1 className="mt-2 break-words font-display text-3xl text-cocoa-800 sm:text-4xl">
        {q ? `Results for “${searchParams.q}”` : "All products"}
      </h1>
      <p className="mt-2 text-sm text-cocoa-700/70">{filtered.length} items</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/shop" className="rounded-full bg-cocoa-800 px-3 py-1.5 text-xs text-cream-50">
          All
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className="rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-cream-300"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p, i) => (
          <div key={p.id} className="reveal" data-reveal-delay={(i % 4) * 80}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="py-16 text-center text-cocoa-700">No products match that search. Try “ladder”, “drainer” or “gift”.</p>
      )}
    </div>
  );
}
