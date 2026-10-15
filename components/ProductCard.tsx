"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import { isOutOfStock, startingPrice } from "@/lib/product-availability";
import { ChevronDown, Heart } from "lucide-react";
import { useWishlist } from "./WishlistProvider";

export default function ProductCard({
  product,
  square = false,
}: {
  product: Product;
  square?: boolean;
}) {
  const { has, toggle } = useWishlist();
  const selectorRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const showVariants = menuOpen || hovered;
  const from = startingPrice(product);
  const outOfStock = isOutOfStock(product);
  const radius = square ? "rounded-none" : "rounded-2xl sm:rounded-3xl";

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutsideTap(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideTap);
    return () => document.removeEventListener("pointerdown", closeOnOutsideTap);
  }, [menuOpen]);

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden bg-white shadow-soft ring-1 ring-cream-200 transition hover:shadow-card ${
        square ? "rounded-none" : radius
      }`}
    >
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden bg-cream-100">
        <Link href={`/product/${product.slug}`} className="absolute inset-0">
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
          aria-label={has(product.id) ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={() => toggle(product.id, product.name)}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-cocoa-800 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <Heart
            size={18}
            fill={has(product.id) ? "currentColor" : "none"}
            className={has(product.id) ? "text-terracotta-500" : ""}
          />
        </button>

        {product.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-terracotta-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
            Bestseller
          </span>
        )}
        {outOfStock && (
          <span className="absolute bottom-3 left-3 rounded-full bg-cocoa-800 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
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
      </Link>

      {product.variants.length > 0 && (
        <div
          ref={selectorRef}
          className="relative z-10 shrink-0 px-3 pb-3 sm:px-4 sm:pb-4"
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") setHovered(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setHovered(false);
              setMenuOpen(false);
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              setHovered(false);
              event.currentTarget.querySelector("button")?.focus();
            }
          }}
        >
          <button
            type="button"
            aria-expanded={showVariants}
            aria-controls={showVariants ? `variants-${product.id}` : undefined}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-1 rounded-full border border-cream-300 bg-cream-50 px-3 py-2 text-left text-xs font-semibold text-cocoa-800 hover:border-terracotta-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta-500"
          >
            Select other variants
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {showVariants && (
            <div id={`variants-${product.id}`} className="absolute bottom-full left-3 right-3 z-20 max-h-44 overflow-y-auto rounded-xl bg-white p-1 shadow-card ring-1 ring-cream-300 sm:left-4 sm:right-4">
              {product.variants.map((variant) => (
                <Link
                  key={variant.id}
                  href={`/product/${product.slug}?variant=${encodeURIComponent(variant.id)}`}
                  className="block rounded-lg px-3 py-2 hover:bg-cream-100 focus-visible:bg-cream-100"
                >
                  <span className="block break-words text-xs font-semibold text-cocoa-800">{variant.name}</span>
                  <span className={`block text-xs ${variant.stock > 0 ? "text-cocoa-700" : "text-red-700"}`}>
                    {naira(variant.price)} · {variant.stock > 0 ? "In stock" : "Out of stock"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}