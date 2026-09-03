import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-24 text-center">
      <h1 className="font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">That page isn’t on the shelf</h1>
      <p className="mt-3 text-cocoa-700/70">Try the catalog, or WhatsApp us with a screenshot as usual.</p>
      <Link href="/shop" className="mt-6 inline-block rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white">
        Browse products
      </Link>
    </div>
  );
}
