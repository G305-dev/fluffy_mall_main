"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Order } from "@/lib/types";
import { naira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { orderWaHref } from "@/lib/whatsapp";
import Link from "next/link";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function loadOrder() {
      const response = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });
      const data = await response.json();
      if (!active) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/track";
          return;
        }
        setMissing(true);
        return;
      }
      setOrder(data.order);
      if (data.order.payment.status !== "paid") {
        timer = setTimeout(loadOrder, 3000);
      }
    }

    loadOrder();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [params.id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-20 text-center">
        <h1 className="font-display text-3xl">Order not found</h1>
        <Link href="/track" className="mt-4 inline-block text-terracotta-600">
          Track another order
        </Link>
      </div>
    );
  }
  if (!order) return <p className="p-10 text-center">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-gold-600">Thank you</p>
      <h1 className="mt-2 break-words font-display text-2xl leading-tight text-cocoa-800 sm:text-4xl">Order {order.id}</h1>
      <div className="mt-4">
        <StatusBadge status={order.status} />
      </div>
      {order.payment.status === "paid" && (
        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
          <p className="font-semibold">Payment confirmed</p>
          <p className="mt-1">Your Paystack payment was successful and your order has been confirmed.</p>
        </div>
      )}
      {order.payment.status === "pending" && (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          We are waiting for Paystack to confirm your payment. This page will update automatically.
        </div>
      )}
      <p className="mt-4 text-sm text-cocoa-700">
        Save this order ID. Use it with your WhatsApp number to track status anytime.
      </p>
      <ul className="mt-6 divide-y divide-cream-200 rounded-3xl bg-white ring-1 ring-cream-200">
        {order.items.map((i, idx) => (
          <li key={idx} className="flex min-w-0 justify-between gap-3 p-4 text-sm">
            <span className="min-w-0 break-words">
              {i.name}
              {i.variantName ? ` (${i.variantName})` : ""} × {i.qty}
            </span>
            <span className="shrink-0">{naira(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{naira(order.subtotal)}</dd>
        </div>
        {order.pickupDiscount > 0 && (
          <div className="flex justify-between text-sage-600">
            <dt>Pickup discount</dt>
            <dd>-{naira(order.pickupDiscount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd>{naira(order.deliveryFee)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{naira(order.total)}</dd>
        </div>
      </dl>
      <p className="mt-4 break-words text-sm text-cocoa-700">
        {order.fulfilment === "pickup"
          ? "Pickup at 30A Oseni Street, Anthony Village, opposite GTBank."
          : `Delivering to ${order.customer.state}${order.customer.address ? ` · ${order.customer.address}` : ""}`}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={orderWaHref(order)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Send this order on WhatsApp
        </a>
        <Link href="/shop" className="rounded-full px-5 py-2.5 text-sm ring-1 ring-cream-300">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
