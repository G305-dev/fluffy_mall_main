"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Minus,
  Package,
  Plus,
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { naira } from "@/lib/format";
import { hasVariants } from "@/lib/product-availability";
import type { Product } from "@/lib/types";
import { categoryName } from "@/lib/categories";

const PLACEHOLDER = "/images/product-placeholder.svg";

type SellableItem = {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  barcode?: string;
  category: string;
  stock: number;
  price: number;
  image: string;
  unit: string;
};

type CartLine = {
  item: SellableItem;
  qty: number;
};

function sellableItems(products: Product[]): SellableItem[] {
  return products.flatMap((product) => {
    const unit = product.unit || "pcs";
    if (hasVariants(product)) {
      return (product.variants || []).map((variant) => ({
        key: `${product.id}:${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        barcode: variant.barcode,
        category: product.category,
        stock: variant.stock,
        price: variant.price,
        image: variant.image || product.images?.[0] || PLACEHOLDER,
        unit,
      }));
    }
    return [{
      key: product.id,
      productId: product.id,
      name: product.name,
      barcode: product.barcode,
      category: product.category,
      stock: product.stock,
      price: product.price,
      image: product.images?.[0] || PLACEHOLDER,
      unit,
    }];
  });
}

export default function PosWorkspace({
  products,
  staffName,
  greeting,
}: {
  products: Product[];
  staffName: string;
  greeting: string;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => sellableItems(products), [products]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [confirmedReceived, setConfirmedReceived] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; total: number } | null>(null);

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
  const subtotal = cart.reduce((sum, line) => sum + line.item.price * line.qty, 0);
  const availableCount = items.filter((item) => item.stock > 0).length;

  function addToCart(item: SellableItem) {
    setError("");
    setReceipt(null);
    setCart((current) => {
      const existing = current.find((line) => line.item.key === item.key);
      if (!existing) return [...current, { item, qty: 1 }];
      if (existing.qty >= item.stock) return current;
      return current.map((line) => line.item.key === item.key
        ? { ...line, item, qty: line.qty + 1 }
        : line);
    });
  }

  function searchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exactMatches = items.filter((item) =>
      item.stock > 0 && item.barcode?.trim().toLocaleLowerCase() === term
    );
    if (exactMatches.length === 1) {
      addToCart(exactMatches[0]);
      setQuery("");
    }
  }

  function changeQuantity(key: string, amount: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.item.key !== key) return [line];
      const qty = line.qty + amount;
      return qty <= 0 ? [] : [{ ...line, qty: Math.min(qty, line.item.stock) }];
    }));
  }

  async function completeSale() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(({ item, qty }) => ({
            productId: item.productId,
            variantId: item.variantId,
            qty,
          })),
          customerName,
          customerPhone,
          paymentReference,
          confirmedReceived,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("order" in data)) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "The sale could not be completed. Please try again.";
        throw new Error(message);
      }

      const order = data.order;
      if (!order || typeof order !== "object" || !("id" in order) || !("total" in order)) {
        throw new Error("The server returned an invalid sale confirmation.");
      }
      setReceipt({ id: String(order.id), total: Number(order.total) });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentReference("");
      setConfirmedReceived(false);
      setQuery("");
      setCategory("all");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The sale could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cocoa-800">{greeting}, {staffName}</p>
          <h1 className="mt-1 font-display text-2xl text-cocoa-800 sm:text-3xl">Point of sale</h1>
          <p className="mt-1 text-sm text-stone-500">Scan items or search for products to start a new sale.</p>
        </div>
        <p className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
          {availableCount.toLocaleString("en-NG")} sellable items
        </p>
      </header>

      {receipt && (
        <section role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <p className="font-semibold text-emerald-900">Sale completed</p>
            <p className="mt-1 text-sm text-emerald-800">
              {receipt.id} · {naira(receipt.total)}
            </p>
          </div>
          <a
            href={`/admin/orders/${encodeURIComponent(receipt.id)}`}
            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-white"
          >
            View order
          </a>
        </section>
      )}

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,0.85fr)]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="grid min-h-[26rem] lg:grid-cols-[minmax(10rem,0.7fr)_minmax(0,2fr)]">
            <nav aria-label="Product categories" className="border-b border-stone-100 p-2 lg:border-b-0 lg:border-r">
              <button type="button" onClick={() => setCategory("all")} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${category === "all" ? "bg-blue-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
                <Package size={16} aria-hidden="true" /> All products
              </button>
              <div className="flex gap-1 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
                {categories.map((item) => (
                  <button key={item.slug} type="button" onClick={() => setCategory(item.slug)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs lg:w-full ${category === item.slug ? "bg-blue-50 font-semibold text-blue-700" : "text-stone-600 hover:bg-stone-50"}`}>
                    <span aria-hidden="true">{categoryName(item.slug).slice(0, 1)}</span>
                    <span className="max-w-40 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-w-0 p-3 sm:p-4">
              <div className="flex flex-wrap gap-2">
                <form onSubmit={searchSubmit} role="search" className="flex min-w-[12rem] flex-1 gap-2">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Search products or scan a barcode</span>
                    <Search aria-hidden="true" size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      ref={searchRef}
                      autoFocus
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search products, barcode or item name"
                      className="w-full rounded-lg border border-stone-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-lg border border-stone-200 px-2 text-stone-500"><X size={16} /></button>}
                </form>
                <button type="button" onClick={() => searchRef.current?.focus()} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50">
                  <ScanBarcode size={16} aria-hidden="true" /> Scan barcode
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((item) => {
              const inCart = cart.find((line) => line.item.key === item.key)?.qty || 0;
              return (
                <button key={item.key} type="button" onClick={() => addToCart(item)} disabled={inCart >= item.stock} className="min-w-0 rounded-lg border border-stone-200 p-2 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/40 disabled:opacity-50">
                  <Image src={item.image} alt="" width={120} height={100} className="h-24 w-full rounded-md bg-stone-100 object-contain" />
                  <span className="mt-2 block truncate text-[11px] font-medium text-cocoa-800">{item.name}</span>
                  {item.variantName && <span className="block truncate text-[10px] text-stone-500">{item.variantName}</span>}
                  <span className="mt-1 block text-xs font-semibold text-cocoa-800">{naira(item.price)}</span>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${item.stock <= 3 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {item.stock <= 3 ? `Low stock · ${item.stock}` : "In stock"}
                  </span>
                  <span className="sr-only">{inCart >= item.stock ? "No more stock available" : "Add to current sale"}</span>
                </button>
              );
                })}
                {results.length === 0 && (
                  <p className="col-span-full rounded-lg bg-stone-50 p-6 text-center text-sm text-stone-500">
                    {term ? `No in-stock products match “${query}”.` : "No in-stock products in this category."}
                  </p>
                )}
              </div>
              {results.length > 0 && <p className="mt-3 text-center text-[10px] text-stone-400">Select a product to add it to the current sale · showing up to 24 products</p>}
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-orange-600" aria-hidden="true" />
            <h2 className="font-display text-lg text-cocoa-800">Current sale</h2>
            <span className="ml-auto rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
              {cart.reduce((sum, line) => sum + line.qty, 0)} units
            </span>
          </div>

          {cart.length === 0 ? (
            <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Add products to begin a sale.</p>
          ) : (
            <div className="mt-3 divide-y divide-stone-100">
              {cart.map(({ item, qty }) => (
                <div key={item.key} className="flex items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-cocoa-800">{item.name}</p>
                    {item.variantName && <p className="truncate text-xs text-stone-500">{item.variantName}</p>}
                    <p className="mt-1 text-xs text-stone-500">{naira(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => changeQuantity(item.key, -1)} aria-label={`Decrease ${item.name} quantity`} className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50">
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                    <button type="button" onClick={() => changeQuantity(item.key, 1)} disabled={qty >= item.stock} aria-label={`Increase ${item.name} quantity`} className="rounded-lg border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-40">
                      <Plus size={14} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => changeQuantity(item.key, -qty)} aria-label={`Remove ${item.name}`} className="ml-1 rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-700">
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-semibold text-cocoa-800">{naira(item.price * qty)}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-3 border-t border-stone-200 pt-4">
            <label className="block text-xs font-medium text-stone-600">
              Customer name <span className="font-normal text-stone-400">(optional)</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={100} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Walk-in customer" />
            </label>
            <label className="block text-xs font-medium text-stone-600">
              Phone <span className="font-normal text-stone-400">(optional)</span>
              <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={40} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Customer phone number" />
            </label>
            <label className="block text-xs font-medium text-stone-600">
              Bank transfer reference <span className="font-normal text-stone-400">(optional)</span>
              <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} maxLength={120} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Transfer reference" />
            </label>
            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
              <span className="font-semibold text-cocoa-800">Total</span>
              <span className="text-xl font-bold text-cocoa-800">{naira(subtotal)}</span>
            </div>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-stone-600">
              <input type="checkbox" checked={confirmedReceived} onChange={(event) => setConfirmedReceived(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600" />
              <span>I confirm the customer&apos;s bank transfer has been received.</span>
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={completeSale}
              disabled={!cart.length || !confirmedReceived || submitting}
              className="w-full rounded-xl bg-[#ff8200] px-4 py-3 text-sm font-bold text-white hover:bg-[#e87700] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Completing sale…" : "Confirm transfer & complete sale"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-stone-400">
              Stock changes only after the sale completes. Website visitors will then see the updated availability.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
