"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";

export default function ProductBarcodeList({
  products,
  costs,
}: {
  products: Product[];
  costs: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const coded = products.filter((product) => product.barcode || product.variants.some((variant) => variant.barcode));
  const visible = coded.filter((product) =>
    `${product.name} ${product.barcode || ""} ${product.variants.map((variant) => variant.barcode || "").join(" ")}`
      .toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <details className="mb-6 rounded-2xl border border-stone-100 bg-white p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold text-cocoa-800">Code 128 product labels ({coded.length})</summary>
      <p className="mt-2 text-xs text-stone-500">Purchase costs shown here are private. Open a label to print it.</p>
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