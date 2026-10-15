"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { naira } from "@/lib/format";
import type {
  OpeningPreview,
  PosPayment,
  PosSale,
} from "@/lib/native-pos";

export type CashierProduct = {
  productId: string;
  itemCode: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
};

type CartRow = {
  product: CashierProduct;
  qty: number;
};

type PendingSale = {
  action: "sale";
  requestId: string;
  items: Array<{
    productId: string;
    qty: number;
    expectedUnitPrice: number;
  }>;
  paymentMethod: PosPayment;
  confirmed: true;
  discount: number;
  customerName: string;
};

async function responseJson(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
}

function Receipt({
  sale,
  close,
}: {
  sale: PosSale;
  close: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #fm-pos-receipt,
          #fm-pos-receipt * {
            visibility: visible !important;
          }
          #fm-pos-receipt {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
      `}</style>

      <div className="mb-4 flex justify-between gap-2 print:hidden">
        <h2 className="font-display text-lg">
          Receipt
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded bg-[#ff8200] px-3 py-2 text-sm text-white"
          >
            Print
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded border px-3 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      <div
        id="fm-pos-receipt"
        className="mx-auto max-w-sm text-sm"
      >
        <h3 className="text-center text-xl font-bold">
          Fluffy Mall
        </h3>
        <p className="text-center text-xs">
          In-store sale · {sale.receipt}
        </p>
        <p className="mt-4 text-xs">
          {new Date(sale.createdAt).toLocaleString(
            "en-NG",
            { timeZone: "Africa/Lagos" }
          )}
        </p>

        {sale.customerName && (
          <p>Customer: {sale.customerName}</p>
        )}

        <table className="mt-4 w-full text-xs">
          <thead>
            <tr className="border-y">
              <th className="py-2 text-left">
                Product
              </th>
              <th className="text-right">
                Qty
              </th>
              <th className="text-right">
                Unit
              </th>
              <th className="text-right">
                Total
              </th>
            </tr>
          </thead>

          <tbody>
            {sale.lines.map((line) => (
              <tr
                key={line.productId}
                className="border-b"
              >
                <td className="py-2">
                  {line.name}
                  <br />
                  <span className="font-mono text-[10px]">
                    {line.itemCode}
                  </span>
                </td>
                <td className="text-right">
                  {line.qty}
                </td>
                <td className="text-right">
                  {naira(line.unitPrice)}
                </td>
                <td className="text-right">
                  {naira(line.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 flex justify-between">
          <span>Subtotal</span>
          <span>{naira(sale.subtotal)}</span>
        </p>

        {sale.discount > 0 && (
          <p className="flex justify-between">
            <span>Discount</span>
            <span>
              −{naira(sale.discount)}
            </span>
          </p>
        )}

        <p className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{naira(sale.total)}</span>
        </p>

        <p className="mt-2">
          Payment:{" "}
          {sale.paymentMethod === "cash"
            ? "Cash"
            : sale.paymentMethod ===
                "bank_transfer"
              ? "Bank transfer"
              : "Card terminal (manually confirmed)"}
        </p>

        <p className="mt-4 text-center text-xs">
          Thank you for shopping with us.
        </p>
      </div>
    </div>
  );
}

export default function PosWorkspace({
  mode,
  view,
  catalog,
  sales,
  needsReconcile,
  historicalReview,
}: {
  mode: {
    openedAt: string;
    openingCount: number;
  } | null;
  view: string;
  catalog: CashierProduct[];
  sales: PosSale[];
  needsReconcile: Array<{ id: string }>;
  historicalReview: number;
}) {
  const router = useRouter();
  const [preview, setPreview] =
    useState<OpeningPreview | null>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] =
    useState<CartRow[]>([]);
  const [discount, setDiscount] =
    useState("0");
  const [customerName, setCustomerName] =
    useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PosPayment>("cash");
  const [confirmed, setConfirmed] =
    useState(false);
  const [pending, setPending] =
    useState<PendingSale | null>(null);
  const [receipt, setReceipt] =
    useState<PosSale | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] =
    useState("");
  const [
    reviewedOldPaidOrders,
    setReviewedOldPaidOrders,
  ] = useState(false);
  const [adjustId, setAdjustId] =
    useState("");
  const [adjustChange, setAdjustChange] =
    useState("");
  const [adjustReason, setAdjustReason] =
    useState("");

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();

    return (
      text
        ? catalog.filter((product) =>
            [
              product.name,
              product.itemCode,
              product.barcode,
            ].some((field) =>
              field
                .toLowerCase()
                .includes(text)
            )
          )
        : catalog
    ).slice(0, 40);
  }, [catalog, query]);

  const subtotal = cart.reduce(
    (sum, row) =>
      sum +
      row.product.price * row.qty,
    0
  );

  const discountValue =
    Number(discount) || 0;
  const total = Math.max(
    0,
    subtotal - discountValue
  );

  function add(product: CashierProduct) {
    if (pending) return;

    const existing = cart.find(
      (row) =>
        row.product.productId ===
        product.productId
    );

    if (
      product.stock <=
      (existing?.qty || 0)
    ) {
      setError(
        `Only ${product.stock} of ${product.name} available.`
      );
      return;
    }

    setCart((rows) =>
      existing
        ? rows.map((row) =>
            row.product.productId ===
            product.productId
              ? {
                  ...row,
                  qty: row.qty + 1,
                }
              : row
          )
        : [
            ...rows,
            { product, qty: 1 },
          ]
    );

    setQuery("");
    setError("");
  }

  function setQty(id: string, value: number) {
    if (pending) return;

    const product = cart.find(
      (row) =>
        row.product.productId === id
    )?.product;

    if (!product) return;

    if (value > product.stock) {
      setError(
        `Only ${product.stock} available.`
      );
      return;
    }

    setCart((rows) =>
      value <= 0
        ? rows.filter(
            (row) =>
              row.product.productId !== id
          )
        : rows.map((row) =>
            row.product.productId === id
              ? { ...row, qty: value }
              : row
          )
    );

    setError("");
  }

  function scan(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const input = query
      .trim()
      .toLowerCase();

    const exact = catalog.filter(
      (product) =>
        product.itemCode.toLowerCase() ===
          input ||
        (product.barcode &&
          product.barcode.toLowerCase() ===
            input)
    );

    if (exact.length === 1) {
      add(exact[0]);
    } else if (exact.length > 1) {
      setError(
        "More than one product has this code. Select it manually."
      );
    } else if (matches.length === 1) {
      add(matches[0]);
    } else {
      setError(
        "Select a product from the search results."
      );
    }
  }

  async function post(data: object) {
    return responseJson(
      await fetch("/api/admin/pos", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(data),
      })
    );
  }

  async function submitSale() {
    if (busy) return;

    if (
      !pending &&
      (
        !cart.length ||
        !confirmed ||
        !Number.isFinite(Number(discount)) ||
        total <= 0
      )
    ) {
      setError(
        "Add a product, enter a valid discount and confirm payment was received."
      );
      return;
    }

    const draft: PendingSale = pending || {
      action: "sale",
      requestId: crypto.randomUUID(),
      items: cart.map(
        ({ product, qty }) => ({
          productId:
            product.productId,
          qty,
          expectedUnitPrice:
            product.price,
        })
      ),
      paymentMethod,
      confirmed: true,
      discount: Number(discount),
      customerName,
    };

    setPending(draft);
    setBusy(true);
    setError("");

    try {
      const data = await post(draft);

      setReceipt(data.sale);
      setPending(null);
      setCart([]);
      setCustomerName("");
      setDiscount("0");
      setConfirmed(false);
      setNotice(
        `Sale recorded: ${data.sale.receipt}. Stock was deducted once.`
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Sale status unknown. Retry the SAME request ID."
      );
    } finally {
      setBusy(false);
    }
  }

  async function checkPending() {
    if (!pending) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/pos?sale=${encodeURIComponent(
          pending.requestId
        )}`,
        { cache: "no-store" }
      );

      if (response.status === 404) {
        setPending(null);
        setNotice(
          "No sale exists for that request ID. Review payment before trying again."
        );
        return;
      }

      const data =
        await responseJson(response);

      setReceipt(data.sale);
      setPending(null);
      setCart([]);
      setConfirmed(false);
      setNotice(
        "The sale was already recorded. No second stock deduction occurred."
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not check sale status."
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadReceipt(id: string) {
    setBusy(true);
    setError("");

    try {
      const data = await responseJson(
        await fetch(
          `/api/admin/pos?sale=${encodeURIComponent(
            id
          )}`,
          { cache: "no-store" }
        )
      );
      setReceipt(data.sale);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load receipt."
      );
    } finally {
      setBusy(false);
    }
  }

  async function readOpening() {
    setBusy(true);
    setError("");
    setReviewedOldPaidOrders(false);

    try {
      const data = await responseJson(
        await fetch("/api/admin/pos", {
          cache: "no-store",
        })
      );
      setPreview(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not review inventory."
      );
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (
      !preview ||
      preview.issues.length ||
      confirmation !==
        "USE CURRENT WEBSITE STOCK" ||
      (
        preview.oldPaidOrdersToReview >
          0 &&
        !reviewedOldPaidOrders
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await post({
        action: "activate",
        digest: preview.digest,
        reviewedOldPaidOrders,
        confirm: confirmation,
      });

      setNotice(
        `Native POS activated for ${data.result.openingCount} existing products. Stock and prices were not replaced.`
      );
      setPreview(null);
      router.refresh();
    } catch (cause) {
      setPreview(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Activation failed. Review stock again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function adjust(
    event: React.FormEvent
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await post({
        action: "adjust",
        productId: adjustId,
        change:
          Number(adjustChange),
        reason: adjustReason,
      });

      setNotice(
        `${data.result.product}: ${data.result.stock} on hand. Adjustment recorded.`
      );
      setAdjustChange("");
      setAdjustReason("");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not adjust stock."
      );
    } finally {
      setBusy(false);
    }
  }

  async function reconcile(id: string) {
    setBusy(true);
    setError("");

    try {
      const data = await post({
        action: "reconcile",
        orderId: id,
      });
      setNotice(
        `${id}: ${data.result.status}. Check the website order before further action.`
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reconcile order stock."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}

      {receipt && (
        <Receipt
          sale={receipt}
          close={() =>
            setReceipt(null)
          }
        />
      )}

      {view === "cashier" &&
        (
          mode ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <section className="min-w-0 rounded-2xl border bg-white p-4 lg:col-span-7">
                <h2 className="font-display text-xl">
                  In-store checkout
                </h2>
                <p className="mt-1 text-xs text-stone-600">
                  Search by product name or internal item
                  code; scan a Code 128 barcode and press
                  Enter. Variants are paused.
                </p>

                <label className="mt-4 block text-sm">
                  Search or scan
                  <input
                    type="search"
                    value={query}
                    autoFocus
                    disabled={Boolean(pending)}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    onKeyDown={scan}
                    placeholder="Product, FM item code or barcode"
                    className="mt-1 w-full rounded-xl border p-3"
                  />
                </label>

                <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto sm:grid-cols-2">
                  {matches.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => add(product)}
                      disabled={
                        Boolean(pending) ||
                        product.stock <= 0
                      }
                      className="rounded-xl border p-3 text-left hover:bg-orange-50 disabled:opacity-50"
                    >
                      <strong className="block truncate text-sm">
                        {product.name}
                      </strong>
                      <small className="block font-mono text-stone-600">
                        {product.itemCode}
                      </small>
                      <small className="block">
                        {naira(product.price)} ·{" "}
                        {product.stock} available
                      </small>
                    </button>
                  ))}

                  {!matches.length && (
                    <p className="text-sm text-stone-500">
                      No matching standard products.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-4 lg:col-span-5">
                <h2 className="font-display text-xl">
                  Current sale
                </h2>

                <div className="mt-3 max-h-60 space-y-2 overflow-auto">
                  {cart.map(
                    ({ product, qty }) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between gap-2 border-b py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <strong className="block truncate">
                            {product.name}
                          </strong>
                          <small>
                            {naira(product.price)}
                          </small>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={Boolean(
                              pending
                            )}
                            onClick={() =>
                              setQty(
                                product.productId,
                                qty - 1
                              )
                            }
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            disabled={Boolean(
                              pending
                            )}
                            onClick={() =>
                              setQty(
                                product.productId,
                                qty + 1
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  )}

                  {!cart.length && (
                    <p className="text-sm text-stone-500">
                      Select a product to start.
                    </p>
                  )}
                </div>

                <p className="mt-3 flex justify-between text-sm">
                  <span>Subtotal</span>
                  <strong>
                    {naira(subtotal)}
                  </strong>
                </p>

                <label className="mt-3 block text-xs">
                  Discount (₦)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    disabled={Boolean(pending)}
                    onChange={(event) =>
                      setDiscount(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  />
                </label>

                <p className="mt-3 flex justify-between border-t pt-3 text-xl font-bold">
                  <span>Total</span>
                  <span>{naira(total)}</span>
                </p>

                <label className="mt-3 block text-xs">
                  Customer (optional)
                  <input
                    value={customerName}
                    maxLength={100}
                    disabled={Boolean(pending)}
                    onChange={(event) =>
                      setCustomerName(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  />
                </label>

                <label className="mt-3 block text-xs">
                  Payment received by
                  <select
                    value={paymentMethod}
                    disabled={Boolean(pending)}
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target
                          .value as PosPayment
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  >
                    <option value="cash">
                      Cash
                    </option>
                    <option value="bank_transfer">
                      Bank transfer
                    </option>
                    <option value="card_terminal">
                      Card terminal (manual confirmation)
                    </option>
                  </select>
                </label>

                <label className="mt-4 flex gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={Boolean(pending)}
                    onChange={(event) =>
                      setConfirmed(
                        event.target.checked
                      )
                    }
                  />
                  I received and checked the payment.
                  Record sale and deduct stock.
                </label>

                <button
                  type="button"
                  onClick={submitSale}
                  disabled={
                    busy ||
                    (
                      !pending &&
                      (
                        !confirmed ||
                        !cart.length ||
                        total <= 0
                      )
                    )
                  }
                  className="mt-4 w-full rounded-xl bg-[#ff8200] p-3 font-semibold text-white disabled:opacity-50"
                >
                  {busy
                    ? "Working…"
                    : pending
                      ? "Retry the SAME sale"
                      : "Complete sale"}
                </button>

                {pending && (
                  <div className="mt-3 text-xs text-orange-800">
                    A network error can occur after a sale
                    saves. Retry using this request ID:
                    <code className="block break-all">
                      {pending.requestId}
                    </code>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={checkPending}
                      className="mt-2 underline"
                    >
                      Check whether this sale already
                      exists
                    </button>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 p-4 text-sm">
              Cashier is locked.{" "}
              <Link
                href="/admin/pos?view=stock"
                className="underline"
              >
                Review current website stock
              </Link>{" "}
              first.
            </p>
          )
        )}

      {view === "transactions" &&
        mode && (
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="font-display text-lg">
              Cashier receipts
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              New native cashier transactions only.
            </p>

            <ul className="mt-3 divide-y">
              {sales.map((sale) => (
                <li
                  key={sale._id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span>
                    {sale.receipt} ·{" "}
                    {new Date(
                      sale.createdAt
                    ).toLocaleString(
                      "en-NG",
                      {
                        timeZone:
                          "Africa/Lagos",
                      }
                    )}{" "}
                    · {naira(sale.total)}
                  </span>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      loadReceipt(
                        sale._id
                      )
                    }
                    className="rounded border px-3 py-1 text-orange-700"
                  >
                    View / print
                  </button>
                </li>
              ))}

              {!sales.length && (
                <li className="py-4 text-sm text-stone-500">
                  No cashier receipts yet.
                </li>
              )}
            </ul>

            {sales.length === 100 && (
              <p className="mt-2 text-xs">
                Showing the newest 100.
              </p>
            )}
          </section>
        )}

      {view === "stock" &&
        (
          mode ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border bg-white p-5">
                <h2 className="font-display text-lg">
                  Shared website inventory
                </h2>
                <p className="mt-2 text-sm">
                  Active since{" "}
                  {new Date(
                    mode.openedAt
                  ).toLocaleString(
                    "en-NG",
                    {
                      timeZone:
                        "Africa/Lagos",
                    }
                  )}
                  . Standard products use the
                  current website stock balance.
                  Variable products remain paused.
                </p>

                <h3 className="mt-5 font-semibold">
                  Paid website orders needing
                  native-stock review
                </h3>

                <ul className="mt-2 space-y-2">
                  {needsReconcile.map(
                    ({ id }) => (
                      <li
                        key={id}
                        className="flex justify-between border-b py-2 text-sm"
                      >
                        <Link
                          href={`/admin/orders/${encodeURIComponent(
                            id
                          )}`}
                          className="text-orange-700 underline"
                        >
                          {id}
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            reconcile(
                              id
                            )
                          }
                          className="rounded border px-2 py-1"
                        >
                          Retry once
                        </button>
                      </li>
                    )
                  )}

                  {!needsReconcile.length && (
                    <li className="text-sm text-green-700">
                      No post-activation paid
                      orders awaiting stock
                      deduction.
                    </li>
                  )}
                </ul>

                {historicalReview > 0 && (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    {historicalReview} older paid
                    order records have no native
                    stock marker. Their stock may
                    already be reflected in
                    opening balances; review them
                    manually, never deduct them
                    all automatically.
                  </p>
                )}
              </section>

              <form
                onSubmit={adjust}
                className="self-start rounded-2xl border bg-white p-5"
              >
                <h2 className="font-display text-lg">
                  Stock adjustment
                </h2>
                <p className="mt-1 text-xs">
                  Record stock received or
                  corrected with a reason. This
                  is not a refund workflow.
                </p>

                <label className="mt-4 block text-xs">
                  Standard product
                  <select
                    required
                    value={adjustId}
                    onChange={(event) =>
                      setAdjustId(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  >
                    <option value="">
                      Select product
                    </option>
                    {catalog.map(
                      (product) => (
                        <option
                          key={
                            product.productId
                          }
                          value={
                            product.productId
                          }
                        >
                          {product.name} ·{" "}
                          {product.stock} on hand
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="mt-3 block text-xs">
                  Quantity change
                  <input
                    required
                    type="number"
                    step="1"
                    value={adjustChange}
                    onChange={(event) =>
                      setAdjustChange(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  />
                </label>

                <label className="mt-3 block text-xs">
                  Reason
                  <input
                    required
                    minLength={5}
                    maxLength={250}
                    value={adjustReason}
                    onChange={(event) =>
                      setAdjustReason(
                        event.target.value
                      )
                    }
                    className="mt-1 w-full rounded-lg border p-2"
                  />
                </label>

                <button
                  disabled={busy}
                  className="mt-4 rounded-lg bg-[#ff8200] px-4 py-2 text-white disabled:opacity-50"
                >
                  Record adjustment
                </button>
              </form>
            </div>
          ) : (
            <section className="rounded-2xl border bg-white p-5">
              <h2 className="font-display text-xl">
                Review current website stock
              </h2>
              <p className="mt-2 text-sm">
                No external stock file or item
                codes are read. The website&apos;s
                current product names, prices and
                quantities are retained. Unique
                FM item codes are generated for
                each product. Variants are
                preserved but not sellable.
              </p>

              <button
                type="button"
                onClick={readOpening}
                disabled={busy}
                className="mt-4 rounded-lg border border-orange-200 px-4 py-2 text-orange-700 disabled:opacity-50"
              >
                Review current inventory
              </button>

              {preview && (
                <div className="mt-5 space-y-4">
                  <p className="text-sm">
                    Standard:{" "}
                    {preview.standardCount} ·
                    Variable paused:{" "}
                    {preview.pausedVariantCount} ·
                    Problems:{" "}
                    {preview.issues.length}
                  </p>

                  <p className="text-xs text-amber-900">
                    {preview.oldPaidOrdersToReview}{" "}
                    older paid orders have no native
                    stock marker. Check payments
                    that may not already be
                    reflected in website stock
                    before approving.
                  </p>

                  {preview.issues.length > 0 && (
                    <ul className="max-h-40 list-disc overflow-y-auto rounded-lg bg-red-50 p-4 pl-7 text-xs text-red-800">
                      {preview.issues.map(
                        (issue, i) => (
                          <li key={i}>
                            {issue}
                          </li>
                        )
                      )}
                    </ul>
                  )}

                  <div className="max-h-72 overflow-auto rounded-lg border">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead>
                        <tr className="border-b bg-stone-50">
                          <th className="p-2">
                            Product
                          </th>
                          <th className="p-2">
                            New item code
                          </th>
                          <th className="p-2 text-right">
                            Price
                          </th>
                          <th className="p-2 text-right">
                            Website stock
                          </th>
                          <th className="p-2">
                            POS status
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {preview.rows.map(
                          (row) => (
                            <tr
                              key={
                                row.productId
                              }
                            >
                              <td className="p-2">
                                {row.name}
                              </td>
                              <td className="p-2 font-mono">
                                {row.itemCode}
                              </td>
                              <td className="p-2 text-right">
                                {naira(
                                  row.price
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {row.stock}
                              </td>
                              <td className="p-2">
                                {row.pausedVariant
                                  ? "Paused"
                                  : "Standard"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!preview.issues.length && (
                    <div className="rounded-xl bg-amber-50 p-4 text-sm">
                      <p>
                        Do not activate until the
                        old stock writers are
                        removed, existing
                        quantities are checked,
                        and the deployment is
                        ready. Activation does
                        not replace stock or
                        prices.
                      </p>

                      {preview.oldPaidOrdersToReview >
                        0 && (
                        <label className="mt-3 flex gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={
                              reviewedOldPaidOrders
                            }
                            onChange={(
                              event
                            ) =>
                              setReviewedOldPaidOrders(
                                event.target
                                  .checked
                              )
                            }
                          />
                          I have reviewed older
                          paid orders against
                          current stock and
                          accepted the opening
                          balances.
                        </label>
                      )}

                      <label className="mt-3 block text-xs">
                        Type USE CURRENT WEBSITE
                        STOCK
                        <input
                          value={
                            confirmation
                          }
                          onChange={(
                            event
                          ) =>
                            setConfirmation(
                              event.target
                                .value
                            )
                          }
                          className="mt-1 block w-full rounded-lg border p-2"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={activate}
                        disabled={
                          busy ||
                          confirmation !==
                            "USE CURRENT WEBSITE STOCK" ||
                          (
                            preview.oldPaidOrdersToReview >
                              0 &&
                            !reviewedOldPaidOrders
                          )
                        }
                        className="mt-3 rounded-lg bg-[#ff8200] px-4 py-2 text-white disabled:opacity-50"
                      >
                        Activate native
                        inventory once
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        )}
    </div>
  );
}