"use client";

import { OrderStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/status";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NEXT: OrderStatus[] = [
  "pending_payment",
  "awaiting_verification",
  "paid",
  "processing",
  "out_for_delivery",
  "awaiting_pickup",
  "completed",
  "cancelled",
  "refunded",
];

export default function OrderActions({
  id,
  status,
  paymentStatus,
}: {
  id: string;
  status: OrderStatus;
  paymentStatus: "pending" | "paid" | "failed" | "awaiting_verification";
}) {
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function save(next: OrderStatus, verifyBank = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, verifyBank }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the order.");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 min-[430px]:flex min-[430px]:flex-wrap min-[430px]:items-center">
      {paymentStatus === "awaiting_verification" && (
        <button
          disabled={busy}
          onClick={() => save("paid", true)}
          className="w-full rounded-full bg-emerald-700 px-5 min-[430px]:w-auto py-2.5 text-sm text-white"
        >
          Confirm bank transfer
        </button>
      )}
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as OrderStatus)}
        className="w-full rounded-full border border-cream-300 bg-white px-3 min-[430px]:w-auto py-2 text-sm"
      >
        {NEXT.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <button
        disabled={busy}
        onClick={() => save(value)}
        className="w-full rounded-full bg-cocoa-800 px-5 min-[430px]:w-auto py-2.5 text-sm text-cream-50"
      >
        Update status
      </button>
      {error && <p className="basis-full text-sm text-rose-700">{error}</p>}
    </div>
  );
}
