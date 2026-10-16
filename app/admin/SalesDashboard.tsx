"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Banknote, History, Package, RotateCcw, ScanBarcode, Search, X } from "lucide-react";
import { categoryName } from "@/lib/categories";
import { naira } from "@/lib/format";
import { hasVariants } from "@/lib/product-availability";
import type { Product } from "@/lib/types";
import type { PosSummary } from "@/lib/admin-pos-summary";

const PLACEHOLDER = "/images/product-placeholder.svg";

type DashboardItem = {
  key: string;
  name: string;
  variantName?: string;
  barcode?: string;
  category: string;
  stock: number;
  price: number;
  image: string;
};

function dashboardItems(products: Product[]): DashboardItem[] {
  return products.flatMap((product) => {
    if (hasVariants(product)) {
      return (product.variants || []).map((variant) => ({
        key: `${product.id}:${variant.id}`,
        name: product.name,
        variantName: variant.name,
        barcode: variant.barcode,
        category: product.category,
        stock: variant.stock,
        price: variant.price,
        image: variant.image || product.images?.[0] || PLACEHOLDER,
      }));
    }
    return [{
      key: product.id,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      stock: product.stock,
      price: product.price,
      image: product.images?.[0] || PLACEHOLDER,
    }];
  });
}

export default function SalesDashboard({
  products,
  staffName,
  greeting,
  summary,
}: {
  products: Product[];
  staffName: string;
  greeting: string;
  summary: PosSummary;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const items = useMemo(() => dashboardItems(products), [products]);
  const term = query.trim().toLocaleLowerCase();
  const categories = useMemo(() => {
    const used = new Set(items.filter((item) => item.stock > 0).map((item) => item.category));
    return Array.from(used).map((slug) => ({ slug, name: categoryName(slug) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
  const results = useMemo(() => items
    .filter((item) =>
      item.stock > 0 &&
      (category === "all" || item.category === category) &&
      (!term || [item.name, item.variantName, item.barcode]
        .some((value) => value?.toLocaleLowerCase().includes(term)))
    )
    .slice(0, 24), [items, term, category]);
  const availableCount = items.filter((item) => item.stock > 0).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cocoa-800">{greeting}, {staffName}</p>
          <h1 className="mt-1 font-display text-2xl text-cocoa-800 sm:text-3xl">Sales dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">Today&apos;s sales and products available in store.</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
          {availableCount.toLocaleString("en-NG")} sellable items
        </p>
      </header>

      <section aria-label="Today's sales" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {[
          { label: "Sales today", value: naira(summary.salesToday), note: summary.salesChange === null ? "No sales yesterday" : `${summary.salesChange >= 0 ? "+" : ""}${summary.salesChange}% vs yesterday` },
          { label: "Transactions", value: summary.transactions.toLocaleString("en-NG"), note: "Paid in-store sales today" },
          { label: "Average order value", value: naira(summary.averageOrderValue), note: "Based on today's sales" },
          { label: "Top product", value: summary.topProductName, note: `${summary.topProductUnits} sold today` },
        ].map((stat, index) => (
          <article key={stat.label} className="flex min-h-24 items-center gap-3 rounded-xl border border-stone-100 bg-white p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              {index === 0 ? <Banknote size={19} /> : index === 3 ? <Package size={19} /> : <History size={19} />}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-stone-500">{stat.label}</span>
              <strong className="mt-0.5 block truncate text-base text-cocoa-800" title={stat.value}>{stat.value}</strong>
              <span className="mt-0.5 block truncate text-[10px] text-stone-400">{stat.note}</span>
            </span>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(10rem,0.7fr)_minmax(0,2fr)]">
        <nav aria-label="Product categories" className="rounded-xl border border-stone-200 bg-white p-2">
          <button type="button" onClick={() => setCategory("all")} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${category === "all" ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
            <Package size={16} aria-hidden="true" /> All products
          </button>
          <div className="flex gap-1 overflow-x-auto xl:block xl:space-y-1 xl:overflow-visible">
            {categories.map((item) => (
              <button key={item.slug} type="button" onClick={() => setCategory(item.slug)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs xl:w-full ${category === item.slug ? "bg-orange-50 font-semibold text-orange-700" : "text-stone-600 hover:bg-stone-50"}`}>
                <span aria-hidden="true">{item.name.slice(0, 1)}</span>
                <span className="max-w-40 truncate">{item.name}</span>
              </button>
            ))}
          </div>
        </nav>

        <section aria-label="Available products" className="min-w-0 rounded-xl border border-stone-200 bg-white p-3 sm:p-4">
          <form onSubmit={(event) => event.preventDefault()} role="search" className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search products or scan a barcode</span>
              <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products, barcode or item name"
                className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-lg border border-stone-200 px-2 text-stone-500"><X size={16} /></button>}
          </form>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
            {results.map((item) => (
              <article key={item.key} className="min-w-0 rounded-lg border border-stone-200 p-2">
                <Image src={item.image} alt="" width={120} height={100} className="h-24 w-full rounded-md bg-stone-100 object-contain" />
                <span className="mt-2 block truncate text-[11px] font-medium text-cocoa-800">{item.name}</span>
                {item.variantName && <span className="block truncate text-[10px] text-stone-500">{item.variantName}</span>}
                <span className="mt-1 block text-xs font-semibold text-cocoa-800">{naira(item.price)}</span>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.stock <= 3 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {item.stock <= 3 ? `Low stock · ${item.stock}` : "In stock"}
                </span>
              </article>
            ))}
            {results.length === 0 && (
              <p className="col-span-full rounded-lg bg-stone-50 p-6 text-center text-sm text-stone-500">
                {term ? `No in-stock products match “${query}”.` : "No in-stock products in this category."}
              </p>
            )}
          </div>
          {results.length > 0 && <p className="mt-3 text-center text-[10px] text-stone-400">Showing up to 24 available products · search by barcode or name</p>}
        </section>
      </div>

      <section aria-label="Quick actions" className="grid gap-2 sm:grid-cols-3">
        <Link href="/admin/pos" className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-orange-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600"><RotateCcw size={17} aria-hidden="true" /></span>
          <span><strong className="block text-xs text-cocoa-800">New sale</strong><span className="text-[10px] text-stone-500">Open the point of sale</span></span>
        </Link>
        <Link href="/admin/orders" className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 hover:border-orange-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600"><History size={17} aria-hidden="true" /></span>
          <span><strong className="block text-xs text-cocoa-800">View sales</strong><span className="text-[10px] text-stone-500">Review orders and transactions</span></span>
        </Link>
        <button type="button" onClick={() => searchRef.current?.focus()} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-orange-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-orange-600"><ScanBarcode size={17} aria-hidden="true" /></span>
          <span><strong className="block text-xs text-cocoa-800">Scan barcode</strong><span className="text-[10px] text-stone-500">Focus the product search</span></span>
        </button>
      </section>
    </div>
  );
}
