"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Product,
  ProductVariant,
} from "@/lib/types";
import { naira, waLink } from "@/lib/format";
import { useCart } from "@/components/CartProvider";
import {
  PRIMARY_WA,
  productWhatsAppText,
} from "@/lib/whatsapp";
import { categoryName } from "@/lib/categories";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import Image from "next/image";

type ProductSlide = {
  id: string;
  image: string;
  variant?: ProductVariant;
};

export default function ProductView({
  product,
}: {
  product: Product;
}) {
  const { add } = useCart();

  const [slideIndex, setSlideIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const slides = useMemo<ProductSlide[]>(() => {
    const mainImage = product.images[0];

    return [
      {
        id: "main-product",
        image: mainImage,
      },
      ...product.variants.map((variant) => ({
        id: variant.id,
        image: variant.image || mainImage,
        variant,
      })),
    ];
  }, [product.images, product.variants]);

  useEffect(() => {
    setSlideIndex(0);
  }, [product.id]);

  const safeSlideIndex = Math.min(
    slideIndex,
    Math.max(0, slides.length - 1)
  );

  const activeSlide = slides[safeSlideIndex];

const activeVariant = activeSlide?.variant;
const activeImage =
  activeSlide?.image || product.images[0];

const price = activeVariant
  ? activeVariant.price
  : product.price;

const stock = activeVariant
  ? activeVariant.stock
  : product.stock;

const wa = waLink(
  PRIMARY_WA,
  productWhatsAppText(
    product.name,
    price,
    activeVariant?.name
  )
);

if (!activeSlide) {
  return null;
}

  function movePrevious() {
    setSlideIndex((current) =>
      current <= 0 ? slides.length - 1 : current - 1
    );
  }

  function moveNext() {
    setSlideIndex((current) =>
      current >= slides.length - 1 ? 0 : current + 1
    );
  }

  function selectVariant(index: number) {
    setSlideIndex(index + 1);
  }

  function addToCart() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: activeImage,
        variantId: activeVariant?.id,
        variantName: activeVariant?.name,
        unitPrice: price,
      },
      qty
    );

    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 md:grid-cols-2 lg:gap-10 lg:px-8">
      <div className="relative aspect-square min-w-0 overflow-hidden rounded-3xl bg-cream-100 sm:rounded-[2rem]">
        <Image
          src={activeImage}
          alt={
            activeVariant
              ? `${product.name} - ${activeVariant.name}`
              : product.name
          }
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
              onClick={movePrevious}
              aria-label="Previous product option"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-md transition hover:bg-white"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={moveNext}
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
            {naira(price)}
          </p>

          {product.compareAt && (
            <p className="text-stone-400 line-through">
              {naira(product.compareAt)}
            </p>
          )}
        </div>

        {activeVariant && (
          <p className="mt-2 text-sm text-cocoa-700">
            {activeVariant.size && (
              <span>Size: {activeVariant.size}</span>
            )}

            {activeVariant.size && activeVariant.color && (
              <span> · </span>
            )}

            {activeVariant.color && (
              <span>Color: {activeVariant.color}</span>
            )}
          </p>
        )}

        {(product.description || stock <= 0) && (
          <p className="mt-4 leading-relaxed text-cocoa-700/80">
            {product.description}

            {stock <= 0 && (
              <span className="block font-medium text-cocoa-800">
                Currently out of stock.
              </span>
            )}
          </p>
        )}

        {product.variants.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium">
              Choose size and color
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map(
                (variantOption, index) => {
                  const optionLabel =
                    [
                      variantOption.size
                        ? `Size: ${variantOption.size}`
                        : "",
                      variantOption.color
                        ? `Color: ${variantOption.color}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                    variantOption.name;

                  const isSelected =
                    safeSlideIndex === index + 1;

                  return (
                    <button
                      key={variantOption.id}
                      type="button"
                      disabled={variantOption.stock <= 0}
                      onClick={() =>
                        selectVariant(index)
                      }
                      className={`rounded-full px-4 py-2 text-left text-sm ring-1 ${
                        isSelected
                          ? "bg-cocoa-800 text-cream-50 ring-cocoa-800"
                          : variantOption.stock <= 0
                          ? "cursor-not-allowed bg-stone-100 text-stone-400 ring-stone-200"
                          : "bg-white ring-cream-300"
                      }`}
                    >
                      <span className="block">
                        {optionLabel}
                      </span>

                      <span className="block text-xs opacity-80">
                        {naira(variantOption.price)} ·{" "}
                        {variantOption.stock > 0
                          ? `${variantOption.stock} available`
                          : "Out of stock"}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm leading-relaxed text-cocoa-700">
          {product.deliveryNote}
        </p>

        <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:flex-wrap">
          <div className="flex items-center rounded-full ring-1 ring-cream-300">
            <button
              type="button"
              className="p-3"
              onClick={() =>
                setQty((current) =>
                  Math.max(1, current - 1)
                )
              }
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>

            <span className="w-8 text-center">
              {qty}
            </span>

            <button
              type="button"
              className="p-3"
              onClick={() =>
                setQty((current) => current + 1)
              }
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={stock <= 0}
            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-terracotta-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:px-6"
          >
            {added ? (
              <Check size={16} />
            ) : (
              <ShoppingBag size={16} />
            )}

            {added ? "Added to cart" : "Add to cart"}
          </button>

          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white sm:col-auto sm:px-6"
          >
            <MessageCircle size={16} />
            Order via WhatsApp
          </a>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-cocoa-700/70">
          Sign in is required before checkout. Pay with
          Paystack or the company bank accounts.
        </p>
      </div>
    </div>
  );
}
