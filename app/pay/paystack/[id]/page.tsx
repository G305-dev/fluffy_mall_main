"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { naira } from "@/lib/format";

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";

declare global {
  interface Window {
    PaystackPop?: {
      setup(options: Record<string, unknown>): { openIframe(): void };
    };
  }
}

export default function PaystackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [payError, setPayError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const scriptRequested = useRef(false);

  const liveMode = Boolean(PAYSTACK_PUBLIC_KEY);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load this order.");
        setOrder(d.order);
      })
      .catch((err) => setLoadError(err.message));
  }, [params.id]);

  // Load Paystack's inline script only in live mode.
  useEffect(() => {
    if (!liveMode || scriptRequested.current) return;
    scriptRequested.current = true;
    if (window.PaystackPop) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () =>
      setPayError("Could not load Paystack. Check your connection and refresh.");
    document.body.appendChild(script);
  }, [liveMode]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-20 text-center">
        <h1 className="font-display text-3xl text-cocoa-800">Payment could not start</h1>
        <p className="mt-3 text-sm text-rose-700">{loadError}</p>
        <button
          onClick={() => router.push("/track")}
          className="mt-6 rounded-full bg-cocoa-800 px-6 py-3 text-sm font-semibold text-cream-50"
        >
          Track my order
        </button>
      </div>
    );
  }

  if (!order) return <p className="p-10 text-center">Starting Paystack…</p>;

  /* ---------- LIVE mode: real Paystack inline popup ---------- */
  function payLive() {
    if (!window.PaystackPop || !order) return;
    setPayError("");
    setBusy(true);
    const reference = `PSK-${order.id}-${Date.now() % 100000}`;
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: order.customer.email || "orders@fluffynyummy.com",
      amount: Math.round(order.total * 100), // kobo
      currency: "NGN",
      ref: reference,
      metadata: {
        order_id: order.id,
        customer_name: order.customer.name,
        custom_fields: [
          { display_name: "Order", variable_name: "order_id", value: order.id },
        ],
      },
      callback: (response: { reference: string }) => {
        // Verify on the server before trusting the result.
        fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: response.reference }),
        })
          .then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Verification failed");
            router.push(`/order/${order.id}`);
          })
          .catch((err) => {
            setPayError(
              `${err.message} — if you were debited, your payment will be confirmed automatically; contact us with reference ${response.reference}.`
            );
            setBusy(false);
          });
      },
      onClose: () => {
        setBusy(false);
      },
    });
    handler.openIframe();
  }

  /* ---------- DEMO mode: no keys configured ---------- */
  async function payDemo(success: boolean) {
    if (!order) return;
    setBusy(true);
    await fetch(`/api/orders/${order.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: success ? "paystack_success" : "paystack_failed",
        reference: `PSK-${order.id}`,
      }),
    });
    router.push(`/order/${order.id}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <div className="rounded-3xl bg-white p-5 shadow-card sm:rounded-[2rem] sm:p-8 ring-1 ring-cream-200">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-[#0ba4db]">
          Paystack checkout
        </p>
        <h1 className="mt-3 text-center font-display text-3xl">Pay {naira(order.total)}</h1>
        <p className="mt-2 break-words text-center text-sm text-stone-500">
          {order.customer.email || order.customer.phone} · {order.id}
        </p>

        {liveMode ? (
          <>
            <p className="mt-6 rounded-2xl bg-cream-100 p-4 text-xs leading-relaxed text-cocoa-700">
              You&apos;ll pay securely in the Paystack window — card, bank transfer or USSD.
              Your card details never touch our servers.
            </p>
            {payError && <p className="mt-4 text-sm text-rose-700">{payError}</p>}
            <div className="mt-6 grid gap-2">
              <button
                disabled={busy || !scriptReady}
                onClick={payLive}
                className="rounded-full bg-[#0ba4db] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Waiting for Paystack…" : scriptReady ? "Pay with card / transfer / USSD" : "Loading Paystack…"}
              </button>
              <button
                disabled={busy}
                onClick={() => router.push(`/order/${order.id}`)}
                className="rounded-full py-3 text-sm ring-1 ring-stone-200"
              >
                Pay later — view order
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-6 rounded-2xl bg-cream-100 p-4 text-xs leading-relaxed text-cocoa-700">
              Demo mode: live Paystack keys are not configured in this environment. Completing
              payment here marks the order paid the same way a verified webhook would. Connect
              keys via <code>PAYSTACK_SECRET_KEY</code> and{" "}
              <code>NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code>.
            </p>
            <div className="mt-6 grid gap-2">
              <button
                disabled={busy}
                onClick={() => payDemo(true)}
                className="rounded-full bg-[#0ba4db] py-3 text-sm font-semibold text-white"
              >
                Pay with card / transfer / USSD
              </button>
              <button
                disabled={busy}
                onClick={() => payDemo(false)}
                className="rounded-full py-3 text-sm ring-1 ring-stone-200"
              >
                Simulate failed payment
              </button>
            </div>
          </>
        )}

        <p className="mt-4 text-center text-[11px] text-stone-400">
          Secured by Paystack · Fluffy&apos;n&apos;Yummy Concepts
        </p>
      </div>
    </div>
  );
}
