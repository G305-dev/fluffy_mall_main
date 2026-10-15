"use client";

import { useCart } from "@/components/CartProvider";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Order } from "@/lib/types";
import { naira } from "@/lib/format";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

declare global {
  interface Window {
    PaystackPop?: {
      setup(options: Record<string, unknown>): {
        openIframe(): void;
      };
    };
  }
}

export default function PaystackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [checkoutPaused, setCheckoutPaused] = useState(true);
  const requested = useRef(false);

  useEffect(() => {
    fetch(`/api/orders/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not load order.");
        }
        setOrder(data.order);
        setCheckoutPaused(Boolean(data.checkoutPaused));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load order."
        )
      );
  }, [id]);

  useEffect(() => {
    if (!PUBLIC_KEY || requested.current) return;
    requested.current = true;

    if (window.PaystackPop) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () =>
      setError(
        "Could not load Paystack. Check your connection and refresh."
      );
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  function pay() {
    if (!order || !PUBLIC_KEY || !window.PaystackPop || busy) return;

    if (order.payment.status === "paid") {
      router.push(`/order/${order.id}`);
      return;
    }

    if (checkoutPaused) return;

    setBusy(true);
    setError("");

    const reference = `PSK-${order.id}-${Date.now() % 100000}`;

    window.PaystackPop.setup({
      key: PUBLIC_KEY,
      email: order.customer.email,
      amount: Math.round(order.total * 100),
      currency: "NGN",
      ref: reference,
      metadata: { order_id: order.id },

      callback: (result: { reference: string }) => {
        fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: result.reference,
          }),
        })
          .then(async (response) => {
            const data = await response.json();

            if (!response.ok || !data.ok) {
              throw new Error(
                data.error || "Payment could not be verified yet."
              );
            }

            clear();
            router.push(`/order/${order.id}`);
          })
          .catch((cause) => {
            setError(
              `${
                cause instanceof Error
                  ? cause.message
                  : "Verification failed."
              } If debited, keep your reference ${result.reference} and contact the store.`
            );
            setBusy(false);
          });
      },

      onClose: () => setBusy(false),
    }).openIframe();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">
          Secure Paystack checkout
        </p>

        <h1 className="mt-3 font-display text-3xl text-cocoa-800">
          {order ? `Pay ${naira(order.total)}` : "Loading order…"}
        </h1>

        {order && (
          <p className="mt-2 text-sm text-stone-600">
            Order {order.id}
          </p>
        )}

        {!PUBLIC_KEY && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            Payments are not configured. No demo payment can mark an
            order paid. Please contact the store.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {checkoutPaused && order?.payment.status !== "paid" && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          >
            Checkout is temporarily paused while current inventory is
            reviewed.
          </p>
        )}

        {order && PUBLIC_KEY && (
          <button
            type="button"
            disabled={
              !ready ||
              busy ||
              (checkoutPaused && order.payment.status !== "paid")
            }
            onClick={pay}
            className="mt-6 w-full rounded-full bg-[#ff8200] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy
              ? "Waiting for Paystack…"
              : order.payment.status === "paid"
                ? "View paid order"
                : ready
                  ? "Pay with Paystack"
                  : "Loading Paystack…"}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.push("/cart")}
          className="mt-3 w-full rounded-full border border-stone-200 px-5 py-3 text-sm"
        >
          Modify cart
        </button>

        <p className="mt-4 text-xs text-stone-500">
          Card details are processed by Paystack, not this website.
        </p>
      </div>
    </div>
  );
}