"use client";

import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";
export default function ProductCard({ product }: { product: Product }) {
  const { has, toggle } = useWishlist();
  const from = product.variants.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price;
  const sizes = Array.from(
    new Set(product.variants.map((variant) => variant.size).filter(Boolean))
  );
  const colors = Array.from(
    new Set(product.variants.map((variant) => variant.color).filter(Boolean))
  );
  const availableStock = product.variants.length
    ? product.variants.reduce((total, variant) => total + variant.stock, 0)
    : product.stock;
  const outOfStock = availableStock <= 0;

  return (
    <article className="group hover-lift flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-cream-200 hover:shadow-card sm:rounded-3xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-100">
        <Link href={`/product/${product.slug}`} className="absolute inset-0">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-110"
          />
        </Link>
        <button
          type="button"
          aria-label={has(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={() => toggle(product.id, product.name)}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-cocoa-800 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Heart size={18} fill={has(product.id) ? "currentColor" : "none"} className={has(product.id) ? "text-terracotta-500" : ""} />
        </button>
        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Bestseller
          </span>
        )}
      </div>
      <Link href={`/product/${product.slug}`} className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <p className="line-clamp-2 break-words text-[9px] uppercase tracking-[0.12em] text-gold-600 sm:text-[11px] sm:tracking-[0.18em]">
          {product.subcategory || categoryName(product.category)}
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
        {product.variants.length > 0 && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cocoa-700/70">
            {sizes.length > 0 && `Sizes: ${sizes.join(", ")}`}
            {sizes.length > 0 && colors.length > 0 && " · "}
            {colors.length > 0 && `Colors: ${colors.join(", ")}`}
          </p>
        )}
      </Link>
    </article>
  );
}
