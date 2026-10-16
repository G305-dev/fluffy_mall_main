import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Boxes,
  PackageCheck,
  Warehouse,
} from "lucide-react";
import {
  LOW_STOCK_LIMIT,
  stockLevel,
  summarizeInventory,
  toInventoryItems,
} from "@/lib/admin-inventory";
import { getAdminSession } from "@/lib/auth";
import { getOrders, getProducts } from "@/lib/db";
import { getPosSummary } from "@/lib/admin-pos-summary";
import SalesDashboard from "./SalesDashboard";

export const dynamic = "force-dynamic";

const chartColors = ["#ff8200", "#ffad5b", "#ffc98d", "#ffe2bd", "#eadfd2"];

export default async function AdminHome() {
  const staff = await getAdminSession();
  if (staff?.role === "sales_representative") {
    const [products, orders] = await Promise.all([getProducts(), getOrders()]);
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now));
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return (
      <SalesDashboard
        products={products}
        staffName={staff.name}
        greeting={greeting}
        summary={getPosSummary(orders, now)}
      />
    );
  }

  const products = await getProducts();
  const items = toInventoryItems(products);
  const totals = summarizeInventory(items);
  const healthyPercent = totals.options
    ? Math.round((totals.healthy / totals.options) * 100)
    : 0;

  const grouped = new Map<string, { name: string; count: number; units: number }>();
  for (const item of items) {
    const row = grouped.get(item.category) || {
      name: item.categoryLabel,
      count: 0,
      units: 0,
    };
    row.count += 1;
    row.units += item.stock;
    grouped.set(item.category, row);
  }

  const categories = Array.from(grouped.values());
  const byCount = [...categories].sort((a, b) => b.count - a.count);
  const byUnits = [...categories].sort((a, b) => b.units - a.units).slice(0, 6);
  const highestUnits = Math.max(1, ...byUnits.map((row) => row.units));
  const categorySlices = byCount.slice(0, 4).map((row) => ({
    name: row.name,
    count: row.count,
  }));
  if (byCount.length > 4) {
    categorySlices.push({
      name: "Other",
      count: byCount.slice(4).reduce((sum, row) => sum + row.count, 0),
    });
  }

  let cursor = 0;
  const donut = totals.options
    ? `conic-gradient(${categorySlices.map((row, index) => {
        const start = cursor;
        cursor += (row.count / totals.options) * 100;
        return `${chartColors[index]} ${start}% ${cursor}%`;
      }).join(", ")})`
    : "#f1ede8";

  const restock = items
    .filter((item) => stockLevel(item.stock) !== "healthy")
    .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName))
    .slice(0, 4);

  const metrics = [
    {
      label: "Sellable options",
      value: totals.options.toLocaleString("en-NG"),
      detail: `${products.length.toLocaleString("en-NG")} products and their variants`,
      icon: Boxes,
    },
    {
      label: "Stock units",
      value: totals.units.toLocaleString("en-NG"),
      detail: "Current website stock",
      icon: Warehouse,
    },
    {
      label: "Needs restock",
      value: totals.attention.toLocaleString("en-NG"),
      detail: `Out of stock or 1–${LOW_STOCK_LIMIT} left`,
      icon: AlertTriangle,
    },
  ];

  const statusRows = [
    { label: "Healthy", count: totals.healthy, color: "#ff8200" },
    { label: "Low", count: totals.low, color: "#ffc48a" },
    { label: "Out", count: totals.out, color: "#eadfd2" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-orange-600">
            Inventory at a glance
          </p>
          <h1 className="mt-1 font-display text-2xl text-cocoa-800 sm:text-3xl">
            Stock overview
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Live snapshot of products already on the website. Variants count as separate options.
          </p>
        </div>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          Browse inventory <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {metrics.map(({ label, value, detail, icon: Icon }, index) => (
          <section
            key={label}
            className={`min-w-0 rounded-2xl border border-stone-100 p-5 xl:col-span-3 ${
              index === 0 ? "bg-[#fff0df]" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-stone-500">{label}</p>
              <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
                <Icon size={18} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-5 break-words text-2xl font-bold text-cocoa-800 sm:text-3xl">
              {value}
            </p>
            <p className="mt-2 text-xs text-stone-500">{detail}</p>
          </section>
        ))}

        {/* The tall right-hand category panel follows the reference layout. */}
        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 xl:col-span-3 xl:row-span-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-cocoa-800">Top categories</h3>
            <Link href="/admin/inventory" className="text-xs text-stone-500 hover:text-orange-600">
              See all
            </Link>
          </div>
          <div
            className="relative mx-auto mt-7 flex h-44 w-44 items-center justify-center rounded-full"
            style={{ background: donut }}
            role="img"
            aria-label={`${totals.options} sellable options across ${categories.length} categories`}
          >
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="text-xs text-stone-500">Options</span>
              <strong className="text-2xl text-cocoa-800">
                {totals.options.toLocaleString("en-NG")}
              </strong>
            </div>
          </div>
          {categorySlices.length ? (
            <ul className="mt-7 space-y-3">
              {categorySlices.map((row, index) => (
                <li key={row.name} className="flex min-w-0 items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: chartColors[index] }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-stone-600" title={row.name}>
                    {row.name}
                  </span>
                  <strong className="text-cocoa-800">{row.count.toLocaleString("en-NG")}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-7 text-center text-sm text-stone-500">No products yet.</p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 md:col-span-2 xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-cocoa-800">Stock by category</h3>
              <p className="mt-1 text-xs text-stone-500">Current units, not historical sales</p>
            </div>
            <Link href="/admin/inventory" className="text-xs text-orange-600 hover:underline">
              Explore items
            </Link>
          </div>
          {byUnits.length ? (
            <div className="mt-6 space-y-4">
              {byUnits.map((row) => (
                <div key={row.name} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3rem] items-center gap-3 text-xs sm:gap-4">
                  <span className="truncate text-stone-600" title={row.name}>{row.name}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-orange-50">
                    <div
                      className="h-full rounded-full bg-[#ff8200]"
                      style={{ width: `${(row.units / highestUnits) * 100}%` }}
                    />
                  </div>
                  <strong className="text-right text-cocoa-800">
                    {row.units.toLocaleString("en-NG")}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-sm text-stone-500">Add products to see category stock.</p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 xl:col-span-3">
          <h3 className="font-semibold text-cocoa-800">Stock health</h3>
          <p className="mt-1 text-xs text-stone-500">Options with more than {LOW_STOCK_LIMIT} units</p>
          <svg
            viewBox="0 0 220 125"
            className="mx-auto mt-6 h-32 w-full max-w-[220px]"
            role="img"
            aria-label={`${healthyPercent}% of options have more than ${LOW_STOCK_LIMIT} units`}
          >
            <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="#ffe5c7" strokeWidth="20" strokeLinecap="round" />
            <path
              d="M20 110 A90 90 0 0 1 200 110"
              fill="none"
              stroke="#ff8200"
              strokeWidth="20"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${healthyPercent} 100`}
            />
            <text x="110" y="100" textAnchor="middle" fill="#111111" fontSize="29" fontWeight="700">
              {healthyPercent}%
            </text>
          </svg>
          <p className="mt-1 text-center text-xs text-stone-500">
            {totals.healthy.toLocaleString("en-NG")} healthy of {totals.options.toLocaleString("en-NG")} options
          </p>
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 xl:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-cocoa-800">Restock priority</h3>
            <Link href="/admin/inventory?status=attention" className="text-xs text-orange-600 hover:underline">
              View all
            </Link>
          </div>
          {restock.length ? (
            <ul className="mt-5 space-y-3">
              {restock.map((item) => (
                <li key={item.key} className="flex min-w-0 items-center justify-between gap-2 border-b border-stone-100 pb-2 text-xs">
                  <span className="min-w-0 truncate text-stone-600" title={`${item.productName} ${item.variantName}`}>
                    {item.productName}{item.variantName ? ` / ${item.variantName}` : ""}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${
                    item.stock === 0 ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                  }`}>
                    {item.stock.toLocaleString("en-NG")} left
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-7 text-sm text-stone-500">Nothing needs restocking.</p>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 md:col-span-2 xl:col-span-6">
          <h3 className="font-semibold text-cocoa-800">Stock status</h3>
          <p className="mt-1 text-xs text-stone-500">Share of sellable options right now</p>
          <div
            className="mt-8 flex h-5 overflow-hidden rounded-full bg-stone-100"
            role="img"
            aria-label={`${totals.healthy} healthy, ${totals.low} low and ${totals.out} out of stock`}
          >
            {statusRows.map((row) => (
              <div
                key={row.label}
                style={{
                  backgroundColor: row.color,
                  width: `${totals.options ? (row.count / totals.options) * 100 : 0}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {statusRows.map((row) => (
              <div key={row.label} className="border-l-2 pl-3" style={{ borderColor: row.color }}>
                <p className="text-xs text-stone-500">{row.label}</p>
                <p className="mt-1 text-lg font-bold text-cocoa-800">
                  {row.count.toLocaleString("en-NG")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-stone-100 bg-white p-5 xl:col-span-3">
          <div className="flex items-center gap-2">
            <PackageCheck size={18} className="text-orange-600" aria-hidden="true" />
            <h3 className="font-semibold text-cocoa-800">Product barcodes</h3>
          </div>
          <p className="mt-5 text-2xl font-bold text-cocoa-800">
            {totals.coded.toLocaleString("en-NG")}
            <span className="text-sm font-normal text-stone-400"> / {totals.options.toLocaleString("en-NG")}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Sellable products and options with a barcode for in-store checkout.
          </p>
          <Link
            href="/admin/products#product-barcodes"
            className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:underline"
          >
            View product labels <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}