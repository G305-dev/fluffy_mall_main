"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import { useWishlist } from "./WishlistProvider";

export default function WishlistGrid({ products }: { products: Product[] }) {
  const { ids } = useWishlist();
  const saved = products.filter((product) => ids.includes(product.id));

  if (saved.length === 0) {
    return (
      <div className="mt-8 rounded-3xl bg-white p-8 text-center ring-1 ring-cream-200">
        <h2 className="font-display text-2xl text-cocoa-800">Your wishlist is empty</h2>
        <p className="mt-2 text-sm text-cocoa-700/70">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className="mt-5 inline-block rounded-full bg-cocoa-800 px-5 py-2.5 text-sm font-semibold text-cream-50">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {saved.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}