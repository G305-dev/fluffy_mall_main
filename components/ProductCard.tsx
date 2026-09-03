import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";

export default function ProductCard({ product }: { product: Product }) {
  const from = product.variants.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price;
  const availableStock = product.variants.length
    ? product.variants.reduce((total, variant) => total + variant.stock, 0)
    : product.stock;
  const outOfStock = availableStock <= 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group hover-lift flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-cream-200 hover:shadow-card sm:rounded-3xl"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-110"
        />
        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Bestseller
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <p className="line-clamp-2 break-words text-[9px] uppercase tracking-[0.12em] text-gold-600 sm:text-[11px] sm:tracking-[0.18em]">
          {categoryName(product.category)}
        </p>
        <h3 className="mt-1 break-words font-display text-base leading-snug text-cocoa-800 sm:text-lg">{product.name}</h3>
        {(product.short || outOfStock) && (
          <p className="mt-1 line-clamp-3 text-xs text-cocoa-700/70 sm:text-sm">
            {product.short}
            {outOfStock && (
              <span className="block font-medium text-cocoa-800">Currently out of stock.</span>
            )}
          </p>
        )}
        <div className="mt-auto flex min-w-0 flex-col gap-0.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:pt-4">
          <p className="break-words text-sm font-semibold leading-tight text-cocoa-800 sm:text-base">
            {product.variants.length ? `From ${naira(from)}` : naira(product.price)}
          </p>
          {product.compareAt && (
            <p className="text-xs text-stone-400 line-through sm:text-sm">{naira(product.compareAt)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
