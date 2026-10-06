"use client";

import { OrderStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/status";
import { useRouter } from "next/navigation";
import { useState } from "react";

const NEXT: OrderStatus[] = [
  "pending_payment",
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
}: {
  id: string;
  status: OrderStatus;
}) {
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function save(next: OrderStatus) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/orders/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: next,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update the order."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the order."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 min-[430px]:flex min-[430px]:flex-wrap min-[430px]:items-center">
      <select
        value={value}
        onChange={(event) =>
          setValue(event.target.value as OrderStatus)
        }
        className="w-full rounded-full border border-cream-300 bg-white px-3 py-2 text-sm min-[430px]:w-auto"
      >
        {NEXT.map((statusOption) => (
          <option
            key={statusOption}
            value={statusOption}
          >
            {STATUS_LABEL[statusOption]}
          </option>
        ))}
      </select>

      <button
        disabled={busy}
        onClick={() => save(value)}
        className="w-full rounded-full bg-cocoa-800 px-5 py-2.5 text-sm text-cream-50 min-[430px]:w-auto"
      >
        Update status
      </button>

      {error && (
        <p className="basis-full text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}