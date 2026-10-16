"use client";

import { useMemo, useState } from "react";
import { Banknote, CheckCircle2, Clock3, ShoppingBag, XCircle } from "lucide-react";
import { naira } from "@/lib/format";
import type { Order } from "@/lib/types";
import OrdersTable, { type ChannelFilter, type StatusFilter } from "./OrdersTable";

type Period = "7" | "30" | "90" | "all" | "custom";
type Summary = {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  refunded: number;
  revenue: number;
};

const lagosDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos", day: "2-digit", month: "2-digit", year: "numeric",
});
const shortDate = new Intl.DateTimeFormat("en-NG", {
  timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
});

function dayKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(
    lagosDate.formatToParts(date).map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDay(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDistance(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000
  );
}

function prettyDay(key: string) {
  return shortDate.format(new Date(`${key}T12:00:00Z`));
}

function summarize(orders: Order[]): Summary {
  return {
    total: orders.length,
    completed: orders.filter((order) => order.status === "completed").length,
    pending: orders.filter(
      (order) => !["completed", "cancelled", "refunded"].includes(order.status)
    ).length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
    refunded: orders.filter((order) => order.status === "refunded").length,
    // Revenue reflects paid, non-refunded orders placed in the selected period.
    revenue: orders
      .filter(
        (order) =>
          order.payment.status === "paid" &&
          order.status !== "cancelled" &&
          order.status !== "refunded"
      )
      .reduce((sum, order) => sum + order.total, 0),
  };
}

function comparison(current: number, previous: number) {
  if (!previous) return current ? "New since previous period" : "No change";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}% vs previous period`;
}

function Trends({
  orders,
  start,
  end,
}: {
  orders: Order[];
  start: string;
  end: string;
}) {
  const days = Math.max(1, dayDistance(start, end) + 1);
  const bucketCount = Math.min(12, days);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    day: shiftDay(start, Math.floor((index * days) / bucketCount)),
    total: 0,
    completed: 0,
  }));

  for (const order of orders) {
    const key = dayKey(order.createdAt);
    const index = Math.min(
      bucketCount - 1,
      Math.floor((dayDistance(start, key) * bucketCount) / days)
    );
    if (index < 0) continue;
    buckets[index].total += 1;
    if (order.status === "completed") buckets[index].completed += 1;
  }

  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const x = (index: number) => 48 + (index * 670) / Math.max(1, bucketCount - 1);
  const y = (value: number) => 175 - (value * 140) / max;
  const totalPoints = buckets
    .map((bucket, index) => `${x(index)},${y(bucket.total)}`)
    .join(" ");
  const completedPoints = buckets
    .map((bucket, index) => `${x(index)},${y(bucket.completed)}`)
    .join(" ");
  const labelIndexes = Array.from(
    new Set([0, Math.floor((bucketCount - 1) / 2), bucketCount - 1])
  );

  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-cocoa-800">Order trends</h2>
        <div className="flex flex-wrap gap-4 text-xs text-stone-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            Total orders
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Completed
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {bucketCount < days
          ? `Grouped into ${bucketCount} intervals`
          : "Daily counts"}{" "}
        · {prettyDay(start)} – {prettyDay(end)}
      </p>
      {orders.length === 0 ? (
        <p className="grid h-56 place-items-center text-sm text-stone-500">
          No orders in this period.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg
            viewBox="0 0 760 225"
            role="img"
            aria-label={`Order trends from ${prettyDay(start)} to ${prettyDay(end)}: ${orders.length} total orders`}
            className="h-auto min-w-[480px] w-full"
          >
            {[0, 1, 2, 3].map((index) => {
              const value = Math.round((max * (3 - index)) / 3);
              const atY = 35 + index * (140 / 3);
              return (
                <g key={index}>
                  <line x1="48" y1={atY} x2="718" y2={atY} stroke="#e7e5e4" />
                  <text
                    x="37"
                    y={atY + 4}
                    textAnchor="end"
                    fill="#78716c"
                    fontSize="11"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
            <polyline
              points={totalPoints}
              fill="none"
              stroke="#ff8200"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={completedPoints}
              fill="none"
              stroke="#059669"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {buckets.map((bucket, index) => (
              <g key={bucket.day}>
                <circle
                  cx={x(index)}
                  cy={y(bucket.total)}
                  r="3"
                  fill="#ff8200"
                />
                <circle
                  cx={x(index)}
                  cy={y(bucket.completed)}
                  r="3"
                  fill="#059669"
                />
              </g>
            ))}
            {labelIndexes.map((index) => (
              <text
                key={index}
                x={x(index)}
                y="211"
                textAnchor={
                  index === 0
                    ? "start"
                    : index === bucketCount - 1
                      ? "end"
                      : "middle"
                }
                fill="#78716c"
                fontSize="11"
              >
                {prettyDay(buckets[index].day)}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

function StatusDistribution({ summary }: { summary: Summary }) {
  const segments = [
    { label: "Completed", count: summary.completed, color: "#059669" },
    { label: "Pending / open", count: summary.pending, color: "#ff8200" },
    { label: "Cancelled", count: summary.cancelled, color: "#e11d48" },
    { label: "Refunded", count: summary.refunded, color: "#a8a29e" },
  ];
  let cursor = 0;
  const gradient = summary.total
    ? `conic-gradient(${segments
        .filter((item) => item.count > 0)
        .map((item) => {
          const start = cursor;
          cursor += (item.count * 100) / summary.total;
          return `${item.color} ${start}% ${cursor}%`;
        })
        .join(", ")})`
    : "#f5f5f4";

  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 lg:col-span-5">
      <h2 className="font-display text-lg text-cocoa-800">
        Order status distribution
      </h2>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-6 xl:flex-nowrap">
        <div
          role="img"
          aria-label={`${summary.completed} completed, ${summary.pending} pending or open, ${summary.cancelled} cancelled, ${summary.refunded} refunded`}
          className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
          style={{ background: gradient }}
        >
          <div className="grid h-24 w-24 place-content-center rounded-full bg-white text-center">
            <strong className="text-2xl text-cocoa-800">
              {summary.total.toLocaleString("en-NG")}
            </strong>
            <span className="text-xs text-stone-500">Total orders</span>
          </div>
        </div>
        <ul className="min-w-[11rem] flex-1 space-y-2 text-xs">
          {segments
            .filter((item) => item.count > 0 || item.label !== "Refunded")
            .map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1 text-stone-600">
                  {item.label}
                </span>
                <strong className="text-cocoa-800">
                  {item.count} (
                  {summary.total
                    ? Math.round((item.count * 100) / summary.total)
                    : 0}
                  %)
                </strong>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

export default function OrdersDashboard({
  orders,
  initialStatus,
  initialChannel,
  nowISO,
}: {
  orders: Order[];
  initialStatus: StatusFilter;
  initialChannel: ChannelFilter;
  nowISO: string;
}) {
  const today = dayKey(nowISO);
  const recentStart = shiftDay(today, -29);
  const channelOrders = useMemo(
    () => orders.filter((order) =>
      initialChannel === "all" ||
      (order.channel === "pos" ? "pos" : "website") === initialChannel
    ),
    [orders, initialChannel]
  );
  const [period, setPeriod] = useState<Period>(() =>
    channelOrders.length &&
    !channelOrders.some((order) => {
      const day = dayKey(order.createdAt);
      return day >= recentStart && day <= today;
    })
      ? "all"
      : "30"
  );
  const [from, setFrom] = useState(recentStart);
  const [to, setTo] = useState(today);

  const datedOrders = useMemo(
    () => channelOrders.map((order) => ({ order, day: dayKey(order.createdAt) })),
    [channelOrders]
  );
  const days = datedOrders.map((item) => item.day).filter(Boolean);
  const start =
    period === "all"
      ? [today, ...days].sort()[0]
      : period === "custom"
        ? from
        : shiftDay(today, 1 - Number(period));
  const end =
    period === "all"
      ? [today, ...days].sort().at(-1) || today
      : period === "custom"
        ? to
        : today;
  const invalidRange = !start || !end || start > end;
  const rangeOrders = invalidRange
    ? []
    : datedOrders
        .filter(({ day }) => day >= start && day <= end)
        .map(({ order }) => order);
  const summary = summarize(rangeOrders);
  const span = invalidRange ? 0 : dayDistance(start, end) + 1;
  const previousOrders =
    period === "all" || invalidRange
      ? null
      : datedOrders
          .filter(
            ({ day }) => day >= shiftDay(start, -span) && day < start
          )
          .map(({ order }) => order);
  const previous = previousOrders ? summarize(previousOrders) : null;
  const metrics = [
    {
      label: "Total orders",
      value: summary.total.toLocaleString("en-NG"),
      number: summary.total,
      before: previous?.total,
      icon: ShoppingBag,
      color: "bg-orange-50 text-orange-700",
    },
    {
      label: "Completed",
      value: summary.completed.toLocaleString("en-NG"),
      number: summary.completed,
      before: previous?.completed,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Pending / open",
      value: summary.pending.toLocaleString("en-NG"),
      number: summary.pending,
      before: previous?.pending,
      icon: Clock3,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Cancelled",
      value: summary.cancelled.toLocaleString("en-NG"),
      number: summary.cancelled,
      before: previous?.cancelled,
      icon: XCircle,
      color: "bg-rose-50 text-rose-700",
    },
    {
      label: "Total revenue",
      value: naira(summary.revenue),
      number: summary.revenue,
      before: previous?.revenue,
      icon: Banknote,
      color: "bg-orange-50 text-orange-700",
    },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Sales / Orders
          </p>
          <h1 className="mt-1 font-display text-3xl text-cocoa-800">
            Orders
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Manage and track website orders and in-store sales.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center">
          <label className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-600">
              Dates
            </span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-cocoa-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {period !== "all" && !invalidRange && (
            <span className="text-xs text-stone-500">
              {prettyDay(start)} – {prettyDay(end)}
            </span>
          )}
        </div>
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-sm">
          <label className="flex items-center gap-2">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1.5"
            />
          </label>
          <label className="flex items-center gap-2">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-lg border border-stone-200 px-2 py-1.5"
            />
          </label>
          {invalidRange && (
            <p role="alert" className="text-rose-700">
              Choose a valid start and end date.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map(({ label, value, number, before, icon: Icon, color }) => (
          <section
            key={label}
            className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${color}`}
              >
                <Icon size={19} aria-hidden="true" />
              </span>
              <h2 className="text-xs font-medium text-stone-600">
                {label}
              </h2>
            </div>
            <p className="mt-4 break-words text-2xl font-bold text-cocoa-800">
              {value}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {before === undefined
                ? "For selected dates"
                : comparison(number, before)}
            </p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {!invalidRange && (
          <Trends orders={rangeOrders} start={start} end={end} />
        )}
        <StatusDistribution summary={summary} />
      </div>
      <p className="text-xs text-stone-500">
        Pending / open includes orders not completed, cancelled or refunded.
        Revenue counts paid orders placed in the chosen dates; cancelled and
        refunded orders are excluded.
      </p>

      <OrdersTable
        key={`${initialStatus}-${initialChannel}-${period}-${from}-${to}`}
        orders={rangeOrders}
        initialStatus={initialStatus}
        initialChannel={initialChannel}
        today={today}
      />
    </div>
  );
}