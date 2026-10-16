import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle, BarChart3, Boxes, CalendarDays, ChevronDown, LayoutDashboard,
  Package, RefreshCw, ShoppingBag, SlidersHorizontal, TrendingUp, Users,
} from "lucide-react";
import { getOrders, getProducts } from "@/lib/db";
import { getDb, COLLECTIONS } from "@/lib/mongo";
import { getProductCosts } from "@/lib/product-costs";
import { getAdminCategories } from "@/lib/admin-categories";
import { categoryName } from "@/lib/categories";
import { LOW_STOCK_LIMIT, stockLevel } from "@/lib/admin-inventory";
import { STATUS_LABEL } from "@/lib/status";
import { naira } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import ExportReport from "./ExportReport";

export const dynamic = "force-dynamic";

type Tab = "overview" | "sales" | "inventory" | "movement" | "performance" | "low-stock" | "custom";
type Period = "7" | "30" | "90" | "all" | "custom";
type StockRow = {
  key: string; productId: string; product: string; option: string; category: string;
  categorySlug: string; barcode: string; stock: number; unit: string;
  cost?: number; value: number | null; image: string;
};
type SalesRow = { id: string; name: string; category: string; units: number; revenue: number; image: string };
type Bucket = { day: string; orders: number; revenue: number };

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sales", label: "Sales report", icon: TrendingUp },
  { id: "inventory", label: "Inventory report", icon: Boxes },
  { id: "movement", label: "Stock movement", icon: RefreshCw },
  { id: "performance", label: "Product performance", icon: BarChart3 },
  { id: "low-stock", label: "Low stock report", icon: AlertTriangle },
  { id: "custom", label: "Custom reports", icon: SlidersHorizontal },
] as const;
const COLORS = ["#ff8200", "#059669", "#f59e0b", "#a855f7", "#e11d48", "#94a3b8"];
const PLACEHOLDER = "/images/product-placeholder.svg";
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
});
const prettyFormat = new Intl.DateTimeFormat("en-NG", {
  timeZone: "UTC", year: "numeric", month: "short", day: "numeric",
});

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) || "";
}
function dayKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(dateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function diffDays(start: string, end: string) {
  return Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000);
}
function pretty(day: string) {
  return prettyFormat.format(new Date(`${day}T12:00:00Z`));
}
function dateField(value: string, fallback: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : fallback;
}
function inRange(iso: string, start: string, end: string, all: boolean) {
  const day = dayKey(iso);
  return Boolean(day && (all || (day >= start && day <= end)));
}
function isSale(order: Order) {
  return order.payment.status === "paid" && order.status !== "cancelled" && order.status !== "refunded";
}
function saleDate(order: Order) {
  return order.payment.paidAt || order.createdAt;
}
function compare(current: number, prior: number | null) {
  if (prior === null) return "For selected dates";
  if (prior === 0) return current ? "New since previous period" : "No change";
  const change = Math.round((current - prior) * 100 / prior);
  return `${change > 0 ? "+" : ""}${change}% vs previous period`;
}
function csvCell(value: string | number) {
  // Preserve numeric types, including negative stock, in spreadsheet exports.
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = value.replace(/[\r\n]+/g, " ");
  // Prevent a product name or order id from becoming a spreadsheet formula.
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
function csv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function Card({ label, value, detail, icon: Icon }: {
  label: string; value: string; detail: string; icon: typeof ShoppingBag;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700">
          <Icon size={21} aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-stone-600">{label}</span>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-cocoa-800">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{detail}</p>
    </div>
  );
}

function SalesChart({ buckets, label }: { buckets: Bucket[]; label: string }) {
  const maxRevenue = Math.max(1, ...buckets.map((bucket) => bucket.revenue));
  const maxOrders = Math.max(1, ...buckets.map((bucket) => bucket.orders));
  const x = (i: number) => 55 + i * 660 / Math.max(1, buckets.length - 1);
  const revenueY = (n: number) => 170 - n * 135 / maxRevenue;
  const ordersY = (n: number) => 170 - n * 135 / maxOrders;
  const labels = Array.from(new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]));
  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-cocoa-800">Sales overview</h2>
        <div className="flex gap-3 text-xs text-stone-600">
          <span><span className="mr-1 text-orange-600">●</span>Paid revenue (₦)</span>
          <span><span className="mr-1 text-emerald-600">●</span>Order count</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-stone-500">{label} · separate scales for revenue and orders</p>
      {buckets.every((b) => b.revenue === 0 && b.orders === 0) ? (
        <p className="grid h-56 place-items-center text-sm text-stone-500">No order or sales activity in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg viewBox="0 0 770 220" role="img" aria-label={`Revenue and order trends for ${label}`} className="h-auto min-w-[480px] w-full">
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <line x1="55" x2="715" y1={35 + i * 45} y2={35 + i * 45} stroke="#e7e5e4" />
                <text x="48" y={39 + i * 45} textAnchor="end" fill="#78716c" fontSize="10">
                  {Math.round(maxRevenue * (3 - i) / 3 / 1000)}k
                </text>
                <text x="722" y={39 + i * 45} fill="#78716c" fontSize="10">
                  {Math.round(maxOrders * (3 - i) / 3)}
                </text>
              </g>
            ))}
            <polyline points={buckets.map((b, i) => `${x(i)},${revenueY(b.revenue)}`).join(" ")} fill="none" stroke="#ff8200" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={buckets.map((b, i) => `${x(i)},${ordersY(b.orders)}`).join(" ")} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {buckets.length === 1 && <><circle cx={x(0)} cy={revenueY(buckets[0].revenue)} r="4" fill="#ff8200" /><circle cx={x(0)} cy={ordersY(buckets[0].orders)} r="4" fill="#059669" /></>}
            {labels.map((i) => (
              <text key={i} x={x(i)} y="208" textAnchor={i === 0 ? "start" : i === buckets.length - 1 ? "end" : "middle"} fill="#78716c" fontSize="11">
                {pretty(buckets[i].day)}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

function Donut({ title, center, caption, segments }: {
  title: string; center: string; caption: string;
  segments: Array<{ label: string; amount: number; display: string }>;
}) {
  const total = segments.reduce((sum, item) => sum + item.amount, 0);
  let cursor = 0;
  const gradient = total ? `conic-gradient(${segments.filter((item) => item.amount > 0).map((item, index) => {
    const from = cursor;
    cursor += item.amount * 100 / total;
    return `${COLORS[index % COLORS.length]} ${from}% ${cursor}%`;
  }).join(", ")})` : "#f5f5f4";
  return (
    <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 lg:col-span-5">
      <h2 className="font-display text-lg text-cocoa-800">{title}</h2>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-5 xl:flex-nowrap">
        <div className="grid h-40 w-40 shrink-0 place-items-center rounded-full" style={{ background: gradient }} role="img" aria-label={`${title}: ${segments.map((s) => `${s.label} ${s.display}`).join(", ")}`}>
          <div className="grid h-24 w-24 place-content-center rounded-full bg-white text-center">
            <strong className="break-words text-lg text-cocoa-800">{center}</strong>
            <span className="text-[11px] text-stone-500">{caption}</span>
          </div>
        </div>
        <ul className="min-w-[12rem] flex-1 space-y-2 text-xs">
          {segments.map((item, i) => (
            <li key={item.label} className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="min-w-0 flex-1 truncate text-stone-600" title={item.label}>{item.label}</span>
              <span className="shrink-0 font-semibold text-cocoa-800">{total ? Math.round(item.amount * 100 / total) : 0}% · {item.display}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StockTable({ rows, costs = false }: { rows: StockRow[]; costs?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-stone-50 text-xs text-stone-600">
          <tr>
            <th className="px-4 py-3">Product / option</th><th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Barcode</th><th className="px-4 py-3 text-right">Stock</th>
            <th className="px-4 py-3">Status</th>
            {costs && <th className="px-4 py-3 text-right">Known cost value</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.slice(0, 50).map((row) => (
            <tr key={row.key} className="hover:bg-orange-50/40">
              <td className="max-w-52 px-4 py-3"><span className="block truncate font-semibold text-cocoa-800" title={row.product}>{row.product}</span><span className="block truncate text-xs text-stone-500">{row.option}</span></td>
              <td className="px-4 py-3 text-stone-600">{row.category}</td>
              <td className="break-all px-4 py-3 font-mono text-xs">{row.barcode || "—"}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.stock.toLocaleString("en-NG")} {row.unit}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${row.stock <= 0 ? "bg-red-50 text-red-700" : row.stock <= LOW_STOCK_LIMIT ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>{row.stock <= 0 ? "Out" : row.stock <= LOW_STOCK_LIMIT ? "Low" : "In stock"}</span></td>
              {costs && <td className="px-4 py-3 text-right">{row.value === null ? "Cost not set" : naira(row.value)}</td>}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={costs ? 6 : 5} className="px-5 py-10 text-center text-stone-500">No products match these filters.</td></tr>}
        </tbody>
      </table>
      {rows.length > 50 && <p className="border-t border-stone-100 px-4 py-3 text-xs text-stone-500">Showing the first 50 of {rows.length} options. Export CSV for the full list.</p>}
    </div>
  );
}

function ProductTable({ rows, empty }: { rows: SalesRow[]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead className="bg-stone-50 text-xs text-stone-600"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Units sold</th><th className="px-4 py-3 text-right">Item revenue</th></tr></thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((row, i) => (
            <tr key={row.id}><td className="px-4 py-3 text-stone-500">{i + 1}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><Image src={row.image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" /><span className="max-w-44 truncate font-semibold text-cocoa-800" title={row.name}>{row.name}</span></div></td>
              <td className="px-4 py-3 text-stone-600">{row.category}</td>
              <td className="px-4 py-3 text-right">{row.units.toLocaleString("en-NG")}</td>
              <td className="px-4 py-3 text-right">{naira(row.revenue)}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [orders, products, categories] = await Promise.all([getOrders(), getProducts(), getAdminCategories()]);
  const [costs, customerDocs] = await Promise.all([
    getProductCosts(products.map((product) => product.id)),
    getDb().then((db) => db.collection<{ createdAt?: string }>(COLLECTIONS.CUSTOMERS)
      .find({}, { projection: { _id: 0, createdAt: 1 } }).toArray()),
  ]);
  const customerDates = customerDocs.map((doc) => doc.createdAt || "");
  const now = dayKey(new Date().toISOString());
  const recentStart = shiftDay(now, -29);
  const allKeys = [now, ...orders.flatMap((order) => [dayKey(order.createdAt), dayKey(saleDate(order))]), ...customerDates.map(dayKey)].filter(Boolean).sort();
  const defaultPeriod: Period = orders.some((order) => inRange(order.createdAt, recentStart, now, false)) ? "30" : "all";
  const rawTab = first(searchParams.tab);
  const tab: Tab = TABS.find((item) => item.id === rawTab)?.id || "overview";
  const requestedPeriod = first(searchParams.period);
  const period: Period = ["7", "30", "90", "all", "custom"].includes(requestedPeriod) ? requestedPeriod as Period : defaultPeriod;
  const from = dateField(first(searchParams.from), recentStart);
  const to = dateField(first(searchParams.to), now);
  const start = period === "all" ? allKeys[0] : period === "custom" ? from : shiftDay(now, 1 - Number(period));
  const end = period === "all" ? allKeys[allKeys.length - 1] : period === "custom" ? to : now;
  const invalidDates = start > end;
  const all = period === "all";
  const selectedOrders = invalidDates ? [] : orders.filter((order) => inRange(order.createdAt, start, end, all));
  const paidOrders = invalidDates ? [] : orders.filter((order) => isSale(order) && inRange(saleDate(order), start, end, all));
  const newCustomers = invalidDates ? 0 : customerDates.filter((date) => inRange(date, start, end, all)).length;
  const sales = paidOrders.reduce((total, order) => total + order.total, 0);
  const unitsSold = paidOrders.reduce((total, order) => total + order.items.reduce((n, item) => n + item.qty, 0), 0);
  const span = invalidDates ? 0 : diffDays(start, end) + 1;
  const previousStart = all || invalidDates ? "" : shiftDay(start, -span);
  const previousEnd = all || invalidDates ? "" : shiftDay(start, -1);
  const previousOrders = all || invalidDates ? null : orders.filter((order) => inRange(order.createdAt, previousStart, previousEnd, false));
  const previousPaid = all || invalidDates ? null : orders.filter((order) => isSale(order) && inRange(saleDate(order), previousStart, previousEnd, false));
  const priorSales = previousPaid?.reduce((sum, order) => sum + order.total, 0) ?? null;
  const priorUnits = previousPaid?.reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.qty, 0), 0) ?? null;
  const priorCustomers = all || invalidDates ? null : customerDates.filter((date) => inRange(date, previousStart, previousEnd, false)).length;
  const labels = new Map(categories.map((category) => [category.slug, category.name]));
  const byId = new Map(products.map((product) => [product.id, product]));
  const labelOf = (slug: string) => labels.get(slug) || categoryName(slug);

  // Preserve actual negative and one-unit quantities in admin reports.
  const stockRows: StockRow[] = products.flatMap((product) => {
    const unit = product.unit || "pcs";
    const cost = costs[product.id]; // Zero is a known cost; undefined means not recorded.
    const makeRow = (option: string, id: string, qty: number, barcode: string, image: string): StockRow => ({
      key: `${product.id}:${id}`, productId: product.id, product: product.name, option,
      category: labelOf(product.category), categorySlug: product.category, barcode, stock: qty, unit,
      cost, value: cost === undefined ? null : Math.max(0, qty) * cost, image: image || PLACEHOLDER,
    });
    return product.variants?.length
      ? product.variants.map((variant) => makeRow(variant.name, variant.id, variant.stock, variant.barcode || "", variant.image || product.images?.[0] || PLACEHOLDER))
      : [makeRow("", "standard", product.stock, product.barcode || "", product.images?.[0] || PLACEHOLDER)];
  });
  const inStock = stockRows.filter((row) => stockLevel(row.stock) === "healthy").length;
  const low = stockRows.filter((row) => stockLevel(row.stock) === "low").length;
  const out = stockRows.filter((row) => stockLevel(row.stock) === "out").length;
  const missingCost = stockRows.filter((row) => row.value === null).length;
  const valuation = stockRows.reduce((total, row) => total + (row.value ?? 0), 0);
  const productStock = new Map<string, number>();
  for (const row of stockRows) productStock.set(row.productId, (productStock.get(row.productId) || 0) + Math.max(0, row.stock));

  const productSales = new Map<string, SalesRow>();
  const categorySales = new Map<string, number>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const product = byId.get(item.productId);
      const id = item.productId || item.name;
      const category = product ? labelOf(product.category) : "Other / removed";
      const itemValue = item.unitPrice * item.qty; // Item value excludes delivery and order-level discounts.
      const current = productSales.get(id) || { id, name: product?.name || item.name, category, units: 0, revenue: 0, image: product?.images?.[0] || item.image || PLACEHOLDER };
      current.units += item.qty;
      current.revenue += itemValue;
      productSales.set(id, current);
      categorySales.set(category, (categorySales.get(category) || 0) + itemValue);
    }
  }
  const top = Array.from(productSales.values()).sort((a, b) => b.units - a.units || b.revenue - a.revenue);
  const slow = products.filter((product) => (productStock.get(product.id) || 0) > 0).map((product) => ({
    id: product.id, name: product.name, category: labelOf(product.category),
    units: productSales.get(product.id)?.units || 0, revenue: productSales.get(product.id)?.revenue || 0,
    image: product.images?.[0] || PLACEHOLDER,
  })).sort((a, b) => a.units - b.units || a.name.localeCompare(b.name));
  const categoriesBySales = Array.from(categorySales.entries()).sort((a, b) => b[1] - a[1]);
  const categorySegments = categoriesBySales.slice(0, 5).map(([label, amount]) => ({ label, amount, display: naira(amount) }));
  const rest = categoriesBySales.slice(5).reduce((sum, [, value]) => sum + value, 0);
  if (rest) categorySegments.push({ label: "Other", amount: rest, display: naira(rest) });
  const itemRevenue = categorySegments.reduce((sum, item) => sum + item.amount, 0);
  const lowRows = stockRows.filter((row) => row.stock <= LOW_STOCK_LIMIT).sort((a, b) => a.stock - b.stock || a.product.localeCompare(b.product));

  const totalDays = Math.max(1, diffDays(start, end) + 1);
  const bucketCount = Math.min(totalDays, totalDays <= 31 ? totalDays : 12);
  const buckets: Bucket[] = Array.from({ length: bucketCount }, (_, i) => ({ day: shiftDay(start, Math.floor(i * totalDays / bucketCount)), orders: 0, revenue: 0 }));
  for (const order of selectedOrders) {
    const index = Math.min(bucketCount - 1, Math.floor(diffDays(start, dayKey(order.createdAt)) * bucketCount / totalDays));
    if (index >= 0) buckets[index].orders += 1;
  }
  for (const order of paidOrders) {
    const index = Math.min(bucketCount - 1, Math.floor(diffDays(start, dayKey(saleDate(order))) * bucketCount / totalDays));
    if (index >= 0) buckets[index].revenue += order.total;
  }
  const dateLabel = invalidDates ? "Choose valid dates" : all ? "All time" : `${pretty(start)} – ${pretty(end)}`;
  function href(next: Tab) {
    const params = new URLSearchParams({ tab: next, period, from, to });
    return `/admin/reports?${params.toString()}`;
  }
  const sectionClass = "min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5";

  const requestedCategory = first(searchParams.category);
  const category = categories.some((item) => item.slug === requestedCategory) ? requestedCategory : "";
  const requestedProduct = first(searchParams.product);
  const productId = byId.has(requestedProduct) ? requestedProduct : "";
  const requestedStatus = first(searchParams.status);
  const status = Object.prototype.hasOwnProperty.call(STATUS_LABEL, requestedStatus) ? requestedStatus as OrderStatus : "";
  const requestedMethod = first(searchParams.method);
  const method = requestedMethod === "paystack" || requestedMethod === "bank" ? requestedMethod : "";
  const q = first(searchParams.q).trim().slice(0, 100).toLowerCase();
  const customOrders = selectedOrders.filter((order) =>
    (!status || order.status === status) && (!method || order.payment.method === method) &&
    (!category || order.items.some((item) => byId.get(item.productId)?.category === category)) &&
    (!productId || order.items.some((item) => item.productId === productId)) &&
    (!q || [order.id, order.customer.name, ...order.items.map((item) => item.name)].join(" ").toLowerCase().includes(q))
  );
  const customStock = stockRows.filter((row) =>
    (!category || row.categorySlug === category) && (!productId || row.productId === productId) &&
    (!q || `${row.product} ${row.option} ${row.barcode}`.toLowerCase().includes(q))
  );
  const inventoryRows = stockRows.filter((row) => !category || row.categorySlug === category);
  const reportStock = tab === "low-stock" ? lowRows.filter((row) => !category || row.categorySlug === category) : inventoryRows;
  const stockHeader = ["Product", "Option", "Category", "Barcode", "Stock", "Unit", "Purchase cost (NGN)", "Known cost value (NGN)"];
  const stockExport = (rows: StockRow[]) => rows.map((row) => [row.product, row.option, row.category, row.barcode, row.stock, row.unit, row.cost === undefined ? "Not recorded" : row.cost, row.value === null ? "Not recorded" : row.value]);
  let exportRows: Array<Array<string | number>>;
  if (tab === "inventory" || tab === "low-stock") exportRows = [stockHeader, ...stockExport(reportStock)];
  else if (tab === "sales") exportRows = [["Period start", "Orders placed", "Paid revenue (NGN)"], ...buckets.map((bucket) => [bucket.day, bucket.orders, bucket.revenue])];
  else if (tab === "movement") exportRows = [["Movement", "Product", "Units", "Notes"],
    ["Incoming", "", "Not recorded", "No receipt ledger"],
    ...top.map((item) => ["Sold (paid orders)", item.name, item.units, "Excludes refunded/cancelled orders"]),
    ["Returns", "", "Not recorded", "No return ledger"], ["Adjustments", "", "Not recorded", "No adjustment ledger"]];
  else if (tab === "performance") exportRows = [["Product", "Category", "Units sold", "Item revenue (NGN)", "Positive stock on hand"],
    ...products.map((product) => [product.name, labelOf(product.category), productSales.get(product.id)?.units || 0, productSales.get(product.id)?.revenue || 0, productStock.get(product.id) || 0]),
    ...top.filter((item) => !byId.has(item.id)).map((item) => [item.name, item.category, item.units, item.revenue, 0])];
  else if (tab === "custom") exportRows = [["Type", "Date", "Product / order", "Category", "Status", "Units", "Amount (NGN)", "Current stock"],
    ...customOrders.map((order) => ["Order", order.createdAt, order.id, "", STATUS_LABEL[order.status], order.items.reduce((sum, item) => sum + item.qty, 0), order.total, ""]),
    ...customStock.map((row) => ["Current stock", "Live snapshot", row.option ? `${row.product} / ${row.option}` : row.product, row.category, stockLevel(row.stock), "", row.value === null ? "Cost not recorded" : row.value, row.stock])];
  else exportRows = [["Metric", "Value", "Period"], ["Total sales (paid NGN)", sales, dateLabel], ["Orders placed", selectedOrders.length, dateLabel],
    ["Units sold in paid orders", unitsSold, dateLabel], ["New customer accounts", newCustomers, dateLabel], ["Known-cost stock value (NGN)", valuation, "Current snapshot"]];
  const csvContent = csv(exportRows);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Business insights</p>
          <h1 className="mt-1 font-display text-3xl text-cocoa-800">Reports</h1>
          <p className="mt-1 text-sm text-stone-600">Sales, inventory and product performance from your store data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <CalendarDays size={17} aria-hidden="true" /><span>{dateLabel}</span><ChevronDown size={15} aria-hidden="true" />
            </summary>
            <form action="/admin/reports" method="get" className="absolute right-0 z-30 mt-2 grid w-[min(19rem,calc(100vw-2rem))] gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xl">
              <input type="hidden" name="tab" value={tab} />
              {tab === "custom" && <><input type="hidden" name="category" value={category} /><input type="hidden" name="product" value={productId} /><input type="hidden" name="status" value={status} /><input type="hidden" name="method" value={method} /><input type="hidden" name="q" value={q} /></>}
              {(tab === "inventory" || tab === "low-stock") && <input type="hidden" name="category" value={category} />}
              <label className="text-xs font-medium text-stone-600">Period
                <select name="period" defaultValue={period} className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
                  <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
                  <option value="all">All time</option><option value="custom">Custom dates (below)</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-stone-600">From<input name="from" type="date" defaultValue={from} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm" /></label>
                <label className="text-xs text-stone-600">To<input name="to" type="date" defaultValue={to} className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm" /></label>
              </div>
              <button type="submit" className="rounded-lg bg-[#ff8200] px-3 py-2 text-sm font-semibold text-white">Apply dates</button>
            </form>
          </details>
          <ExportReport csv={csvContent} filename={`fluffy-mall-${tab}-${all ? "all-time" : `${start}-to-${end}`}.csv`} />
        </div>
      </div>
      {invalidDates && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">The start date must be before or equal to the end date. Change the date range above.</p>}
      <nav aria-label="Report views" className="flex overflow-x-auto border-b border-stone-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={href(id)} aria-current={tab === id ? "page" : undefined} className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${tab === id ? "border-orange-500 text-orange-700" : "border-transparent text-stone-600 hover:text-orange-700"}`}>
            <Icon size={15} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card label="Total sales" value={naira(sales)} detail={compare(sales, priorSales)} icon={ShoppingBag} />
          <Card label="Total orders" value={selectedOrders.length.toLocaleString("en-NG")} detail={compare(selectedOrders.length, previousOrders?.length ?? null)} icon={Package} />
          <Card label="Products sold" value={unitsSold.toLocaleString("en-NG")} detail={compare(unitsSold, priorUnits)} icon={Boxes} />
          <Card label="New customers" value={newCustomers.toLocaleString("en-NG")} detail={compare(newCustomers, priorCustomers)} icon={Users} />
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <SalesChart buckets={buckets} label={dateLabel} />
          <Donut title="Sales by category" center={naira(itemRevenue)} caption="Item revenue" segments={categorySegments} />
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <section className={`${sectionClass} lg:col-span-5`}><h2 className="font-display text-lg text-cocoa-800">Top-selling products</h2>
            <div className="mt-3"><ProductTable rows={top.slice(0, 5)} empty="No paid product sales in this period." /></div>
            <Link href={href("performance")} className="mt-3 inline-block text-xs font-semibold text-orange-700 hover:underline">View product performance →</Link>
          </section>
          <section className={`${sectionClass} lg:col-span-3`}><h2 className="font-display text-lg text-cocoa-800">Stock status</h2>
            <div className="mx-auto mt-5 grid h-36 w-36 place-items-center rounded-full" style={{ background: stockRows.length ? `conic-gradient(#059669 0% ${inStock * 100 / stockRows.length}%, #f59e0b ${inStock * 100 / stockRows.length}% ${(inStock + low) * 100 / stockRows.length}%, #e11d48 ${(inStock + low) * 100 / stockRows.length}% 100%)` : "#f5f5f4" }} role="img" aria-label={`${inStock} in stock, ${low} low, ${out} out of stock`}>
              <div className="grid h-24 w-24 place-content-center rounded-full bg-white text-center"><strong className="text-2xl text-cocoa-800">{stockRows.length}</strong><span className="text-xs text-stone-500">Sellable options</span></div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><strong className="block text-lg">{inStock}</strong>In stock</span><span className="rounded-lg bg-orange-50 p-2 text-orange-700"><strong className="block text-lg">{low}</strong>Low</span><span className="rounded-lg bg-red-50 p-2 text-red-700"><strong className="block text-lg">{out}</strong>Out</span></div>
          </section>
          <section className={`${sectionClass} lg:col-span-4`}><h2 className="font-display text-lg text-cocoa-800">Available reports</h2>
            <p className="mt-1 text-xs text-stone-500">Live views; no saved-report history is stored.</p>
            <ul className="mt-3 divide-y divide-stone-100">{TABS.filter((item) => item.id !== "overview" && item.id !== "custom").map(({ id, label, icon: Icon }) => <li key={id} className="flex items-center gap-2 py-2.5 text-sm"><Icon size={17} className="text-orange-600" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{label}</span><Link href={href(id)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50">View</Link></li>)}</ul>
          </section>
        </div>
        <p className="text-xs text-stone-500">Sales count paid, non-cancelled/non-refunded orders by payment date. Category totals sum item prices before delivery and order-level discounts. New customers counts accounts created in the period. Stock is a current snapshot, not a historical stock value.</p>
      </>}

      {tab === "sales" && <>
        <div className="grid gap-3 sm:grid-cols-3"><Card label="Paid sales" value={naira(sales)} detail={compare(sales, priorSales)} icon={ShoppingBag} /><Card label="Orders placed" value={selectedOrders.length.toLocaleString("en-NG")} detail={compare(selectedOrders.length, previousOrders?.length ?? null)} icon={Package} /><Card label="Units sold" value={unitsSold.toLocaleString("en-NG")} detail={compare(unitsSold, priorUnits)} icon={Boxes} /></div>
        <div className="grid gap-4 lg:grid-cols-12"><SalesChart buckets={buckets} label={dateLabel} /><Donut title="Sales by category" center={naira(itemRevenue)} caption="Item revenue" segments={categorySegments} /></div>
        <section className={sectionClass}><h2 className="font-display text-lg text-cocoa-800">Sales and order trend data</h2><p className="mt-1 text-xs text-stone-500">Orders by creation date; paid sales by payment date (or order date when payment timestamp is unavailable).</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[450px] text-sm"><thead className="bg-stone-50 text-left text-xs text-stone-600"><tr><th className="px-3 py-2">Period starts</th><th className="px-3 py-2 text-right">Orders</th><th className="px-3 py-2 text-right">Paid revenue</th></tr></thead><tbody className="divide-y divide-stone-100">{buckets.map((bucket) => <tr key={bucket.day}><td className="px-3 py-2">{pretty(bucket.day)}</td><td className="px-3 py-2 text-right">{bucket.orders}</td><td className="px-3 py-2 text-right">{naira(bucket.revenue)}</td></tr>)}</tbody></table></div>
        </section>
      </>}

      {tab === "inventory" && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Sellable options" value={stockRows.length.toLocaleString("en-NG")} detail="Current website inventory" icon={Boxes} /><Card label="Stock units" value={stockRows.reduce((n, row) => n + row.stock, 0).toLocaleString("en-NG")} detail="Negative quantities remain visible" icon={Package} /><Card label="Known-cost valuation" value={naira(valuation)} detail={`${missingCost} options have no saved cost`} icon={ShoppingBag} /><Card label="Needs attention" value={(low + out).toLocaleString("en-NG")} detail={`Out or 1–${LOW_STOCK_LIMIT} units left`} icon={AlertTriangle} /></div>
        <p className="text-xs text-stone-500">Live snapshot, not filtered by date. Known-cost value uses the parent product purchase cost for each option and positive on-hand stock only; negative stock remains visible below and is not valued as an asset. Unknown costs are not assumed to be zero.</p>
        <form action="/admin/reports" className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4"><input type="hidden" name="tab" value={tab} /><input type="hidden" name="period" value={period} /><input type="hidden" name="from" value={from} /><input type="hidden" name="to" value={to} /><label className="text-xs text-stone-600">Category<select name="category" defaultValue={category} className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><button className="rounded-lg bg-[#ff8200] px-4 py-2 text-sm font-semibold text-white">Apply</button></form>
        <StockTable rows={reportStock} costs />
      </>}

      {tab === "movement" && <>
        <p className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">The website stores current stock and orders, but does not keep a stock-event ledger. Incoming receipts, physical returns and manual adjustments cannot be reconstructed from current quantities. No history is invented here.</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Incoming stock" value="Not recorded" detail="No receipt ledger" icon={Package} /><Card label="Sold units" value={unitsSold.toLocaleString("en-NG")} detail="Paid, non-refunded orders" icon={ShoppingBag} /><Card label="Returns" value="Not recorded" detail="Refunds do not prove a physical return" icon={RefreshCw} /><Card label="Adjustments" value="Not recorded" detail="No adjustment ledger" icon={SlidersHorizontal} /></div>
        <section className={sectionClass}><h2 className="font-display text-lg text-cocoa-800">Sold items in selected period</h2><p className="mt-1 text-xs text-stone-500">Inferred from currently paid, non-cancelled, non-refunded orders. This is not a full stock movement history.</p><div className="mt-3"><ProductTable rows={top.slice(0, 20)} empty="No paid items in this period." /></div></section>
      </>}

      {tab === "performance" && <>
        <div className="grid gap-3 sm:grid-cols-3"><Card label="Units sold" value={unitsSold.toLocaleString("en-NG")} detail="Paid orders in selected dates" icon={Boxes} /><Card label="Products with sales" value={productSales.size.toLocaleString("en-NG")} detail="Includes removed catalogue products" icon={Package} /><Card label="Item revenue" value={naira(itemRevenue)} detail="Before delivery and discounts" icon={ShoppingBag} /></div>
        <div className="grid gap-4 xl:grid-cols-2"><section className="min-w-0"><h2 className="mb-3 font-display text-xl text-cocoa-800">Best-selling products</h2><ProductTable rows={top.slice(0, 10)} empty="No paid product sales in this period." /></section><section className="min-w-0"><h2 className="mb-3 font-display text-xl text-cocoa-800">Slow-moving products</h2><ProductTable rows={slow.slice(0, 10)} empty="No products with stock on hand." /><p className="mt-2 text-xs text-stone-500">Products with positive stock, ordered by the fewest units sold in the selected dates.</p></section></div>
      </>}

      {tab === "low-stock" && <>
        <div className="grid gap-3 sm:grid-cols-3"><Card label="Out of stock" value={out.toLocaleString("en-NG")} detail="Includes recorded negative quantities" icon={AlertTriangle} /><Card label="Low stock" value={low.toLocaleString("en-NG")} detail={`1–${LOW_STOCK_LIMIT} units`} icon={Package} /><Card label="Needs attention" value={(out + low).toLocaleString("en-NG")} detail="Sellable options, not parents" icon={Boxes} /></div>
        <p className="text-xs text-stone-500">Live stock snapshot. Product options count separately; existing negative quantities are displayed, never silently changed.</p>
        <form action="/admin/reports" className="flex flex-wrap items-end gap-3 rounded-2xl border border-stone-200 bg-white p-4"><input type="hidden" name="tab" value={tab} /><input type="hidden" name="period" value={period} /><input type="hidden" name="from" value={from} /><input type="hidden" name="to" value={to} /><label className="text-xs text-stone-600">Category<select name="category" defaultValue={category} className="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label><button className="rounded-lg bg-[#ff8200] px-4 py-2 text-sm font-semibold text-white">Apply</button></form>
        <StockTable rows={reportStock} />
      </>}

      {tab === "custom" && <>
        <form action="/admin/reports" method="get" className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"><input type="hidden" name="tab" value={tab} /><input type="hidden" name="period" value={period} /><input type="hidden" name="from" value={from} /><input type="hidden" name="to" value={to} />
          <label className="text-xs text-stone-600">Category<select name="category" defaultValue={category} className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
          <label className="text-xs text-stone-600">Product<select name="product" defaultValue={productId} className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All products</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-xs text-stone-600">Order status<select name="status" defaultValue={status} className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="text-xs text-stone-600">Payment method<select name="method" defaultValue={method} className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">All methods</option><option value="paystack">Paystack</option><option value="bank">Bank transfer</option></select></label>
          <label className="text-xs text-stone-600">Search<input name="q" type="search" defaultValue={q} placeholder="Order, customer or product" className="mt-1 block w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" /></label>
          <button type="submit" className="self-end rounded-lg bg-[#ff8200] px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-3"><Card label="Matching orders" value={customOrders.length.toLocaleString("en-NG")} detail="By order date and filters" icon={Package} /><Card label="Paid order value" value={naira(customOrders.filter(isSale).reduce((sum, order) => sum + order.total, 0))} detail="Matching orders only" icon={ShoppingBag} /><Card label="Matching stock options" value={customStock.length.toLocaleString("en-NG")} detail="Current snapshot" icon={Boxes} /></div>
        <section className={sectionClass}><h2 className="font-display text-lg text-cocoa-800">Matching orders</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[590px] text-left text-sm"><thead className="bg-stone-50 text-xs text-stone-600"><tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Customer</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody className="divide-y divide-stone-100">{customOrders.slice(0, 50).map((order) => <tr key={order.id}><td className="px-3 py-2"><Link href={`/admin/orders/${encodeURIComponent(order.id)}`} className="text-orange-700 hover:underline">{order.id}</Link></td><td className="px-3 py-2">{order.customer.name}</td><td className="px-3 py-2">{STATUS_LABEL[order.status]}</td><td className="px-3 py-2 text-right">{naira(order.total)}</td></tr>)}{!customOrders.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-stone-500">No orders match.</td></tr>}</tbody></table></div>{customOrders.length > 50 && <p className="mt-2 text-xs text-stone-500">Showing first 50; export for all.</p>}</section>
        <section><h2 className="mb-3 font-display text-lg text-cocoa-800">Matching current stock</h2><StockTable rows={customStock} /><p className="mt-2 text-xs text-stone-500">Stock is current and not historically filtered by dates or order status. Export CSV includes all matching rows.</p></section>
      </>}
    </div>
  );
}