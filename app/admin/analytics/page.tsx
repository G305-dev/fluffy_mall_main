import { getOrders, getProducts } from "@/lib/db";
import { naira } from "@/lib/format";
import { categoryName } from "@/lib/categories";
import { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

/* ---------- helpers ---------- */

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function lastNDays(n: number) {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function isPaid(o: Order) {
  return o.payment.status === "paid";
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending payment",
  awaiting_verification: "Awaiting verification",
  paid: "Paid",
  processing: "Processing",
  out_for_delivery: "Out for delivery",
  awaiting_pickup: "Awaiting pickup",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#d6b25e",
  awaiting_verification: "#e98a5a",
  paid: "#7da87b",
  processing: "#8ea4c8",
  out_for_delivery: "#8ea4c8",
  awaiting_pickup: "#b08ec8",
  completed: "#5d8a5b",
  cancelled: "#c86f6f",
  refunded: "#a8a29e",
};

/* ---------- page ---------- */

export default async function AdminAnalyticsPage() {
  const [orders, products] = await Promise.all([getOrders(), getProducts()]);

  const paidOrders = orders.filter(isPaid);
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = paidOrders.length ? Math.round(totalRevenue / paidOrders.length) : 0;
  const pendingValue = orders
    .filter((o) => !isPaid(o) && o.status !== "cancelled" && o.status !== "refunded")
    .reduce((s, o) => s + o.total, 0);

  /* Revenue by day — last 14 days */
  const days = lastNDays(14);
  const revenueByDay = days.map((day) => ({
    day,
    revenue: paidOrders
      .filter((o) => dayKey(o.payment.paidAt || o.createdAt) === day)
      .reduce((s, o) => s + o.total, 0),
    count: paidOrders.filter((o) => dayKey(o.payment.paidAt || o.createdAt) === day).length,
  }));
  const maxDayRevenue = Math.max(...revenueByDay.map((d) => d.revenue), 1);

  /* Status breakdown */
  const statusCounts = new Map<string, number>();
  for (const o of orders) {
    statusCounts.set(o.status, (statusCounts.get(o.status) || 0) + 1);
  }
  const statusRows = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]);

  /* Payment methods (paid only) */
  const methodTotals = new Map<string, { count: number; revenue: number }>();
  for (const o of paidOrders) {
    const key = o.payment.method === "paystack" ? "Paystack" : "Bank transfer";
    const cur = methodTotals.get(key) || { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += o.total;
    methodTotals.set(key, cur);
  }

  /* Top products by paid revenue */
  const productTotals = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of paidOrders) {
    for (const item of o.items) {
      const cur = productTotals.get(item.productId) || {
        name: item.name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += item.qty;
      cur.revenue += item.unitPrice * item.qty;
      productTotals.set(item.productId, cur);
    }
  }
  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
  const maxProductRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);

  /* Revenue by category */
  const categoryTotals = new Map<string, number>();
  for (const o of paidOrders) {
    for (const item of o.items) {
      const product = products.find((p) => p.id === item.productId);
      const cat = product ? categoryName(product.category) : "Other";
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + item.unitPrice * item.qty);
    }
  }
  const categoryRows = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  const maxCategoryRevenue = Math.max(...categoryRows.map(([, v]) => v), 1);

  /* Fulfilment + stock */
  const deliveryCount = orders.filter((o) => o.fulfilment === "delivery").length;
  const pickupCount = orders.filter((o) => o.fulfilment === "pickup").length;
  const lowStock = products
    .map((p) => ({
      name: p.name,
      stock: p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
    }))
    .filter((p) => p.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  const conversionPaid = orders.length
    ? Math.round((paidOrders.length / orders.length) * 100)
    : 0;

  return (
    <div>
      <h1 className="font-display text-3xl">Analytics</h1>
      <p className="mt-2 text-sm text-cocoa-700/70">
        Sales performance across {orders.length} orders. Revenue counts paid orders only.
      </p>

      {/* KPI cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-cocoa-800 p-5 text-cream-50">
          <p className="text-xs uppercase tracking-widest text-gold-400">Total revenue</p>
          <p className="mt-2 break-words font-display text-2xl sm:text-3xl">{naira(totalRevenue)}</p>
          <p className="mt-1 text-xs text-cream-300">{paidOrders.length} paid orders</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Average order</p>
          <p className="mt-2 break-words font-display text-2xl sm:text-3xl">{naira(avgOrder)}</p>
          <p className="mt-1 text-xs text-cocoa-700/60">per paid order</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Awaiting payment</p>
          <p className="mt-2 break-words font-display text-2xl sm:text-3xl">{naira(pendingValue)}</p>
          <p className="mt-1 text-xs text-cocoa-700/60">open, unpaid orders</p>
        </div>
        <div className="rounded-3xl bg-white p-5 ring-1 ring-cream-200">
          <p className="text-xs uppercase tracking-widest text-gold-600">Paid rate</p>
          <p className="mt-2 font-display text-3xl">{conversionPaid}%</p>
          <p className="mt-1 text-xs text-cocoa-700/60">orders that end up paid</p>
        </div>
      </div>

      {/* Revenue chart — last 14 days */}
      <div className="mt-6 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="font-display text-xl">Revenue · last 14 days</h2>
          <span className="text-xs text-cocoa-700/60">
            {naira(revenueByDay.reduce((s, d) => s + d.revenue, 0))} in period
          </span>
        </div>
        <div className="mt-5 flex h-36 items-end gap-1 sm:h-44 sm:gap-1.5">
          {revenueByDay.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className={`rounded-t-lg transition-all ${
                  d.revenue > 0 ? "bg-terracotta-500" : "bg-cream-200"
                }`}
                style={{
                  height: d.revenue > 0 ? `${Math.max((d.revenue / maxDayRevenue) * 100, 6)}%` : "4px",
                }}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-cocoa-800 px-2 py-1 text-[10px] text-cream-50 group-hover:block">
                {d.day.slice(5)} · {naira(d.revenue)} ({d.count})
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-cocoa-700/50">
          <span>{days[0].slice(5)}</span>
          <span>{days[6].slice(5)}</span>
          <span>{days[13].slice(5)}</span>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
          <h2 className="font-display text-xl">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-cocoa-700/60">No paid orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {topProducts.map((p) => (
                <li key={p.name}>
                  <div className="flex min-w-0 justify-between gap-3 text-sm">
                    <span className="truncate pr-3">{p.name}</span>
                    <span className="shrink-0 font-medium">{naira(p.revenue)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-100">
                      <div
                        className="h-full rounded-full bg-gold-500"
                        style={{ width: `${(p.revenue / maxProductRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[11px] text-cocoa-700/50">
                      ×{p.qty}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Revenue by category */}
        <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
          <h2 className="font-display text-xl">Revenue by category</h2>
          {categoryRows.length === 0 ? (
            <p className="mt-4 text-sm text-cocoa-700/60">No paid orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {categoryRows.map(([cat, revenue]) => (
                <li key={cat}>
                  <div className="flex min-w-0 justify-between gap-3 text-sm">
                    <span>{cat}</span>
                    <span className="shrink-0 font-medium">{naira(revenue)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-cream-100">
                    <div
                      className="h-full rounded-full bg-terracotta-400"
                      style={{ width: `${(revenue / maxCategoryRevenue) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
          <h2 className="font-display text-xl">Orders by status</h2>
          <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full">
            {statusRows.map(([status, count]) => (
              <div
                key={status}
                title={`${STATUS_LABELS[status] || status}: ${count}`}
                style={{
                  width: `${(count / orders.length) * 100}%`,
                  background: STATUS_COLORS[status] || "#ddd",
                }}
              />
            ))}
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {statusRows.map(([status, count]) => (
              <li key={status} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[status] || "#ddd" }}
                />
                <span className="flex-1">{STATUS_LABELS[status] || status}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-cream-100 pt-3 text-sm text-cocoa-700/70">
            Fulfilment: {deliveryCount} delivery · {pickupCount} pickup
          </div>
        </div>

        {/* Payment methods + low stock */}
        <div className="min-w-0 space-y-6">
          <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
            <h2 className="font-display text-xl">Payment methods</h2>
            {methodTotals.size === 0 ? (
              <p className="mt-4 text-sm text-cocoa-700/60">No paid orders yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {Array.from(methodTotals.entries()).map(([method, m]) => (
                  <li key={method} className="flex min-w-0 flex-col items-start gap-1 text-sm min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                    <span>{method}</span>
                    <span className="break-words text-cocoa-700/60 min-[430px]:text-right">
                      {m.count} orders · <span className="font-medium text-cocoa-800">{naira(m.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
            <h2 className="font-display text-xl">Low stock alert</h2>
            {lowStock.length === 0 ? (
              <p className="mt-4 text-sm text-sage-600">All products well stocked. ✓</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {lowStock.map((p) => (
                  <li key={p.name} className="flex min-w-0 flex-col items-start gap-1 text-sm min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
                    <span className="truncate pr-3">{p.name}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.stock === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
