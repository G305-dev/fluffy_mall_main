import Link from "next/link";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProducts } from "@/lib/db";
import { naira } from "@/lib/format";
import {
  LOW_STOCK_LIMIT,
  stockLevel,
  summarizeInventory,
  toInventoryItems,
  type StockLevel,
} from "@/lib/admin-inventory";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
type Filter = StockLevel | "attention" | "all";

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) || "";
}

function statusBadge(stock: number) {
  const status = stockLevel(stock);
  const styles = {
    healthy: "bg-green-50 text-green-700",
    low: "bg-orange-50 text-orange-700",
    out: "bg-red-50 text-red-700",
  };
  const labels = { healthy: "Healthy", low: "Low stock", out: "Out of stock" };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [products, categories] = await Promise.all([getProducts(), getAdminCategories()]);
  const items = toInventoryItems(products);
  const totals = summarizeInventory(items);

  const q = first(searchParams.q).trim().slice(0, 100);
  const requestedStatus = first(searchParams.status);
  const status: Filter = ["healthy", "low", "out", "attention"].includes(requestedStatus)
    ? (requestedStatus as Filter)
    : "all";
  const requestedCategory = first(searchParams.category);
  const availableCategories = categories.filter((category) =>
    items.some((item) => item.category === category.slug)
  );
  const category = availableCategories.some((item) => item.slug === requestedCategory)
    ? requestedCategory
    : "";

  const query = q.toLocaleLowerCase();
  const filtered = items.filter((item) => {
    const matchQuery = !query || [
      item.productName,
      item.variantName,
      item.itemCode,
      item.categoryLabel,
    ].some((value) => value.toLocaleLowerCase().includes(query));
    const level = stockLevel(item.stock);
    const matchStatus = status === "all" ||
      (status === "attention" ? level !== "healthy" : level === status);
    return matchQuery && matchStatus && (!category || item.category === category);
  }).sort((a, b) => {
    const priority = { out: 0, low: 1, healthy: 2 };
    return priority[stockLevel(a.stock)] - priority[stockLevel(b.stock)] ||
      a.productName.localeCompare(b.productName) ||
      a.variantName.localeCompare(b.variantName);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(first(searchParams.page));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, pages)
    : 1;
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (category) params.set("category", category);
    params.set("page", String(nextPage));
    return `/admin/inventory?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-orange-600">
            Product stock
          </p>
          <h1 className="mt-1 font-display text-2xl text-cocoa-800 sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Search website products and variants. Low stock means 1–{LOW_STOCK_LIMIT} units.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/pos"
            className="rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700]"
          >
            Open point of sale
          </Link>
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-cocoa-800 hover:border-orange-300"
          >
            Manage products
          </Link>
          <Link
            href="/admin/tracepos/check"
            className="rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700]"
          >
            Check / sync TracePOS
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-100 bg-[#fff0df] p-4">
          <p className="text-xs text-stone-500">Sellable options</p>
          <p className="mt-2 text-2xl font-bold text-cocoa-800">{totals.options.toLocaleString("en-NG")}</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-4">
          <p className="text-xs text-stone-500">Stock units</p>
          <p className="mt-2 text-2xl font-bold text-cocoa-800">{totals.units.toLocaleString("en-NG")}</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-4">
          <p className="text-xs text-stone-500">Needs attention</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">{totals.attention.toLocaleString("en-NG")}</p>
        </div>
      </div>

      <form action="/admin/inventory" method="get" role="search" className="grid gap-3 rounded-2xl border border-stone-100 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(9rem,0.5fr)_minmax(10rem,0.6fr)_auto] lg:items-end">
        <label className="block text-xs font-medium text-stone-600">
          Product or item code
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, code or category"
            className="mt-1 block w-full rounded-xl border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm text-cocoa-800 outline-none focus:border-orange-500"
          />
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Stock status
          <select name="status" defaultValue={status} className="mt-1 block w-full rounded-xl border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm text-cocoa-800 outline-none focus:border-orange-500">
            <option value="all">All statuses</option>
            <option value="attention">Needs attention</option>
            <option value="out">Out of stock</option>
            <option value="low">Low stock</option>
            <option value="healthy">Healthy (6+ units)</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-stone-600">
          Category
          <select name="category" defaultValue={category} className="mt-1 block w-full rounded-xl border border-stone-200 bg-[#fafafa] px-3 py-2.5 text-sm text-cocoa-800 outline-none focus:border-orange-500">
            <option value="">All categories</option>
            {availableCategories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-[#ff8200] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          Apply filters
        </button>
      </form>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-5">
          <h3 className="font-semibold text-cocoa-800">Stock list</h3>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>Showing {visible.length.toLocaleString("en-NG")} of {filtered.length.toLocaleString("en-NG")}</span>
            {(q || status !== "all" || category) && (
              <Link href="/admin/inventory" className="font-medium text-orange-600 hover:underline">Clear filters</Link>
            )}
          </div>
        </div>

        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left text-sm">
              <thead className="border-y border-stone-100 bg-[#fafafa] text-xs text-stone-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-5">Product / option</th>
                  <th scope="col" className="px-4 py-3 font-medium">Item code</th>
                  <th scope="col" className="px-4 py-3 font-medium">Category</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Stock</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((item) => (
                  <tr key={item.key} className="hover:bg-orange-50/40">
                    <td className="max-w-[20rem] px-4 py-3 sm:px-5">
                      <span className="block truncate font-medium text-cocoa-800" title={item.productName}>
                        {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="block truncate text-xs text-stone-500" title={item.variantName}>{item.variantName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">
                      {item.itemCode || <span className="text-stone-400">Not set</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{item.categoryLabel}</td>
                    <td className="px-4 py-3 text-right font-semibold text-cocoa-800">
                      {item.stock.toLocaleString("en-NG")}
                    </td>
                    <td className="px-4 py-3">{statusBadge(item.stock)}</td>
                    <td className="px-4 py-3 text-right text-stone-600">{naira(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-t border-stone-100 px-5 py-10 text-center text-sm text-stone-500">
            No inventory items match these filters.
          </p>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-4 py-4 text-sm sm:px-5">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="font-medium text-orange-600 hover:underline">Previous</Link>
            ) : <span className="text-stone-300">Previous</span>}
            <span className="text-stone-500">Page {page} of {pages}</span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="font-medium text-orange-600 hover:underline">Next</Link>
            ) : <span className="text-stone-300">Next</span>}
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-stone-500">
        This is a read-only view of website stock. Edit products in Products, or use TracePOS check to compare and sync existing item codes. Syncing does not import new TracePOS products.
      </p>
    </div>
  );
}