"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { naira } from "@/lib/format";
import type { Product } from "@/lib/types";

const PLACEHOLDER = "/images/product-placeholder.svg";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-stone-50 p-3">
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-cocoa-800">{children}</dd>
    </div>
  );
}

function Barcode({ value }: { value?: string }) {
  return value ? (
    <a
      href={`/api/admin/barcode?value=${encodeURIComponent(value)}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Open printable Code 128 label"
      className="break-all text-orange-700 hover:underline"
    >
      {value}
    </a>
  ) : <>Not set</>;
}

export default function ProductDetailsDialog({
  product,
  categoryLabel,
  purchaseCost,
  savedMainImage,
  onClose,
}: {
  product: Product;
  categoryLabel: string;
  purchaseCost?: number;
  savedMainImage?: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const options = product.variants || [];
  const mainImage = savedMainImage || product.images?.[0] || PLACEHOLDER;
  const images = [
    mainImage,
    ...(product.images || []).filter((image) => image && image !== mainImage && image !== PLACEHOLDER),
  ];
  const visiblePhoto = images[Math.min(activePhoto, images.length - 1)];
  const variable = product.productType === "variable" || options.length > 0;
  const stock = options.length
    ? options.reduce((sum, option) => sum + option.stock, 0)
    : product.stock;
  const prices = options.map((option) => option.price);
  const lowPrice = prices.length ? Math.min(...prices) : product.price;
  const highPrice = prices.length ? Math.max(...prices) : product.price;
  const priceLabel = lowPrice === highPrice
    ? naira(lowPrice)
    : `${naira(lowPrice)} – ${naira(highPrice)}`;
  const rawBrand = (product as Product & { brand?: unknown }).brand;
  const brand = typeof rawBrand === "string" && rawBrand.trim()
    ? rawBrand.trim() : "Not set";
  const unit = product.unit || "pcs";

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="product-details-heading"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border-0 bg-white p-0 text-stone-700 shadow-2xl backdrop:bg-stone-950/60"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-100 bg-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Product details</p>
          <h2 id="product-details-heading" className="mt-1 break-words font-display text-xl text-cocoa-800 sm:text-2xl">
            {product.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close product details"
          className="shrink-0 rounded-lg p-2 text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <X size={20} />
        </button>
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <div>
            <Image
              src={visiblePhoto}
              alt={`${product.name} photo ${Math.min(activePhoto, images.length - 1) + 1}`}
              width={400}
              height={400}
              className="aspect-square w-full rounded-xl bg-stone-100 object-cover"
            />
            {images.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-2" aria-label="Product photos">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActivePhoto(index)}
                    aria-label={`Show product photo ${index + 1}`}
                    aria-pressed={activePhoto === index}
                    className={`rounded-lg p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activePhoto === index ? "ring-2 ring-orange-500" : "ring-1 ring-stone-200"}`}
                  >
                    <Image src={image} alt="" width={56} height={56} className="h-14 w-14 rounded-md object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-orange-50 px-2.5 py-1 capitalize text-orange-800">
                {variable ? "Variable" : "Standard"} product
              </span>
              {product.featured && <span className="rounded-full bg-stone-100 px-2.5 py-1">Featured</span>}
              {product.bestseller && <span className="rounded-full bg-stone-100 px-2.5 py-1">Bestseller</span>}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <Detail label="Category">{categoryLabel}</Detail>
              <Detail label="Brand">{brand}</Detail>
              <Detail label={options.length ? "Option price range" : "Selling price"}>{priceLabel}</Detail>
              <Detail label="Purchase cost (private)">{purchaseCost === undefined ? "Not set" : naira(purchaseCost)}</Detail>
              {options.length > 0 && <Detail label="Parent default price">{naira(product.price)}</Detail>}
              {product.compareAt !== undefined && <Detail label="Compare-at price">{naira(product.compareAt)}</Detail>}
              <Detail label={options.length ? "Total option stock" : "Stock"}>
                {stock.toLocaleString("en-NG")} {unit}
              </Detail>
              <Detail label="Code 128 barcode"><Barcode value={product.barcode} /></Detail>
              <Detail label="Product ID"><span className="break-all font-mono text-xs">{product.id}</span></Detail>
            </dl>
          </div>
        </div>

        <section>
          <h3 className="font-semibold text-cocoa-800">Short description</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{product.short || "Not set"}</p>
        </section>
        <section>
          <h3 className="font-semibold text-cocoa-800">Description</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{product.description || "Not set"}</p>
        </section>
        <section>
          <h3 className="font-semibold text-cocoa-800">Delivery note</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{product.deliveryNote || "Not set"}</p>
        </section>

        {options.length > 0 && (
          <section>
            <h3 className="font-semibold text-cocoa-800">Variant options ({options.length})</h3>
            <div className="mt-3 space-y-3">
              {options.map((option) => (
                <div key={option.id} className="flex min-w-0 gap-3 rounded-xl border border-stone-200 p-3">
                  <Image
                    src={option.image && option.image !== PLACEHOLDER ? option.image : mainImage}
                    alt={`${product.name} – ${option.name}`}
                    width={72}
                    height={72}
                    className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 object-cover sm:h-[72px] sm:w-[72px]"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words font-semibold text-cocoa-800">{option.name}</h4>
                    {(option.size || option.color) && (
                      <p className="mt-1 text-xs text-stone-500">
                        {[option.size && `Size: ${option.size}`, option.color && `Colour: ${option.color}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div><dt className="inline text-stone-500">Price: </dt><dd className="inline font-semibold">{naira(option.price)}</dd></div>
                      <div><dt className="inline text-stone-500">Stock: </dt><dd className="inline font-semibold">{option.stock.toLocaleString("en-NG")} {unit}</dd></div>
                      <div className="min-w-0 break-all"><dt className="inline text-stone-500">Code 128: </dt><dd className="inline font-mono"><Barcode value={option.barcode} /></dd></div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap gap-2 border-t border-stone-100 bg-white px-5 py-4 sm:px-6">
        <Link
          href={`/admin/products/${encodeURIComponent(product.id)}/edit`}
          className="rounded-xl bg-[#ff8200] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e87700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          Edit product
        </Link>
        <Link
          href={`/product/${encodeURIComponent(product.slug)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          Open storefront
        </Link>
        <button type="button" onClick={close} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          Close
        </button>
      </footer>
    </dialog>
  );
}