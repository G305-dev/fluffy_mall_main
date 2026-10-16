"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";

export default function ProductBarcodeList({
  products,
  costs,
}: {
  products: Product[];
  costs: Record<string, number>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const coded = products.filter((product) => product.barcode || product.variants.some((variant) => variant.barcode));
  const visible = coded.filter((product) =>
    `${product.name} ${product.barcode || ""} ${product.variants.map((variant) => variant.barcode || "").join(" ")}`
      .toLowerCase().includes(query.trim().toLowerCase())
  );

  async function regenerateBarcodes() {
    const confirmed = window.confirm(
      "This will replace barcodes for every product and option currently in stock, keep existing out-of-stock barcodes, create barcodes for any out-of-stock product or option missing one, and permanently remove saved external POS item codes and sales-sync details from products and past orders. Continue?"
    );
    if (!confirmed) return;

    setBusy(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/products/regenerate-barcodes", {
        method: "POST",
        cache: "no-store",
      });
      const result: {
        regenerated?: number;
        outOfStock?: number;
        cleanedOrders?: number;
        error?: string;
      } = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not regenerate barcodes.");
      setNotice(
        `Generated or replaced ${result.regenerated ?? 0} barcodes. All ${result.outOfStock ?? 0} out-of-stock products and options have barcodes; any existing out-of-stock barcodes were kept. Removed saved external POS sync details from ${result.cleanedOrders ?? 0} past orders.`
      );
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not regenerate barcodes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details id="product-barcodes" className="mb-6 rounded-2xl border border-stone-100 bg-white p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold text-cocoa-800">Code 128 product labels ({coded.length})</summary>
      <p className="mt-2 text-xs text-stone-500">Purchase costs shown here are private. Open a label to print it.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={regenerateBarcodes}
          disabled={busy}
          className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {busy ? "Updating barcodes…" : "Generate barcodes & clear old POS data"}
        </button>
        <p className="text-xs text-stone-500">
          In-stock barcodes are replaced. Existing out-of-stock barcodes are kept, and any missing ones are created.
        </p>
      </div>
      {notice && <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="mt-4 block max-w-sm text-xs font-medium text-stone-600">Find a product or barcode
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm" placeholder="Search labels" />
      </label>
      <div className="mt-4 max-h-[40rem] space-y-3 overflow-y-auto">
        {visible.map((product) => (
          <div key={product.id} className="rounded-xl border border-stone-100 p-3">
            <p className="font-medium text-cocoa-800">{product.name}</p>
            <p className="text-xs text-stone-500">
              {product.stock} {product.unit || "pcs"} in stock
              {costs[product.id] !== undefined && ` · Purchase cost ₦${costs[product.id].toLocaleString("en-NG")}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {[
                ...(product.barcode ? [{ name: "Product", value: product.barcode }] : []),
                ...product.variants.filter((variant) => variant.barcode).map((variant) => ({ name: variant.name, value: variant.barcode! })),
              ].map(({ name, value }) => {
                const href = `/api/admin/barcode?value=${encodeURIComponent(value)}`;
                return (
                  <a key={value} href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-stone-200 p-2 text-xs text-orange-700 hover:border-orange-400">
                    <span className="block font-medium text-cocoa-800">{name}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={href} loading="lazy" alt={`Code 128 barcode ${value}`} className="mt-1 h-16 max-w-full" />
                    <span className="block break-all font-mono">{value} · Print</span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
        {!visible.length && <p className="py-5 text-sm text-stone-500">No matching product labels.</p>}
      </div>
    </details>
  );
}