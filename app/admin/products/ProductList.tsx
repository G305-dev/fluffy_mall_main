"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Minus, Plus, Search, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-categories";
import { categoryName } from "@/lib/categories";
import { naira } from "@/lib/format";
import type { Product } from "@/lib/types";
import ProductPhotoForm from "./ProductPhotoForm";
import ProductDetailsDialog from "./ProductDetailsDialog";

const PAGE_SIZE = 50;
const PLACEHOLDER = "/images/product-placeholder.svg";
type ProductTab = "all" | "standard" | "variable";
type OpenRow = { id: string; mode: "options" | "photo" } | null;

function kind(product: Product): "standard" | "variable" {
  return product.productType === "variable" || (product.variants?.length || 0) > 0
    ? "variable" : "standard";
}

function stockOf(product: Product) {
  return product.variants?.length
    ? product.variants.reduce((total, option) => total + option.stock, 0)
    : product.stock;
}

function priceOf(product: Product) {
  if (!product.variants?.length) return naira(product.price);
  const prices = product.variants.map((option) => option.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? naira(low) : `${naira(low)} – ${naira(high)}`;
}

function brandOf(product: Product) {
  // Older products may carry a brand, but the current product form has no brand field.
  const brand = (product as Product & { brand?: unknown }).brand;
  return typeof brand === "string" && brand.trim() ? brand.trim() : "—";
}

function isRealPhoto(image: string | undefined) {
  return Boolean(image && image !== PLACEHOLDER);
}

export default function ProductList({
  products,
  categories,
  costs,
}: {
  products: Product[];
  categories: AdminCategory[];
  costs: Record<string, number>;
}) {
  const router = useRouter();
  const tableScroll = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<ProductTab>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [photoFilter, setPhotoFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState<OpenRow>(null);
  const [viewedProductId, setViewedProductId] = useState<string | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [scrollMax, setScrollMax] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const counts = useMemo(() => ({
    all: products.length,
    standard: products.filter((item) => kind(item) === "standard").length,
    variable: products.filter((item) => kind(item) === "variable").length,
  }), [products]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const image = savedPhotos[product.id] || product.images?.[0];
      const available = stockOf(product) > 0;
      const searchText = [
        product.name, product.traceposItemCode, product.barcode, brandOf(product),
        ...((product.variants || []).flatMap((option) => [option.name, option.traceposItemCode, option.barcode])),
      ].join(" ").toLowerCase();
      return (tab === "all" || kind(product) === tab) &&
        (!term || searchText.includes(term)) &&
        (!category || product.category === category) &&
        (photoFilter === "all" || (photoFilter === "with" ? isRealPhoto(image) : !isRealPhoto(image))) &&
        (stockFilter === "all" || (stockFilter === "in" ? available : !available));
    });
  }, [products, tab, query, category, photoFilter, stockFilter, savedPhotos]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(firstIndex, firstIndex + PAGE_SIZE);
  const names = new Map(categories.map((item) => [item.slug, item.name]));
  const viewedProduct = products.find((item) => item.id === viewedProductId);

  useEffect(() => {
    const element = tableScroll.current;
    if (!element) return;
    const measure = () => {
      setScrollMax(Math.max(0, Math.ceil(element.scrollWidth - element.clientWidth)));
      setScrollLeft(Math.round(element.scrollLeft));
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [visible.length, openRow, tab]);

  function changeFilter(action: () => void) {
    action();
    setPage(1);
    setOpenRow(null);
  }

  function changePage(next: number) {
    setPage(next);
    setOpenRow(null);
    if (tableScroll.current) tableScroll.current.scrollTop = 0;
  }

  function toggleRow(id: string, mode: "options" | "photo") {
    setNotice("");
    setOpenRow((current) => current?.id === id && current.mode === mode ? null : { id, mode });
  }

  function moveTable(amount: number) {
    tableScroll.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  function savedPhoto(product: Product, path: string) {
    setSavedPhotos((previous) => ({ ...previous, [product.id]: path }));
    setOpenRow(null);
    setNotice(`Image saved for ${product.name}. It will also appear in the shop.`);
    router.refresh();
  }

  return (
    <section aria-label="Product catalogue" className="min-w-0">
      <div aria-label="Product type filters" className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-stone-100 bg-white p-2">
        {(["all", "standard", "variable"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={tab === item}
            onClick={() => changeFilter(() => setTab(item))}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              tab === item ? "bg-orange-100 text-orange-800" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {item === "all" ? "All products" : item === "standard" ? "Standard products" : "Variable products"}
            <span className="ml-2 text-xs opacity-70">{counts[item]}</span>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-stone-100 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(9rem,auto))]">
        <label className="relative block text-xs font-medium text-stone-600">
          Search products
          <Search size={16} aria-hidden="true" className="absolute bottom-3 left-3 text-stone-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => changeFilter(() => setQuery(event.target.value))}
            placeholder="Name, item code or Code 128 barcode"
            className="mt-1 block w-full rounded-xl border border-stone-200 bg-[#fafafa] py-2.5 pl-9 pr-9 text-sm outline-none focus:border-orange-500"
          />
          {query && (
            <button type="button" onClick={() => changeFilter(() => setQuery(""))} aria-label="Clear search" className="absolute bottom-2 right-2 rounded-lg p-1 text-stone-500 hover:text-cocoa-800">
              <X size={16} />
            </button>
          )}
        </label>
        <label className="text-xs font-medium text-stone-600">Category
          <select value={category} onChange={(event) => changeFilter(() => setCategory(event.target.value))} className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm">
            <option value="">All categories</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-stone-600">Images
          <select value={photoFilter} onChange={(event) => changeFilter(() => setPhotoFilter(event.target.value))} className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">All images</option>
            <option value="with">Image saved</option>
            <option value="without">Needs an image</option>
          </select>
        </label>
        <label className="text-xs font-medium text-stone-600">Stock
          <select value={stockFilter} onChange={(event) => changeFilter(() => setStockFilter(event.target.value))} className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm">
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>
      </div>

      <p className="mb-2 text-xs text-stone-600">
        Click a photo or use Photo to upload and save it. Drag the slider below to see the remaining table columns.
        Purchase costs are private to admin.
      </p>
      {notice && <p role="status" className="mb-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-800">{notice}</p>}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div
          ref={tableScroll}
          onScroll={(event) => setScrollLeft(Math.round(event.currentTarget.scrollLeft))}
          className="max-h-[42rem] overflow-auto overscroll-contain"
          aria-label="Scroll product table horizontally or vertically"
        >
          <table id="product-catalogue-table" className="w-full min-w-[1930px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-stone-200 bg-[#fafafa] text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th scope="col" className="w-[345px] px-4 py-3">Photo / product</th>
                <th scope="col" className="w-[170px] px-3 py-3">Item code (TracePOS)</th>
                <th scope="col" className="w-[190px] px-3 py-3">Code 128 barcode</th>
                <th scope="col" className="w-[135px] px-3 py-3">Type</th>
                <th scope="col" className="w-[185px] px-3 py-3">Category</th>
                <th scope="col" className="w-[130px] px-3 py-3">Brand</th>
                <th scope="col" className="w-[200px] px-3 py-3">Selling price</th>
                <th scope="col" className="w-[170px] px-3 py-3">Cost price</th>
                <th scope="col" className="w-[145px] px-3 py-3">Current stock</th>
                <th scope="col" className="w-[220px] px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((product) => {
                const variants = product.variants || [];
                const image = savedPhotos[product.id] || product.images?.[0] || PLACEHOLDER;
                const photoPresent = isRealPhoto(image);
                const stock = stockOf(product);
                const cost = costs[product.id];
                const expanded = openRow?.id === product.id ? openRow.mode : null;
                return (
                  <Fragment key={product.id}>
                    <tr className="align-top hover:bg-orange-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          {variants.length > 0 && (
                            <button type="button" onClick={() => toggleRow(product.id, "options")} aria-expanded={expanded === "options"} aria-label={`${expanded === "options" ? "Hide" : "Show"} options for ${product.name}`} className="mt-4 shrink-0 rounded-lg border border-stone-200 p-1 text-stone-600 hover:border-orange-300">
                              {expanded === "options" ? <Minus size={13} /> : <Plus size={13} />}
                            </button>
                          )}
                          <button type="button" onClick={() => toggleRow(product.id, "photo")} aria-label={`${photoPresent ? "Change" : "Add"} photo for ${product.name}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100 ring-1 ring-stone-200 focus-visible:ring-2 focus-visible:ring-orange-500">
                            {photoPresent ? <Image src={image} alt="" width={56} height={56} className="h-14 w-14 object-cover" /> : <Camera size={21} aria-hidden="true" className="m-auto h-14 text-stone-400" />}
                          </button>
                          <div className="min-w-0">
                            <p title={product.name} className="line-clamp-2 font-semibold leading-snug text-cocoa-800">{product.name}</p>
                            {variants.length > 0 && (
                              <button type="button" onClick={() => toggleRow(product.id, "options")} className="mt-1 block text-xs font-medium text-orange-700 hover:underline">{variants.length} options · view breakdown</button>
                            )}
                            {!photoPresent && <button type="button" onClick={() => toggleRow(product.id, "photo")} className="mt-1 block text-xs text-orange-700 hover:underline">Add photo</button>}
                          </div>
                        </div>
                      </td>
                      <td className="break-all px-3 py-4 font-mono text-xs text-cocoa-800">
                        {product.traceposItemCode || <span className="text-stone-400">Not set</span>}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs">
                        {product.barcode ? (
                          <a href={`/api/admin/barcode?value=${encodeURIComponent(product.barcode)}`} target="_blank" rel="noopener noreferrer" title="Open printable Code 128 label" className="inline-block max-w-full break-all rounded-lg bg-stone-100 px-2 py-1.5 text-cocoa-800 hover:bg-orange-100">{product.barcode}</a>
                        ) : <span className="text-stone-400">Not set</span>}
                      </td>
                      <td className="px-3 py-4"><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold capitalize text-orange-800">{kind(product)}</span></td>
                      <td className="break-words px-3 py-4 text-stone-700">{names.get(product.category) || categoryName(product.category)}</td>
                      <td className="break-words px-3 py-4 text-stone-600">{brandOf(product)}</td>
                      <td className="px-3 py-4 font-semibold text-cocoa-800">{priceOf(product)}</td>
                      <td className="px-3 py-4 text-stone-600">{cost === undefined ? "—" : naira(cost)}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-cocoa-800">
                          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${stock <= 0 ? "bg-red-500" : stock <= 5 ? "bg-orange-500" : "bg-green-500"}`} />
                          {stock.toLocaleString("en-NG")} {product.unit || "pcs"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setViewedProductId(product.id)} aria-haspopup="dialog" aria-label={`View details for ${product.name}`} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">View</button>
                          <Link href={`/admin/products/${encodeURIComponent(product.id)}/edit`} className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">Edit</Link>
                          <button type="button" onClick={() => toggleRow(product.id, "photo")} aria-expanded={expanded === "photo"} className="rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50">Photo</button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-orange-50/40">
                        <td colSpan={10} className="px-4 py-4">
                          {expanded === "photo" ? (
                            <ProductPhotoForm product={product} currentImage={image} onSaved={(path) => savedPhoto(product, path)} onCancel={() => setOpenRow(null)} />
                          ) : (
                            <div className="flex flex-wrap gap-3" aria-label={`Options for ${product.name}`}>
                              {variants.map((option) => (
                                <div key={option.id} className="min-w-[240px] rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
                                  <p className="font-semibold text-cocoa-800">{option.name}</p>
                                  <p className="mt-1">{naira(option.price)} · {option.stock} {product.unit || "pcs"}</p>
                                  {option.traceposItemCode && <p className="mt-1 font-mono">Item code: {option.traceposItemCode}</p>}
                                  {option.barcode && <a href={`/api/admin/barcode?value=${encodeURIComponent(option.barcode)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-mono text-orange-700 hover:underline">Code 128: {option.barcode}</a>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!visible.length && <p className="px-5 py-10 text-center text-sm text-stone-500">No products match those filters.</p>}
        </div>

        <div className="flex items-center gap-3 border-t border-stone-100 px-4 py-3">
          <span className="hidden whitespace-nowrap text-xs text-stone-500 sm:block">Scroll table left / right</span>
          <button type="button" onClick={() => moveTable(-320)} disabled={scrollMax === 0 || scrollLeft <= 0} aria-label="Scroll table left" className="rounded-lg border border-stone-200 p-1.5 text-stone-600 disabled:opacity-40"><ChevronLeft size={17} /></button>
          <input
            type="range" min={0} max={Math.max(1, scrollMax)} step={1}
            value={Math.min(scrollLeft, Math.max(1, scrollMax))}
            disabled={scrollMax === 0}
            onChange={(event) => { if (tableScroll.current) tableScroll.current.scrollLeft = Number(event.target.value); }}
            aria-label="Slide to see more product table columns"
            className="min-w-0 flex-1 cursor-ew-resize accent-[#ff8200] disabled:cursor-default disabled:opacity-40"
          />
          <button type="button" onClick={() => moveTable(320)} disabled={scrollMax === 0 || scrollLeft >= scrollMax} aria-label="Scroll table right" className="rounded-lg border border-stone-200 p-1.5 text-stone-600 disabled:opacity-40"><ChevronRight size={17} /></button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-4 text-sm">
          <span className="text-stone-600">Showing {filtered.length ? firstIndex + 1 : 0}–{Math.min(firstIndex + PAGE_SIZE, filtered.length)} of {filtered.length} products · 50 per page</span>
          <nav aria-label="Product pages" className="flex items-center gap-1.5">
            <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage <= 1} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
            <span className="px-2 text-xs text-stone-600">Page {currentPage} of {pageCount}</span>
            <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= pageCount} className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
          </nav>
        </div>
      </div>
      {viewedProduct && (
        <ProductDetailsDialog
          key={viewedProduct.id}
          product={viewedProduct}
          categoryLabel={names.get(viewedProduct.category) || categoryName(viewedProduct.category)}
          purchaseCost={costs[viewedProduct.id]}
          savedMainImage={savedPhotos[viewedProduct.id]}
          onClose={() => setViewedProductId(null)}
        />
      )}
    </section>
  );
}
