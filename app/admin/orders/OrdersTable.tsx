"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Search, X } from "lucide-react";
import { naira } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";
import type { Order, OrderStatus } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export type StatusFilter = "all" | "pending" | OrderStatus;
export type ChannelFilter = "all" | "website" | "pos";
type MethodFilter = "all" | "paystack" | "bank";
type FulfilmentFilter = "all" | "delivery" | "pickup";

const PAGE_SIZE = 10;
const PLACEHOLDER = "/images/product-placeholder.svg";
const exactStatuses = Object.entries(STATUS_LABEL) as [OrderStatus, string][];
const orderDate = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  dateStyle: "medium",
  timeStyle: "short",
});

function paymentLabel(method: string) {
  return method === "paystack"
    ? "Paystack"
    : method === "bank"
      ? "Bank transfer"
      : method;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : orderDate.format(date);
}

function csvCell(value: string | number) {
  const text = String(value).replace(/[\r\n]+/g, " ");
  // Keep spreadsheet applications from interpreting customer text as formulas.
  const safe = /^[=+\-@\t]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function Items({ order }: { order: Order }) {
  const extra = Math.max(0, order.items.length - 2);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {order.items.slice(0, 2).map((item, index) => (
        <Image
          key={`${item.productId}-${index}`}
          src={item.image || PLACEHOLDER}
          alt={item.name}
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-lg bg-stone-100 object-cover"
        />
      ))}
      {extra > 0 && (
        <span className="shrink-0 text-xs text-stone-500">+{extra}</span>
      )}
      <span
        className="min-w-0 truncate text-xs text-stone-600"
        title={order.items
          .map((item) => `${item.qty} × ${item.name}`)
          .join(", ")}
      >
        {order.items.length
          ? order.items.map((item) => item.name).join(", ")
          : "No items"}
      </span>
    </div>
  );
}

