import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Package,
  RefreshCw,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { getOrders, getProducts } from "@/lib/db";
import { naira } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function orderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}

export default async function AdminHome() {
  const [orders, products] = await Promise.all([
    getOrders(),
    getProducts(),
  ]);

  const pendingPayments = orders.filter(
    (order) => order.status === "pending_payment"
  );
  const paidOrders = orders.filter(
    (order) => order.payment.status === "paid"
  );
  const revenue = paidOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );
  const recentOrders = orders.slice(0, 5);

  const stats = [
    {
      label: "Total orders",
      value: orders.length.toLocaleString("en-NG"),
      note: "All orders placed",
      icon: ShoppingBag,
    },
    {
      label: "Pending payments",
      value: pendingPayments.length.toLocaleString("en-NG"),
      note: "Waiting for payment",
      icon: Wallet,
    },
    {
      label: "Confirmed revenue",
      value: naira(revenue),
      note: "All paid orders",
      icon: BarChart3,
    },
    {
      label: "Products",
      value: products.length.toLocaleString("en-NG"),
      note: "In your catalogue",
      icon: Package,
    },
  ];

  const quickActions = [
    {
      href: "/admin/orders",
      label: "Process orders",
      description: "Review payments and fulfilment",
      icon: ShoppingBag,
    },
    {
      href: "/admin/products",
      label: "Manage products",
      description: "Edit prices, stock and images",
      icon: Package,
    },
    {
      href: "/admin/analytics",
      label: "View analytics",
      description: "Explore sales and trends",
      icon: BarChart3,
    },
    {
      href: "/admin/tracepos/check",
      label: "TracePOS check",
      description: "Review inventory connections",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-cocoa-800 px-6 py-8 text-cream-50 shadow-card sm:px-9 sm:py-10">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-terracotta-500/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
              Store overview
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
              Welcome to your dashboard
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-200 sm:text-base">
              Keep track of orders, payments and products in one place.
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terracotta-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            Manage orders
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-label="Store metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div
            key={label}
            className="min-w-0 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-cream-200 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cocoa-700/70">
                {label}
              </p>
              <span className="rounded-xl bg-cream-100 p-2 text-terracotta-600">
                <Icon size={19} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 break-words font-display text-3xl leading-tight text-cocoa-800">
              {value}
            </p>
            <p className="mt-2 text-xs text-cocoa-700/70">{note}</p>
          </div>
        ))}
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(17rem,1fr)]">
        <section className="min-w-0 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-cream-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
                Activity
              </p>
              <h2 className="mt-1 font-display text-2xl text-cocoa-800">
                Recent orders
              </h2>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500"
            >
              View all
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-cream-50 p-6 text-sm text-cocoa-700">
              No orders yet. New orders will appear here.
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-cream-200">
              {recentOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(order.id)}`}
                    className="flex min-w-0 flex-col gap-3 rounded-xl px-2 py-4 transition-colors hover:bg-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-cocoa-800">
                        {order.id}
                      </span>
                      <span className="mt-1 block truncate text-xs text-cocoa-700/70">
                        {order.customer.name} · {orderDate(order.createdAt)}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <StatusBadge status={order.status} />
                      <span className="text-sm font-semibold text-cocoa-800">
                        {naira(order.total)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-cream-200 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            Shortcuts
          </p>
          <h2 className="mt-1 font-display text-2xl text-cocoa-800">
            Quick actions
          </h2>

          <div className="mt-5 space-y-2">
            {quickActions.map(({ href, label, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl bg-cream-50 p-3 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500"
              >
                <span className="rounded-xl bg-white p-2.5 text-terracotta-600 shadow-sm">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-cocoa-800">
                    {label}
                  </span>
                  <span className="block text-xs text-cocoa-700/70">
                    {description}
                  </span>
                </span>
                <ArrowRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-cocoa-700/60 transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}