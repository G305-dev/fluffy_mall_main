import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="max-w-xl rounded-2xl border border-stone-200 bg-white p-6">
      <h1 className="font-display text-2xl text-cocoa-800">Product not found</h1>
      <p className="mt-2 text-sm text-stone-600">
        This product may have been deleted, or the link is outdated.
      </p>
      <Link
        href="/admin/products"
        className="mt-5 inline-block rounded-xl bg-[#ff8200] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e87700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        Back to products
      </Link>
    </div>
  );
}