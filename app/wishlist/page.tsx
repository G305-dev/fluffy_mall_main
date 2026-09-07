import Link from "next/link";
import { getProducts } from "@/lib/db";
import WishlistGrid from "@/components/WishlistGrid";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Saved for later</p>
      <h1 className="mt-2 font-display text-3xl text-cocoa-800 sm:text-4xl">Your wishlist</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">Keep the products you love close by.</p>
      <WishlistGrid products={products} />
      <Link href="/shop" className="mt-8 inline-block text-sm font-semibold text-terracotta-600">
        Continue shopping
      </Link>
    </div>
  );
}