export default function OrdersTable({
  orders,
  initialStatus,
  initialChannel,
  today,
}: {
  orders: Order[];
  initialStatus: StatusFilter;
  initialChannel: ChannelFilter;
  today: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [channel, setChannel] = useState<ChannelFilter>(initialChannel);
  const [method, setMethod] = useState<MethodFilter>("all");
  const [fulfilment, setFulfilment] = useState<FulfilmentFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return orders.filter((order) => {
      if (
        status === "pending" &&
        ["completed", "cancelled", "refunded"].includes(order.status)
      ) {
        return false;
      }
      if (
        status !== "all" &&
        status !== "pending" &&
        order.status !== status
      ) {
        return false;
      }
      if (channel !== "all" && (order.channel === "pos" ? "pos" : "website") !== channel) {
        return false;
      }
      if (method !== "all" && order.payment.method !== method) return false;
      if (fulfilment !== "all" && order.fulfilment !== fulfilment) return false;

      const text = [
        order.id,
        order.customer.name,
        order.customer.email,
        order.customer.phone,
        order.customer.state,
        order.payment.reference || "",
        ...order.items.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      return terms.every((term) => text.includes(term));
    });
  }, [orders, query, status, channel, method, fulfilment]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const first = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(first, first + PAGE_SIZE);
  const selected = new Set(selectedIds);
  const selectedInResults = filtered.filter((order) => selected.has(order.id));
  const allOnPageSelected =
    visible.length > 0 && visible.every((order) => selected.has(order.id));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) =>
      Math.min(
        Math.max(1, safePage - 2),
        Math.max(1, totalPages - 4)
      ) + index
  );
  const hasFilters =
    Boolean(query.trim()) ||
    status !== initialStatus ||
    channel !== "all" ||
    method !== "all" ||
    fulfilment !== "all";

  function changeFilter(update: () => void) {
    update();
    setPage(1);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id)
        ? ids.filter((value) => value !== id)
        : [...ids, id]
    );
  }

  function togglePageSelection() {
    setSelectedIds((ids) =>
      allOnPageSelected
        ? ids.filter((id) => !visible.some((order) => order.id === id))
        : Array.from(
            new Set([...ids, ...visible.map((order) => order.id)])
          )
    );
  }

  function exportCSV() {
    const source = selectedInResults.length ? selectedInResults : filtered;
    if (!source.length) return;

    const columns = [
      "Order ID",
      "Order date (ISO)",
      "Customer",
      "Email",
      "Phone",
      "Items",
      "Total (NGN)",
      "Payment method",
      "Payment status",
      "Order status",
      "Fulfilment",
      "State",
    ];
    const rows = source.map((order) => [
      order.id,
      order.createdAt,
      order.customer.name,
      order.customer.email,
      order.customer.phone,
      order.items
        .map(
          (item) =>
            `${item.qty} x ${item.name}${
              item.variantName ? ` (${item.variantName})` : ""
            }`
        )
        .join(" | "),
      order.total,
      paymentLabel(order.payment.method),
      order.payment.status,
      STATUS_LABEL[order.status],
      order.fulfilment,
      order.customer.state,
    ]);
    const csv =
      "\ufeff" +
      [columns, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `fluffy-mall-orders-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section
      aria-label="Orders list"
      className="min-w-0 rounded-2xl border border-stone-200 bg-white"
    >
      <div className="grid gap-2 border-b border-stone-100 p-3 sm:grid-cols-2 sm:p-4 xl:flex xl:flex-wrap xl:items-center">
        <label className="relative min-w-0 sm:col-span-2 xl:min-w-[220px] xl:flex-1">
          <span className="sr-only">Search orders</span>
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) =>
              changeFilter(() => setQuery(event.target.value))
            }
            placeholder="Search order ID, customer or item"
            className="w-full rounded-xl border border-stone-200 bg-[#fafafa] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
          />
        </label>

        <label className="sr-only" htmlFor="orders-status">
          Order status
        </label>
        <select
          id="orders-status"
          value={status}
          onChange={(event) =>
            changeFilter(() =>
              setStatus(event.target.value as StatusFilter)
            )
          }
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm xl:w-40"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending / open</option>
          <optgroup label="Exact status">
            {exactStatuses.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </optgroup>
        </select>

        <label className="sr-only" htmlFor="orders-channel">
          Sales channel
        </label>
        <select
          id="orders-channel"
          value={channel}
          onChange={(event) =>
            changeFilter(() =>
              setChannel(event.target.value as ChannelFilter)
            )
          }
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm xl:w-40"
        >
          <option value="all">All orders</option>
          <option value="pos">Store sales</option>
          <option value="website">Website sales</option>
        </select>

        <label className="sr-only" htmlFor="orders-payment">
          Payment method
        </label>
        <select
          id="orders-payment"
          value={method}
          onChange={(event) =>
            changeFilter(() =>
              setMethod(event.target.value as MethodFilter)
            )
          }
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm xl:w-40"
        >
          <option value="all">All payment methods</option>
          <option value="paystack">Paystack</option>
          <option value="bank">Bank transfer</option>
        </select>

        <label className="sr-only" htmlFor="orders-fulfilment">
          Fulfilment
        </label>
        <select
          id="orders-fulfilment"
          value={fulfilment}
          onChange={(event) =>
            changeFilter(() =>
              setFulfilment(event.target.value as FulfilmentFilter)
            )
          }
          className="min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm xl:w-36"
        >
          <option value="all">All fulfilment</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
        </select>

        <button
          type="button"
          onClick={exportCSV}
          disabled={!filtered.length}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 px-3 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 xl:ml-auto"
        >
          <Download size={16} aria-hidden="true" />
          {selectedInResults.length
            ? `Export selected (${selectedInResults.length})`
            : "Export orders"}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              changeFilter(() => {
                setQuery("");
                setStatus(initialStatus);
                setMethod("all");
                setFulfilment("all");
              })
            }
            className="flex items-center justify-center gap-1 text-xs text-stone-600 hover:text-orange-700 sm:col-span-2 xl:col-span-1"
          >
            <X size={14} aria-hidden="true" /> Reset filters
          </button>
        )}
      </div>

      <div className="space-y-3 p-3 lg:hidden">
        {visible.map((order) => (
          <article
            key={order.id}
            className="min-w-0 rounded-xl border border-stone-200 p-3 text-sm"
          >
            <div className="flex min-w-0 items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(order.id)}
                onChange={() => toggleSelected(order.id)}
                aria-label={`Select order ${order.id}`}
                className="mt-1 h-4 w-4 shrink-0 accent-orange-600"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/orders/${encodeURIComponent(order.id)}`}
                  className="break-all font-semibold text-orange-700 hover:underline"
                >
                  {order.id}
                </Link>
                {order.channel === "pos" && (
                  <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                    In-store
                  </span>
                )}
                <p className="mt-1 break-words text-stone-600">
                  {order.customer.name} · {order.customer.email}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-3">
              <Items order={order} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
              <span>
                Total:{" "}
                <strong className="text-cocoa-800">
                  {naira(order.total)}
                </strong>
              </span>
              <span>{paymentLabel(order.payment.method)}</span>
              <span>{formatDate(order.createdAt)}</span>
              <span className="capitalize">{order.fulfilment}</span>
            </div>
            <Link
              href={`/admin/orders/${encodeURIComponent(order.id)}`}
              className="mt-3 inline-block rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-orange-700"
            >
              View order
            </Link>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-stone-50 text-xs font-semibold text-stone-600">
            <tr>
              <th scope="col" className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={togglePageSelection}
                  disabled={!visible.length}
                  aria-label="Select all orders on this page"
                  className="h-4 w-4 accent-orange-600"
                />
              </th>
              <th scope="col" className="px-3 py-3">Order ID</th>
              <th scope="col" className="px-3 py-3">Customer</th>
              <th scope="col" className="px-3 py-3">Items</th>
              <th scope="col" className="px-3 py-3">Total</th>
              <th scope="col" className="px-3 py-3">Payment method</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Order date</th>
              <th scope="col" className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {visible.map((order) => (
              <tr key={order.id} className="hover:bg-orange-50/40">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelected(order.id)}
                    aria-label={`Select order ${order.id}`}
                    className="h-4 w-4 accent-orange-600"
                  />
                </td>
                <td className="break-all px-3 py-3 font-semibold">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(order.id)}`}
                    className="text-orange-700 hover:underline"
                  >
                    {order.id}
                  </Link>
                  {order.channel === "pos" && (
                    <span className="ml-2 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                      In-store
                    </span>
                  )}
                </td>
                <td className="max-w-44 px-3 py-3">
                  <p
                    className="truncate font-medium text-cocoa-800"
                    title={order.customer.name}
                  >
                    {order.customer.name}
                  </p>
                  <p
                    className="truncate text-xs text-stone-500"
                    title={order.customer.email}
                  >
                    {order.customer.email}
                  </p>
                </td>
                <td className="max-w-48 px-3 py-3">
                  <Items order={order} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-semibold text-cocoa-800">
                  {naira(order.total)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-stone-600">
                  {paymentLabel(order.payment.method)}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-stone-600">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <Link
                    href={`/admin/orders/${encodeURIComponent(order.id)}`}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visible.length && (
        <p className="px-4 py-10 text-center text-sm text-stone-500">
          {orders.length
            ? "No orders match these filters."
            : "No orders in the selected date range."}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 text-xs text-stone-600">
        <span>
          Showing {filtered.length ? first + 1 : 0}–
          {Math.min(first + PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length} orders
        </span>
        {totalPages > 1 && (
          <nav aria-label="Orders pages" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              className="rounded-lg border border-stone-200 px-2 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            {pages.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setPage(number)}
                aria-current={safePage === number ? "page" : undefined}
                className={`rounded-lg border px-2.5 py-1.5 ${
                  safePage === number
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-stone-200 hover:bg-orange-50"
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="rounded-lg border border-stone-200 px-2 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}