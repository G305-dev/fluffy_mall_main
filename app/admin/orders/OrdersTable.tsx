"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/lib/types";
import { naira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_LABEL } from "@/lib/status";
import { Search, X } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = Object.entries(STATUS_LABEL) as [OrderStatus, string][];

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [method, setMethod] = useState<"all" | "paystack" | "bank_transfer">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (method !== "all" && o.payment.method !== method) return false;
      if (!query) return true;
      const haystack = [
        o.id,
        o.customer.name,
        o.customer.phone,
        o.customer.email || "",
        o.customer.state,
        o.payment.reference || "",
        ...o.items.map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase();
      return query
        .split(/\s+/)
        .every((word) => haystack.includes(word));
    });
  }, [orders, q, status, method]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetFilters() {
    setQ("");
    setStatus("all");
    setMethod("all");
    setPage(1);
  }

  const hasFilters = q.trim() !== "" || status !== "all" || method !== "all";

  return (
    <div>
      {/* Search + filters */}
      <div className="mt-6 grid gap-3 min-[520px]:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <div className="relative min-w-0 min-[520px]:col-span-2 lg:min-w-[220px] lg:flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-600" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search order ID, name, phone, email, product…"
            className="w-full rounded-full border border-cream-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-terracotta-400 focus:ring-2"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(1);
          }}
          className="w-full rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm lg:w-auto"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value as typeof method);
            setPage(1);
          }}
          className="w-full rounded-full border border-cream-300 bg-white px-4 py-2.5 text-sm lg:w-auto"
        >
          <option value="all">All payments</option>
          <option value="paystack">Paystack</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="flex w-full items-center justify-center gap-1 rounded-full px-3 py-2 text-sm min-[520px]:w-auto text-cocoa-700 ring-1 ring-cream-300 hover:bg-cream-100"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="mt-3 text-xs text-cocoa-700/60">
        {filtered.length === orders.length
          ? `${orders.length} orders`
          : `${filtered.length} of ${orders.length} orders match`}
      </p>

      {/* Compact cards keep order processing usable without a sideways scroll on phones. */}
      <div className="mt-3 space-y-3 lg:hidden">
        {visible.map((o) => (
          <article key={o.id} className="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-cream-200">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/admin/orders/${o.id}`} className="break-words font-medium text-terracotta-600">
                  {o.id}
                </Link>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(o.createdAt).toLocaleString("en-NG")}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-cream-100 pt-4 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-stone-500">Customer</dt>
                <dd className="mt-0.5 break-words">{o.customer.name}</dd>
                <dd className="break-words text-xs text-stone-500">{o.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Total</dt>
                <dd className="mt-0.5 font-semibold">{naira(o.total)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-stone-500">Payment</dt>
                <dd className="mt-0.5 capitalize">{o.payment.method.replace("_", " ")}</dd>
              </div>
            </dl>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-500 ring-1 ring-cream-200">
            {orders.length === 0
              ? "No orders yet"
              : "No orders match your search — try different words or clear the filters."}
          </p>
        )}
      </div>

      {/* Full data table for tablets and desktops. */}
      <div className="mt-3 hidden overflow-x-auto rounded-3xl bg-white ring-1 ring-cream-200 lg:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-cream-200 text-xs uppercase tracking-wider text-gold-600">
            <tr>
              <th className="p-4">Order</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Total</th>
              <th className="p-4">Pay</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-b border-cream-100">
                <td className="p-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-terracotta-600">
                    {o.id}
                  </Link>
                  <p className="text-xs text-stone-500">
                    {new Date(o.createdAt).toLocaleString("en-NG")}
                  </p>
                </td>
                <td className="p-4">
                  {o.customer.name}
                  <p className="text-xs text-stone-500">{o.customer.phone}</p>
                </td>
                <td className="p-4">{naira(o.total)}</td>
                <td className="p-4 capitalize">{o.payment.method.replace("_", " ")}</td>
                <td className="p-4">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-stone-500">
                  {orders.length === 0
                    ? "No orders yet"
                    : "No orders match your search — try different words or clear the filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-xs sm:text-sm">
          <button
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
            className="rounded-full px-4 py-2 ring-1 ring-cream-300 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-center text-cocoa-700/70">
            Page {safePage} of {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
            className="rounded-full px-4 py-2 ring-1 ring-cream-300 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
