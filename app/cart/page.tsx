"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart, itemKey } from "@/components/CartProvider";
import { naira, waLink } from "@/lib/format";
import { cartWhatsAppText, PRIMARY_WA } from "@/lib/whatsapp";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

export default function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();

  // Detect whether the customer is signed in, so the checkout button can say
  // "Proceed to checkout" for signed-in users and "Sign in to checkout" for guests.
  const [signedIn, setSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  useEffect(() => {
    fetch("/api/customer/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated) {
          setSignedIn(true);
          setSignedInEmail(d.email || "");
        }
      })
      .catch(() => {
        // Leave as guest state if the session check fails.
      });
  }, []);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="font-display text-3xl text-cocoa-800 sm:text-4xl">Your cart is empty</h1>
        <p className="mt-3 text-cocoa-700/70">Browse the catalog or send us a WhatsApp screenshot the old way — both work.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-terracotta-500 px-6 py-3 text-sm font-semibold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:px-8">
      <div className="min-w-0">
        <h1 className="font-display text-3xl text-cocoa-800 sm:text-4xl">Cart</h1>
        <ul className="mt-6 divide-y divide-cream-200 rounded-3xl bg-white ring-1 ring-cream-200">
          {items.map((item) => {
            const key = itemKey(item);
            return (
              <li key={key} className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 p-3 sm:flex sm:gap-4 sm:p-4">
                <Image
                  src={item.image}
                  alt=""
                  width={80}
                  height={96}
                  className="h-20 w-16 shrink-0 rounded-xl object-cover sm:h-24 sm:w-20 sm:rounded-2xl"
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${item.slug}`} className="break-words font-display text-base text-cocoa-800 sm:text-lg">
                    {item.name}
                  </Link>
                  {item.variantName && (
                    <p className="text-sm text-cocoa-700/70">{item.variantName}</p>
                  )}
                  <p className="mt-1 text-sm font-medium">{naira(item.unitPrice)}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center rounded-full ring-1 ring-cream-300">
                      <button className="p-2" onClick={() => setQty(key, item.qty - 1)}>
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center text-sm">{item.qty}</span>
                      <button className="p-2" onClick={() => setQty(key, item.qty + 1)}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="text-stone-400" onClick={() => remove(key)} aria-label="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="col-start-2 text-right text-sm font-semibold sm:col-auto sm:text-left sm:text-base">{naira(item.unitPrice * item.qty)}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="h-fit rounded-3xl bg-white p-5 shadow-soft ring-1 ring-cream-200 sm:p-6 lg:sticky lg:top-32">
        <p className="text-sm text-cocoa-700/70">Subtotal</p>
        <p className="font-display text-3xl text-cocoa-800">{naira(subtotal)}</p>
        <p className="mt-2 text-xs text-cocoa-700/70">
          Delivery or pickup discount is calculated at checkout. Free Lagos delivery from ₦70,000.
        </p>
        <Link
          href="/checkout"
          className="mt-6 block rounded-full bg-terracotta-500 py-3 text-center text-sm font-semibold text-white"
        >
          {signedIn ? "Proceed to checkout" : "Sign in to checkout"}
        </Link>
        {signedIn && signedInEmail && (
          <p className="mt-2 text-center text-xs text-cocoa-700/60">Signed in as {signedInEmail}</p>
        )}
        <a
          href={waLink(PRIMARY_WA, cartWhatsAppText(items))}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-full bg-[#25D366] py-3 text-center text-sm font-semibold text-white"
        >
          Send cart on WhatsApp
        </a>
      </aside>
    </div>
  );
}
