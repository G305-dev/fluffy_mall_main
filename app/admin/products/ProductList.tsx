"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Product } from "@/lib/types";
import ProductEditor from "./ProductEditor";

export default function ProductList({
  products,
}: {
  products: Product[];
}) {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) {
      return products;
    }

    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm)
    );
  }, [products, query]);

  return (
    <>
      <div className="mb-5 rounded-2xl bg-white p-4 ring-1 ring-cream-200">
        <div className="flex items-center gap-3">
          <label className="relative block flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product name..."
              aria-label="Search product name"
              className="w-full rounded-full border border-cream-300 bg-cream-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
            />
          </label>

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-cocoa-700 ring-1 ring-cream-300 hover:bg-cream-100"
            >
              <X size={15} />
              Clear
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-stone-500">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-stone-500 ring-1 ring-cream-200">
          No product name matches your search.
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {filteredProducts.map((product) => (
              <ProductEditor
                key={product.id}
                product={product}
                mobile
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl bg-white ring-1 ring-cream-200 lg:block">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-cream-200 text-xs uppercase tracking-wider text-gold-600">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <ProductEditor
                    key={product.id}
                    product={product}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
