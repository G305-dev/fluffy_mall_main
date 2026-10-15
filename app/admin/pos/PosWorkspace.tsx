"use client";

import Image from "next/image";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { naira } from "@/lib/format";
import { hasVariants } from "@/lib/product-availability";
import type { Product } from "@/lib/types";

const PLACEHOLDER = "/images/product-placeholder.svg";

type SellableItem = {
  key: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  barcode?: string;
  itemCode?: string;
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
        itemCode: variant.traceposItemCode,
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
      itemCode: product.traceposItemCode,
      stock: product.stock,
      price: product.price,
      image: product.images?.[0] || PLACEHOLDER,
      unit,
    }];
  });
}

export default function PosWorkspace({ products }: { products: Product[] }) {
  const router = useRouter();
  const items = useMemo(() => sellableItems(products), [products]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [confirmedReceived, setConfirmedReceived] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ id: string; total: number } | null>(null);

  const term = query.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    return items
      .filter((item) => item.stock > 0 && [
        item.name,
        item.variantName,
        item.barcode,
        item.itemCode,
      ].some((value) => value?.toLocaleLowerCase().includes(term)))
      .slice(0, 12);
  }, [items, term]);
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
      item.stock > 0 && [item.barcode, item.itemCode]
        .some((code) => code?.trim().toLocaleLowerCase() === term)
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
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The sale could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-orange-600">In-store checkout</p>
          <h1 className="mt-1 font-display text-2xl text-cocoa-800 sm:text-3xl">Point of sale</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sell from the website catalog. Completed sales update the same product stock.
          </p>
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

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.9fr)]">
        <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
          <h2 className="font-display text-lg text-cocoa-800">Find products</h2>
          <form onSubmit={searchSubmit} role="search" className="mt-3 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search products, scan a barcode, or enter an item code</span>
              <Search aria-hidden="true" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, scan barcode, or item code"
                className="w-full rounded-xl border border-stone-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <button type="submit" className="rounded-xl bg-cocoa-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cocoa-700">
              Find
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {!term ? (
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                Scan a product barcode or search by its name, barcode, or item code.
              </p>
            ) : results.length === 0 ? (
              <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
                No in-stock products match “{query}”.
              </p>
            ) : results.map((item) => {
              const inCart = cart.find((line) => line.item.key === item.key)?.qty || 0;
              return (
                <div key={item.key} className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-100 p-3">
                  <Image src={item.image} alt="" width={52} height={52} className="h-12 w-12 shrink-0 rounded-lg bg-stone-100 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-cocoa-800">{item.name}</p>
                    {item.variantName && <p className="truncate text-xs text-stone-500">{item.variantName}</p>}
                    <p className="mt-1 text-xs text-stone-500">
                      {naira(item.price)} · {item.stock.toLocaleString("en-NG")} {item.unit} in stock
                      {item.itemCode ? ` · ${item.itemCode}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    disabled={inCart >= item.stock}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={15} aria-hidden="true" /> Add
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
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
