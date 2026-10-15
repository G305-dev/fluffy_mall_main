import Link from "next/link";
import { getOrders, getProducts } from "@/lib/db";
import { naira } from "@/lib/format";
import {
  allPosSales,
  nativePosControl,
  type PosSale,
} from "@/lib/native-pos";
import { STATUS_LABEL } from "@/lib/status";
import PosWorkspace, {
  type CashierProduct,
} from "./PosWorkspace";

export const dynamic = "force-dynamic";

const lagos = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function day(iso: string) {
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return "";

  const parts = Object.fromEntries(
    lagos
      .formatToParts(value)
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shift(date: string, offset: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function paid(
  order: Awaited<ReturnType<typeof getOrders>>[number]
) {
  return (
    order.payment.status === "paid" &&
    order.status !== "cancelled" &&
    order.status !== "refunded"
  );
}

export default async function PosPage({
  searchParams,
}: {
  searchParams?: {
    view?: string;
    period?: string;
  };
}) {
  const [mode, sales, orders, products] = await Promise.all([
    nativePosControl(),
    allPosSales(),
    getOrders(),
    getProducts(),
  ]);

  const view = [
    "dashboard",
    "cashier",
    "transactions",
    "stock",
  ].includes(searchParams?.view || "")
    ? searchParams!.view!
    : "dashboard";

  const period = [
    "7",
    "30",
    "90",
    "all",
  ].includes(searchParams?.period || "")
    ? searchParams!.period!
    : "30";

  const today = day(new Date().toISOString());
  const start =
    period === "all"
      ? "0000-01-01"
      : shift(today, 1 - Number(period));

  const eligibleSales = sales.filter(
    (sale) => day(sale.createdAt) >= start
  );

  const website = orders.filter(
    (order) =>
      paid(order) &&
      day(order.payment.paidAt || order.createdAt) >= start
  );

  const posAmount = eligibleSales.reduce(
    (sum, sale) => sum + sale.total,
    0
  );

  const websiteAmount = website.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const units =
    eligibleSales.reduce(
      (sum, sale) =>
        sum +
        sale.lines.reduce(
          (n, line) => n + line.qty,
          0
        ),
      0
    ) +
    website.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (n, item) => n + item.qty,
          0
        ),
      0
    );

  const standard = products.filter(
    (product) =>
      product.productType !== "variable" &&
      !(product.variants || []).length
  );

  const pausedCount =
    products.length - standard.length;

  const catalog: CashierProduct[] = mode
    ? standard.map((product) => ({
        productId: product.id,
        itemCode: product.itemCode || "",
        name: product.name,
        barcode: product.barcode || "",
        price: product.price,
        stock: product.stock,
      }))
    : [];

  const recent = [
    ...eligibleSales.map((sale) => ({
      id: sale._id,
      date: sale.createdAt,
      channel: "In-store",
      amount: sale.total,
      reference: sale.receipt,
      status: "Completed",
      sale: sale as PosSale | null,
    })),

    ...website.map((order) => ({
      id: order.id,
      date: order.payment.paidAt || order.createdAt,
      channel: "Website",
      amount: order.total,
      reference: order.id,
      status: STATUS_LABEL[order.status],
      sale: null as PosSale | null,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const due = mode
    ? orders.filter(
        (order) =>
          paid(order) &&
          (order.payment.paidAt || "") >=
            mode.openedAt &&
          !(
            order as typeof order & {
              nativeStockAt?: string;
            }
          ).nativeStockAt
      )
    : [];

  const historicalReview = mode
    ? orders.filter(
        (order) =>
          paid(order) &&
          !(
            order as typeof order & {
              nativeStockAt?: string;
            }
          ).nativeStockAt &&
          (!order.payment.paidAt ||
            order.payment.paidAt <
              mode.openedAt)
      ).length
    : 0;

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Fluffy Mall
          </p>
          <h1 className="mt-1 font-display text-3xl text-cocoa-800">
            POS Dashboard
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Current website products and stock, shared with the
            cashier.
          </p>
        </div>

        <form
          action="/admin/pos"
          className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm"
        >
          <input
            type="hidden"
            name="view"
            value={view}
          />
          <label
            htmlFor="pos-period"
            className="sr-only"
          >
            Period
          </label>
          <select
            id="pos-period"
            name="period"
            defaultValue={period}
            className="bg-transparent"
          >
            <option value="7">
              Last 7 days
            </option>
            <option value="30">
              Last 30 days
            </option>
            <option value="90">
              Last 90 days
            </option>
            <option value="all">
              All available
            </option>
          </select>
          <button className="rounded-lg bg-orange-50 px-2 py-1 font-semibold text-orange-800">
            Apply
          </button>
        </form>
      </header>

      <nav
        aria-label="POS views"
        className="flex overflow-x-auto border-b text-sm font-medium"
      >
        {[
          ["dashboard", "Dashboard"],
          ["cashier", "New sale"],
          ["transactions", "Transactions"],
          ["stock", "Stock & setup"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/pos?view=${id}&period=${period}`}
            aria-current={
              view === id ? "page" : undefined
            }
            className={`shrink-0 border-b-2 px-4 py-3 ${
              view === id
                ? "border-orange-500 text-orange-700"
                : "border-transparent text-stone-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {!mode && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Cashier and new website checkouts are paused until
          existing website stock is reviewed under Stock &
          setup.
        </p>
      )}

      {mode && due.length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {due.length} paid website{" "}
          {due.length === 1
            ? "order needs"
            : "orders need"}{" "}
          native-stock reconciliation. Review Stock &
          setup.
        </p>
      )}

      {view === "dashboard" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              [
                "In-store sales",
                naira(posAmount),
                "New cashier sales only",
              ],
              [
                "Website sales",
                naira(websiteAmount),
                "Paid website orders",
              ],
              [
                "Transactions",
                String(
                  eligibleSales.length +
                    website.length
                ),
                "Both channels",
              ],
              [
                "Items sold",
                String(units),
                "Across qualifying sales",
              ],
              [
                "Standard products",
                String(standard.length),
                `${pausedCount} variant products paused`,
              ],
            ].map(([label, value, hint]) => (
              <section
                key={label}
                className="rounded-2xl border bg-white p-4"
              >
                <p className="text-xs text-stone-600">
                  {label}
                </p>
                <strong className="mt-4 block text-2xl text-cocoa-800">
                  {value}
                </strong>
                <p className="mt-1 text-xs text-stone-500">
                  {hint}
                </p>
              </section>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-4 text-sm">
            <Link
              href="/admin/pos?view=cashier"
              className="rounded-lg bg-[#ff8200] px-4 py-2 font-semibold text-white"
            >
              Create sale
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-lg border px-4 py-2"
            >
              Website orders
            </Link>
            <Link
              href="/admin/pos?view=stock"
              className="rounded-lg border px-4 py-2"
            >
              Inventory review
            </Link>
          </div>
        </>
      )}

      {(view === "dashboard" ||
        view === "transactions") && (
        <section className="overflow-x-auto rounded-2xl border bg-white p-4">
          <h2 className="font-display text-lg text-cocoa-800">
            {view === "dashboard"
              ? "Recent transactions"
              : "Transactions"}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Only recorded cashier sales and paid
            website orders; no external-system history
            is invented.
          </p>

          <table className="mt-3 w-full min-w-[580px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs text-stone-600">
                <th className="px-3 py-2">
                  Date
                </th>
                <th className="px-3 py-2">
                  Channel
                </th>
                <th className="px-3 py-2">
                  Reference
                </th>
                <th className="px-3 py-2 text-right">
                  Amount
                </th>
                <th className="px-3 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent
                .slice(
                  0,
                  view === "dashboard" ? 8 : 50
                )
                .map((row) => (
                  <tr
                    key={`${row.channel}:${row.id}`}
                  >
                    <td className="px-3 py-2">
                      {new Date(
                        row.date
                      ).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      {row.channel}
                    </td>
                    <td className="px-3 py-2">
                      {row.sale
                        ? row.reference
                        : (
                          <Link
                            href={`/admin/orders/${encodeURIComponent(
                              row.id
                            )}`}
                            className="text-orange-700 underline"
                          >
                            {row.reference}
                          </Link>
                        )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {naira(row.amount)}
                    </td>
                    <td className="px-3 py-2">
                      {row.status}
                    </td>
                  </tr>
                ))}

              {!recent.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-stone-500"
                  >
                    No qualifying transactions in this
                    period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {recent.length >
            (view === "dashboard" ? 8 : 50) && (
            <p className="mt-2 text-xs text-stone-500">
              Showing the newest entries; change
              period to see others.
            </p>
          )}
        </section>
      )}

      <PosWorkspace
        mode={
          mode
            ? {
                openedAt: mode.openedAt,
                openingCount:
                  mode.openingCount,
              }
            : null
        }
        view={view}
        catalog={catalog}
        sales={sales.slice(0, 100)}
        needsReconcile={due.map((order) => ({
          id: order.id,
        }))}
        historicalReview={historicalReview}
      />
    </div>
  );
}