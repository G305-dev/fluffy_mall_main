"use client";

import { useMemo, useState } from "react";
import { Product } from "@/lib/types";
import { naira, waLink } from "@/lib/format";
import { useCart } from "@/components/CartProvider";
import { PRIMARY_WA, productWhatsAppText } from "@/lib/whatsapp";
import { categoryName } from "@/lib/categories";
import Link from "next/link";
import { Check, MessageCircle, Minus, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";

export default function ProductView({ product }: { product: Product }) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId);
  const price = variant ? variant.price : product.price;
  const stock = variant ? variant.stock : product.stock;

  const wa = useMemo(
    () =>
      waLink(PRIMARY_WA, productWhatsAppText(product.name, price, variant?.name)),
    [product.name, price, variant?.name]
  );

  function addToCart() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0],
        variantId: variant?.id,
        variantName: variant?.name,
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
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <Link href={`/shop/${product.category}`} className="text-xs uppercase tracking-[0.16em] text-gold-600 sm:tracking-[0.2em]">
          {categoryName(product.category)}
        </Link>
        <h1 className="mt-2 break-words font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">{product.name}</h1>
        <div className="mt-4 flex items-baseline gap-3">
          <p className="text-2xl font-semibold text-cocoa-800">{naira(price)}</p>
          {product.compareAt && (
            <p className="text-stone-400 line-through">{naira(product.compareAt)}</p>
          )}
        </div>
        {(product.description || stock <= 0) && (
          <p className="mt-4 leading-relaxed text-cocoa-700/80">
            {product.description}
            {stock <= 0 && (
              <span className="block font-medium text-cocoa-800">Currently out of stock.</span>
            )}
          </p>
        )}

        {product.variants.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium">Choose option</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`rounded-full px-4 py-2 text-sm ring-1 ${
                    variantId === v.id
                      ? "bg-cocoa-800 text-cream-50 ring-cocoa-800"
                      : "bg-white ring-cream-300"
                  }`}
                >
                  {v.name} · {naira(v.price)}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-5 rounded-2xl bg-cream-100 p-4 text-sm leading-relaxed text-cocoa-700">
          {product.deliveryNote}
        </p>

        <div className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:flex sm:flex-wrap">
          <div className="flex items-center rounded-full ring-1 ring-cream-300">
            <button
              className="p-3"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease"
            >
              <Minus size={16} />
            </button>
            <span className="w-8 text-center">{qty}</span>
            <button className="p-3" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={addToCart}
            disabled={stock <= 0}
            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-terracotta-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:px-6"
          >
            {added ? <Check size={16} /> : <ShoppingBag size={16} />}
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
          Sign in is required before checkout. Pay with Paystack (card, transfer, USSD) or the company bank accounts. 
        </p>
      </div>
    </div>
  );
}
