"use client";

import Link from "next/link";
import Image from "next/image";
import { Product } from "@/lib/types";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import { hasVariants, isOutOfStock, startingPrice } from "@/lib/product-availability";
import { Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";

export default function ProductCard({
  product,
  square = false,
}: {
  product: Product;
  square?: boolean;
}) {
  const { has, toggle } = useWishlist();

  const from = startingPrice(product);

  const sizes = Array.from(
    new Set(
      product.variants
        .map((variant) => variant.size)
        .filter(Boolean)
    )
  );

  const colors = Array.from(
    new Set(
      product.variants
        .map((variant) => variant.color)
        .filter(Boolean)
    )
  );

  const outOfStock = isOutOfStock(product);
  const paused = hasVariants(product);

  const radius = square
    ? "rounded-none"
    : "rounded-2xl sm:rounded-3xl";

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden bg-white shadow-soft ring-1 ring-cream-200 transition hover:shadow-card ${
        square ? "rounded-none" : radius
      }`}
    >
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-cream-100">
        <Link
          href={`/product/${product.slug}`}
          className="absolute inset-0"
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 240px, 225px"
            className="object-cover transition duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        <button
          type="button"
          aria-label={
            has(product.id)
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          onClick={() =>
            toggle(product.id, product.name)
          }
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-cocoa-800 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Heart
            size={18}
            fill={
              has(product.id)
                ? "currentColor"
                : "none"
            }
            className={
              has(product.id)
                ? "text-terracotta-500"
                : ""
            }
          />
        </button>

        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Bestseller
          </span>
        )}
        {(outOfStock || paused) && (
          <span className="absolute bottom-3 left-3 rounded-full bg-cocoa-800 px-3 py-1 text-xs font-semibold text-white">
            {paused ? "Options paused" : "Out of stock"}
          </span>
        )}
      </div>

      <Link
        href={`/product/${product.slug}`}
        className="flex min-h-0 min-w-0 flex-1 flex-col p-3 sm:p-4"
      >
        <p className="line-clamp-2 break-words text-[9px] uppercase tracking-[0.12em] text-gold-600 sm:text-[11px] sm:tracking-[0.18em]">
          {categoryName(product.category)}
        </p>

        <h3 className="mt-1 line-clamp-2 break-words font-display text-base leading-snug text-cocoa-800 sm:text-lg">
          {product.name}
        </h3>

        {(product.short || outOfStock || paused) && (
          <p className="mt-1 line-clamp-3 text-xs text-cocoa-700/70 sm:text-sm">
            {product.short}

            {(outOfStock || paused) && (
              <span className="block font-medium text-cocoa-800">
                {paused ? "Option sales temporarily paused." : "Currently out of stock."}
              </span>
            )}
          </p>
        )}

        <div className="mt-auto flex min-w-0 flex-col gap-0.5 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:pt-4">
          <p className="break-words text-sm font-semibold leading-tight text-cocoa-800 sm:text-base">
            {product.variants.length
              ? `From ${naira(from)}`
              : naira(product.price)}
          </p>

          {product.compareAt && (
            <p className="text-xs text-stone-400 line-through sm:text-sm">
              {naira(product.compareAt)}
            </p>
          )}
        </div>

        {product.variants.length > 0 && (
          <>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-cocoa-700/70">
              {sizes.length > 0 && `Sizes: ${sizes.join(", ")}`}
              {sizes.length > 0 && colors.length > 0 && " · "}
              {colors.length > 0 && `Colors: ${colors.join(", ")}`}
            </p>
            <div className="mt-2 text-xs text-orange-700">
              <span className="font-semibold">Select other variants</span>
              <ul className="mt-1 hidden max-h-32 space-y-1 overflow-y-auto rounded-lg bg-orange-50 p-2 text-cocoa-700 group-hover:block group-focus-within:block">
                {product.variants.map((variant) => (
                  <li key={variant.id} className="flex justify-between gap-2">
                    <span>{variant.name}</span><span>{naira(variant.price)} · paused</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Link>
    </article>
  );
}