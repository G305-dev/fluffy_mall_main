"use client";

import { useCart } from "@/components/CartProvider";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { naira } from "@/lib/format";
import settings from "@/data/settings.json";
import { orderWaHref } from "@/lib/whatsapp";
import { Copy, Check } from "lucide-react";

export default function BankPayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { clear } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order));
  }, [params.id]);

  if (!order) return <p className="p-10 text-center">Loading order…</p>;

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  }

  async function confirm() {
    if (!order) return;
    setBusy(true);
    const response = await fetch(`/api/orders/${order.id}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "mark_transferred" }),
});

if (!response.ok) {
  setBusy(false);
  return;
}

clear();
router.push(`/order/${order.id}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Order {order.id}</p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-cocoa-800 sm:text-4xl">Transfer {naira(order.total)}</h1>
      <p className="mt-3 text-sm leading-relaxed text-cocoa-700">
        Pay only the company accounts below. Use your order ID as the narration so we can match it quickly.
      </p>
      <div className="mt-6 space-y-3">
        {settings.bankAccounts.map((a) => (
          <div key={a.number} className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
            <p className="text-xs uppercase tracking-widest text-gold-600">{a.bank}</p>
            <p className="mt-1 break-all font-display text-xl sm:text-2xl">{a.number}</p>
            <p className="text-sm text-cocoa-700">{a.name}</p>
            <button
              onClick={() => copy(a.number, a.bank)}
              className="mt-3 inline-flex items-center gap-1 text-sm text-terracotta-600"
            >
              {copied === a.bank ? <Check size={14} /> : <Copy size={14} />}
              {copied === a.bank ? "Copied" : "Copy account number"}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        {settings.antiFraudNote}
      </p>
      <p className="mt-4 text-sm">
        Narration: <strong>{order.id}</strong>
      </p>
      <button
        onClick={confirm}
        disabled={busy}
        className="mt-6 w-full rounded-full bg-cocoa-800 py-3 text-sm font-semibold text-cream-50"
      >
        I have paid — notify the store
      </button>
      <a
        href={orderWaHref(order)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block w-full rounded-full bg-[#25D366] py-3 text-center text-sm font-semibold text-white"
      >
        Send proof on WhatsApp
      </a>
    </div>
  );
}
