"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, ProductVariant } from "@/lib/types";
import { naira, waLink } from "@/lib/format";
import { hasVariants, isOutOfStock, startingPrice } from "@/lib/product-availability";
import { useCart } from "@/components/CartProvider";
import { PRIMARY_WA, productWhatsAppText } from "@/lib/whatsapp";
import { categoryName } from "@/lib/categories";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";

type ProductSlide = {
  id: string;
  image: string;
  variant?: ProductVariant;
};

export default function ProductView({ product }: { product: Product }) {
  const { add, items } = useCart();
  const [slideIndex, setSlideIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const slides = useMemo<ProductSlide[]>(() => {
    const mainImage = product.images[0];
    return [
      ...product.images.map((image, index) => ({ id: `product-image-${index}`, image })),
      ...product.variants.map((variant) => ({
        id: `variant-image-${variant.id}`,
        image: variant.image || mainImage,
        variant,
      })),
    ];
  }, [product.images, product.variants]);

  useEffect(() => {
    setSlideIndex(0);
    setQty(1);
    setAdded(false);
  }, [product.id]);

  const safeSlideIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const activeSlide = slides[safeSlideIndex];
  const activeVariant = activeSlide?.variant;
  const activeImage = activeSlide?.image || product.images[0];
  const variable = hasVariants(product);
  const allOutOfStock = isOutOfStock(product);
  const selectedOutOfStock = Boolean(activeVariant && activeVariant.stock <= 0);
  const stock = activeVariant?.stock ?? (variable ? 0 : product.stock);
  const price = activeVariant ? activeVariant.price : startingPrice(product);
  const inCart = items
    .filter((item) => item.productId === product.id && item.variantId === activeVariant?.id)
    .reduce((total, item) => total + item.qty, 0);
  const remaining = Math.max(0, stock - inCart);
  const needsOption = variable && !activeVariant;
  const canAdd = !needsOption && stock > 0 && remaining >= qty;
  const availabilityQuestion = `Hello Fluffy'n'Yummy Mall! Is ${product.name}${
    activeVariant ? ` (${activeVariant.name})` : ""
  } available?\n\nFrom fluffynyummystore.com`;
  const wa = waLink(
    PRIMARY_WA,
    allOutOfStock || selectedOutOfStock || needsOption
      ? availabilityQuestion
      : productWhatsAppText(product.name, price, activeVariant?.name)
  );

  if (!activeSlide) return null;

  function moveToSlide(index: number) {
    setSlideIndex(index);
    setQty(1);
    setAdded(false);
  }

  function addToCart() {
    if (!canAdd) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: activeImage,
      variantId: activeVariant?.id,
      variantName: activeVariant?.name,
      unitPrice: price,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:grid-cols-2 lg:gap-10 lg:px-8">
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-3xl bg-cream-100 sm:rounded-[2rem]">
        <Image
          src={activeImage}
          alt={activeVariant ? `${product.name} - ${activeVariant.name}` : product.name}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />

        {slides.length > 1 && (
          <>
            <span className="absolute left-4 top-4 rounded-full bg-cocoa-800/85 px-3 py-1.5 text-xs font-semibold text-white">
              {safeSlideIndex + 1} of {slides.length}
            </span>
            <button
              type="button"
              onClick={() => moveToSlide(safeSlideIndex <= 0 ? slides.length - 1 : safeSlideIndex - 1)}
              aria-label="Previous product option"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-md transition hover:bg-white"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => moveToSlide(safeSlideIndex >= slides.length - 1 ? 0 : safeSlideIndex + 1)}
              aria-label="Next product option"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-md transition hover:bg-white"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      <div className="min-w-0">
        <Link
          href={`/shop/${product.category}`}
          className="text-xs uppercase tracking-[0.16em] text-gold-600 sm:tracking-[0.2em]"
        >
          {categoryName(product.category)}
        </Link>
        <h1 className="mt-2 break-words font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">
          {product.name}
        </h1>
        <div className="mt-4 flex items-baseline gap-3">
          <p className="text-2xl font-semibold text-cocoa-800">
            {variable && !activeVariant ? `From ${naira(price)}` : naira(price)}
          </p>
          {product.compareAt && (
            <p className="text-stone-400 line-through">{naira(product.compareAt)}</p>
          )}
        </div>

        {activeVariant && (activeVariant.size || activeVariant.color) && (
          <p className="mt-2 text-sm text-cocoa-700">
            {activeVariant.size && <span>Size: {activeVariant.size}</span>}
            {activeVariant.size && activeVariant.color && <span> · </span>}
            {activeVariant.color && <span>Color: {activeVariant.color}</span>}
          </p>
        )}

        {product.description && (
          <p className="mt-4 leading-relaxed text-cocoa-700/80">{product.description}</p>
        )}
        {!variable && allOutOfStock && (
          <p role="status" className="mt-4 font-medium text-cocoa-800">Currently out of stock.</p>
        )}

        {variable && (
          <div className="mt-6">
            <p className="text-sm font-medium">Choose an option</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((variantOption, index) => {
                const optionLabel = [
                  variantOption.size ? `Size: ${variantOption.size}` : "",
                  variantOption.color ? `Color: ${variantOption.color}` : "",
                ].filter(Boolean).join(" · ") || variantOption.name;
                const isSelected = safeSlideIndex === product.images.length + index;
                const soldOut = variantOption.stock <= 0;

                return (
                  <button
                    key={variantOption.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => moveToSlide(product.images.length + index)}
                    className={`rounded-full px-4 py-2 text-left text-sm ring-1 ${
                      isSelected
                        ? soldOut
                          ? "bg-stone-200 text-stone-800 ring-stone-500"
                          : "bg-cocoa-800 text-cream-50 ring-cocoa-800"
                        : soldOut
                          ? "bg-stone-100 text-stone-600 ring-stone-300 hover:bg-stone-200"
                          : "bg-white ring-cream-300 hover:ring-cocoa-600"
                    }`}
                  >
                    <span className="block">{optionLabel}</span>
                    <span className="block text-xs opacity-80">
                      {naira(variantOption.price)} · {soldOut ? "Out of stock" : `${variantOption.stock} available`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p role="status" aria-live="polite" className={`mt-3 text-sm font-medium ${allOutOfStock || selectedOutOfStock ? "text-red-700" : "text-cocoa-700"}`}>
              {allOutOfStock
                ? "Out of stock — all options are unavailable."
                : selectedOutOfStock
                  ? `${activeVariant?.name} is out of stock. Choose another option.`
                  : activeVariant
                    ? `${activeVariant.name}: ${activeVariant.stock} available.`
                    : "Select an option to check availability."}
            </p>
          </div>
        )}

        <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm leading-relaxed text-cocoa-700">
          {product.deliveryNote}
        </p>

        <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:flex-wrap">
          <div className="flex items-center rounded-full ring-1 ring-cream-300">
            <button
              type="button"
              className="p-3 disabled:opacity-40"
              disabled={qty <= 1}
              onClick={() => setQty((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center">{qty}</span>
            <button
              type="button"
              className="p-3 disabled:opacity-40"
              disabled={needsOption || remaining <= qty}
              onClick={() => setQty((current) => Math.min(remaining, current + 1))}
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!canAdd}
            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-terracotta-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:px-6"
          >
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
            {added ? "Added to cart" : allOutOfStock || selectedOutOfStock ? "Out of stock" : needsOption ? "Choose an option" : remaining < qty ? "Stock limit reached" : "Add to cart"}
          </button>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white sm:col-auto sm:px-6"
          >
            <MessageCircle size={16} />
            {allOutOfStock || selectedOutOfStock || needsOption ? "Ask about availability" : "Order via WhatsApp"}
          </a>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-cocoa-700/70">
          Sign in is required before checkout. Pay with Paystack or order via WhatsApp.
        </p>
      </div>
    </div>
  );
}