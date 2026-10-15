import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import type { ClientSession, Db } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/mongo";
import { nativeItemCode } from "@/lib/native-item-codes";
import type { Order, Product } from "@/lib/types";

const CONTROL = "pos_control";
const SALES = "pos_sales";
const MOVEMENTS = "inventory_movements";
const MAIN = "main";
type Movement = { _id: string; [key: string]: unknown };

type Control = {
  _id: string;
  mode: "native";
  openedAt: string;
  snapshotHash: string;
  openingCount: number;
};

export type PosPayment = "cash" | "bank_transfer" | "card_terminal";

export type PosLine = {
  productId: string;
  itemCode: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosSale = {
  _id: string;
  receipt: string;
  createdAt: string;
  cashier: string;
  customerName?: string;
  paymentMethod: PosPayment;
  lines: PosLine[];
  subtotal: number;
  discount: number;
  total: number;
  status: "completed";
};

export type OpeningRow = {
  productId: string;
  name: string;
  itemCode: string;
  price: number;
  stock: number;
  pausedVariant: boolean;
};

export type OpeningPreview = {
  rows: OpeningRow[];
  issues: string[];
  digest: string;
  standardCount: number;
  pausedVariantCount: number;
  oldPaidOrdersToReview: number;
};

export class PosInputError extends Error {}
export class PosConflictError extends Error {}

export async function nativePosControl(db?: Db, session?: ClientSession) {
  const database = db || await getDb();
  return database
    .collection<Control>(CONTROL)
    .findOne({ _id: MAIN }, { session });
}

function standard(product: Product) {
  return (
    product.productType !== "variable" &&
    !(product.variants || []).length
  );
}

function validStock(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function validPrice(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}

function openingFromProducts(products: Product[]) {
  const issues: string[] = [];
  const ids = new Set<string>();
  const codes = new Set<string>();
  const rows: OpeningRow[] = [];

  for (const product of products) {
    const id = String(product.id || "").trim();
    if (!id || ids.has(id)) {
      issues.push(
        `${product.name || "Unnamed product"}: missing or repeated product ID.`
      );
      continue;
    }

    ids.add(id);
    const itemCode = nativeItemCode(id);
    if (codes.has(itemCode))
      issues.push(`${product.name}: generated item code collision.`);
    codes.add(itemCode);

    if (product.itemCode && product.itemCode !== itemCode) {
      issues.push(
        `${product.name}: existing native item code disagrees with the generated code.`
      );
    }
    if (!product.name?.trim())
      issues.push(`${id}: product has no name.`);
    if (!validPrice(product.price))
      issues.push(`${product.name}: invalid selling price.`);
    if (!validStock(product.stock))
      issues.push(
        `${product.name}: stock must be a whole number (negative is allowed).`
      );

    rows.push({
      productId: id,
      name: product.name,
      itemCode,
      price: product.price,
      stock: product.stock,
      pausedVariant: !standard(product),
    });
  }

  rows.sort((a, b) => a.productId.localeCompare(b.productId));
  const digest = createHash("sha256")
    .update(JSON.stringify(rows))
    .digest("hex");
  return { rows, issues, digest };
}

// Review CURRENT website inventory. There is no external stock fetch/import.
export async function previewNativeOpening(): Promise<OpeningPreview> {
  const db = await getDb();
  if (await nativePosControl(db))
    throw new PosConflictError("Native POS is already active.");

  const [docs, oldPaidOrdersToReview] = await Promise.all([
    db.collection(COLLECTIONS.PRODUCTS).find({}).toArray(),
    db.collection(COLLECTIONS.ORDERS).countDocuments({
      "payment.status": "paid",
      nativeStockAt: { $exists: false },
    }),
  ]);

  const preview = openingFromProducts(docs as unknown as Product[]);
  if (!preview.rows.length)
    preview.issues.push("The website has no products.");

  return {
    ...preview,
    standardCount: preview.rows.filter((row) => !row.pausedVariant).length,
    pausedVariantCount: preview.rows.filter((row) => row.pausedVariant).length,
    oldPaidOrdersToReview,
  };
}

export async function activateNativePos(
  expectedDigest: string,
  reviewedOldPaidOrders: boolean
) {
  // Fail closed until old stock writers and payment routes are removed.
  if (process.env.NATIVE_STOCK_CUTOVER_READY !== "1") {
    throw new PosConflictError(
      "Cutover is locked. Remove old stock writers and review inventory before enabling it."
    );
  }
  if (!/^[0-9a-f]{64}$/.test(expectedDigest)) {
    throw new PosInputError(
      "Review current website inventory before activation."
    );
  }

  const db = await getDb();
  if (await nativePosControl(db))
    throw new PosConflictError("Native POS is already active.");

  await db.collection(COLLECTIONS.PRODUCTS)
    .createIndex({ id: 1 }, { unique: true });
  await db.collection(COLLECTIONS.PRODUCTS).createIndex(
    { itemCode: 1 },
    {
      unique: true,
      partialFilterExpression: { itemCode: { $type: "string" } },
    }
  );

  const session = db.client.startSession();
  let result: { openedAt: string; openingCount: number } | null = null;

  try {
    await session.withTransaction(async () => {
      if (await nativePosControl(db, session))
        throw new PosConflictError("Native POS is already active.");

      const products = db.collection(COLLECTIONS.PRODUCTS);
      const docs = await products.find({}, { session }).toArray();
      const preview = openingFromProducts(docs as unknown as Product[]);

      if (
        !preview.rows.length ||
        preview.issues.length ||
        expectedDigest !== preview.digest
      ) {
        throw new PosConflictError(
          "Products, prices or stock changed. Review current inventory again; no stock was changed."
        );
      }

      const oldPaid = await db
        .collection(COLLECTIONS.ORDERS)
        .countDocuments(
          {
            "payment.status": "paid",
            nativeStockAt: { $exists: false },
          },
          { session }
        );

      if (oldPaid > 0 && !reviewedOldPaidOrders) {
        throw new PosConflictError(
          "Review older paid website orders before approving opening balances."
        );
      }

      for (const row of preview.rows) {
        const updated = await products.updateOne(
          {
            id: row.productId,
            name: row.name,
            price: row.price,
            stock: row.stock,
          },
          { $set: { itemCode: row.itemCode } },
          { session }
        );
        if (updated.matchedCount !== 1)
          throw new PosConflictError(
            "Inventory changed during activation. Review again."
          );
      }

      const openedAt = new Date().toISOString();
      const standardRows = preview.rows.filter(
        (row) => !row.pausedVariant
      );

      if (standardRows.length) {
        await db.collection<Movement>(MOVEMENTS).insertMany(
          standardRows.map((row) => ({
            _id: `opening:${row.productId}`,
            type: "opening_balance",
            productId: row.productId,
            itemCode: row.itemCode,
            productName: row.name,
            previousStock: row.stock,
            resultingStock: row.stock,
            quantityChange: 0,
            source: "current_website_inventory",
            createdAt: openedAt,
          })),
          { session }
        );
      }

      await db.collection<Control>(CONTROL).insertOne(
        {
          _id: MAIN,
          mode: "native",
          openedAt,
          snapshotHash: preview.digest,
          openingCount: preview.rows.length,
        },
        { session }
      );
      result = {
        openedAt,
        openingCount: preview.rows.length,
      };
    });
  } finally {
    await session.endSession();
  }

  revalidatePath("/admin/pos");
  return result!;
}

function money(value: unknown, label: string) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  ) {
    throw new PosInputError(`${label} must be an amount.`);
  }
  const n = Number(value);
  if (
    !Number.isFinite(n) ||
    n < 0 ||
    Math.abs(n * 100 - Math.round(n * 100)) > 0.000001
  ) {
    throw new PosInputError(
      `${label} must be a non-negative amount with up to two decimal places.`
    );
  }
  return Math.round(n * 100) / 100;
}

function qty(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0 || n > 10000)
    throw new PosInputError(
      "Use a whole-number quantity between 1 and 10,000."
    );
  return n;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/inventory");
}

export async function createNativeSale(input: {
  requestId: string;
  items: Array<{
    productId: string;
    qty: number;
    expectedUnitPrice: number;
  }>;
  paymentMethod: PosPayment;
  confirmed: boolean;
  discount?: number;
  customerName?: string;
}): Promise<PosSale> {
  if (!/^[a-f0-9-]{36}$/i.test(input.requestId))
    throw new PosInputError("Invalid sale request ID.");
  if (!input.confirmed)
    throw new PosInputError(
      "Confirm that payment was received at the till."
    );
  if (
    !["cash", "bank_transfer", "card_terminal"].includes(
      input.paymentMethod
    )
  )
    throw new PosInputError(
      "Choose cash, bank transfer or card terminal."
    );
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50
  )
    throw new PosInputError("Add between 1 and 50 products.");

  const selected = new Map<
    string,
    {
      productId: string;
      qty: number;
      expectedUnitPrice: number;
    }
  >();

  for (const item of input.items) {
    if (
      typeof item?.productId !== "string" ||
      !item.productId.trim() ||
      "variantId" in item
    ) {
      throw new PosInputError(
        "Only standard products are available in the cashier."
      );
    }

    const productId = item.productId.trim();
    const price = money(item.expectedUnitPrice, "Displayed price");
    const previous = selected.get(productId);
    if (previous && previous.expectedUnitPrice !== price)
      throw new PosConflictError(
        "Product price changed; refresh the cashier."
      );

    const count = (previous?.qty || 0) + qty(item.qty);
    if (count > 10000)
      throw new PosInputError("Too many units of one product.");

    selected.set(productId, {
      productId,
      qty: count,
      expectedUnitPrice: price,
    });
  }

  const discount = money(input.discount ?? 0, "Discount");
  const customerName = String(input.customerName || "")
    .trim()
    .slice(0, 100);

  const db = await getDb();
  const session = db.client.startSession();
  const sales = db.collection<PosSale>(SALES);
  const products = db.collection(COLLECTIONS.PRODUCTS);
  let saved: PosSale | null = null;

  try {
    await session.withTransaction(async () => {
      if (!(await nativePosControl(db, session)))
        throw new PosConflictError("POS has not been activated.");

      const existing = await sales.findOne(
        { _id: input.requestId },
        { session }
      );
      if (existing) {
        saved = existing;
        return;
      }

      const lines: PosLine[] = [];
      const movements: Movement[] = [];

      for (const item of Array.from(selected.values())) {
        const raw = await products.findOne(
          { id: item.productId },
          { session }
        );
        if (!raw)
          throw new PosConflictError(
            "Product no longer exists. Refresh the cashier."
          );

        const product = raw as unknown as Product;
        if (
          !standard(product) ||
          !product.itemCode ||
          product.itemCode !== nativeItemCode(product.id)
        ) {
          throw new PosConflictError(
            `${product.name} is not available to the cashier.`
          );
        }

        const price = money(product.price, "Selling price");
        if (price !== item.expectedUnitPrice)
          throw new PosConflictError(
            `${product.name} changed price. Refresh before collecting payment.`
          );

        const updated = await products.findOneAndUpdate(
          {
            id: product.id,
            itemCode: product.itemCode,
            productType: { $ne: "variable" },
            $or: [
              { variants: { $size: 0 } },
              { variants: { $exists: false } },
            ],
            stock: { $gte: item.qty },
          },
          { $inc: { stock: -item.qty } },
          {
            session,
            returnDocument: "after",
            includeResultMetadata: false,
          }
        );

        if (!updated)
          throw new PosConflictError(
            `Not enough stock for ${product.name}. Refresh the cashier.`
          );

        lines.push({
          productId: product.id,
          itemCode: product.itemCode,
          name: product.name,
          qty: item.qty,
          unitPrice: price,
          lineTotal: Math.round(price * item.qty * 100) / 100,
        });

        movements.push({
          _id: `pos:${input.requestId}:${product.id}`,
          type: "pos_sale",
          productId: product.id,
          itemCode: product.itemCode,
          productName: product.name,
          quantityChange: -item.qty,
          resultingStock: (updated as unknown as Product).stock,
          source: input.requestId,
        });
      }

      const subtotal =
        Math.round(
          lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100
        ) / 100;
      const total = Math.round((subtotal - discount) * 100) / 100;
      if (total <= 0)
        throw new PosInputError(
          "The discount must leave a positive total."
        );

      const createdAt = new Date().toISOString();
      const sale: PosSale = {
        _id: input.requestId,
        receipt: `FM-${createdAt
          .slice(0, 10)
          .replace(/-/g, "")}-${randomBytes(5)
          .toString("hex")
          .toUpperCase()}`,
        createdAt,
        cashier: "Admin",
        customerName: customerName || undefined,
        paymentMethod: input.paymentMethod,
        lines,
        subtotal,
        discount,
        total,
        status: "completed",
      };

      await sales.insertOne(sale, { session });
      await db.collection<Movement>(MOVEMENTS).insertMany(
        movements.map((movement) => ({
          ...movement,
          createdAt,
        })),
        { session }
      );
      saved = sale;
    });
  } catch (error) {
    // Retry after a lost response with the SAME request ID, not a second sale.
    const existing = await sales.findOne({ _id: input.requestId });
    if (existing) return existing;
    throw error;
  } finally {
    await session.endSession();
  }

  refresh();
  return saved!;
}

// Called only after a server-verified Paystack payment. A customer may have
// paid after the last unit sold: record negative stock instead of concealing it.
export async function applyNativeWebsiteSale(orderId: string) {
  const db = await getDb();
  const session = db.client.startSession();
  let status:
    | "applied"
    | "already"
    | "not_paid"
    | "before_activation"
    | "pre_cutover" = "not_paid";

  try {
    await session.withTransaction(async () => {
      const control = await nativePosControl(db, session);
      if (!control) {
        status = "before_activation";
        return;
      }

      const orders = db.collection(COLLECTIONS.ORDERS);
      const raw = await orders.findOne({ id: orderId }, { session });
      if (!raw)
        throw new PosConflictError("Website order not found.");

      const order = raw as unknown as Order & {
        nativeStockAt?: string;
      };
      if (order.payment.status !== "paid") {
        status = "not_paid";
        return;
      }
      if (order.nativeStockAt) {
        status = "already";
        return;
      }
      if (
        !order.payment.paidAt ||
        order.payment.paidAt < control.openedAt
      ) {
        status = "pre_cutover";
        return;
      }

      const grouped = new Map<
        string,
        {
          qty: number;
          name: string;
          variantName?: string;
        }
      >();

      for (const item of order.items) {
        const count = qty(item.qty);
        const previous = grouped.get(item.productId);
        grouped.set(item.productId, {
          qty: (previous?.qty || 0) + count,
          name: item.name,
          variantName: item.variantName || previous?.variantName,
        });
      }

      if (!grouped.size)
        throw new PosConflictError("Paid order has no products.");

      const now = new Date().toISOString();
      const claim = await orders.updateOne(
        { id: orderId, nativeStockAt: { $exists: false } },
        { $set: { nativeStockAt: now } },
        { session }
      );
      if (claim.matchedCount !== 1) {
        status = "already";
        return;
      }

      for (const [productId, item] of Array.from(grouped.entries())) {
        const rawProduct = await db
          .collection(COLLECTIONS.PRODUCTS)
          .findOne({ id: productId }, { session });
        if (!rawProduct)
          throw new PosConflictError(
            `Paid order ${orderId}: ${item.name} was removed. Reconcile manually.`
          );

        const product = rawProduct as unknown as Product;
        if (item.variantName || !standard(product)) {
          throw new PosConflictError(
            `Paid order ${orderId}: a paused variant needs manual inventory review.`
          );
        }
        if (
          !product.itemCode ||
          product.itemCode !== nativeItemCode(product.id)
        ) {
          throw new PosConflictError(
            `Paid order ${orderId}: ${item.name} has no native item code.`
          );
        }

        const updated = await db
          .collection(COLLECTIONS.PRODUCTS)
          .findOneAndUpdate(
            {
              id: product.id,
              itemCode: product.itemCode,
              productType: { $ne: "variable" },
              $or: [
                { variants: { $size: 0 } },
                { variants: { $exists: false } },
              ],
            },
            { $inc: { stock: -item.qty } },
            {
              session,
              returnDocument: "after",
              includeResultMetadata: false,
            }
          );

        if (!updated)
          throw new PosConflictError(
            `Paid order ${orderId}: stock update failed for ${item.name}.`
          );

        await db.collection<Movement>(MOVEMENTS).insertOne(
          {
            _id: `web:${orderId}:${product.id}`,
            type: "website_sale",
            productId: product.id,
            itemCode: product.itemCode,
            productName: item.name,
            quantityChange: -item.qty,
            resultingStock: (updated as unknown as Product).stock,
            source: orderId,
            createdAt: now,
          },
          { session }
        );
      }

      status = "applied";
    });
  } finally {
    await session.endSession();
  }

  if (String(status) === "applied") refresh();
  return { status };
}

export async function adjustNativeStock(input: {
  productId: string;
  change: number;
  reason: string;
}) {
  if (
    !Number.isSafeInteger(input.change) ||
    !input.change ||
    Math.abs(input.change) > 100000
  ) {
    throw new PosInputError(
      "Use a non-zero whole-number stock adjustment."
    );
  }

  const reason = String(input.reason || "")
    .trim()
    .slice(0, 250);
  if (reason.length < 5)
    throw new PosInputError(
      "Provide at least five characters explaining the adjustment."
    );

  const db = await getDb();
  const session = db.client.startSession();
  let result: { product: string; stock: number } | null = null;

  try {
    await session.withTransaction(async () => {
      if (!(await nativePosControl(db, session)))
        throw new PosConflictError("Activate native POS first.");

      const products = db.collection(COLLECTIONS.PRODUCTS);
      const raw = await products.findOne(
        { id: input.productId },
        { session }
      );
      if (!raw)
        throw new PosInputError("Product not found.");

      const product = raw as unknown as Product;
      if (
        !standard(product) ||
        product.itemCode !== nativeItemCode(product.id)
      ) {
        throw new PosInputError("Variant inventory is paused.");
      }

      const updated = await products.findOneAndUpdate(
        {
          id: product.id,
          itemCode: product.itemCode,
          productType: { $ne: "variable" },
          $or: [
            { variants: { $size: 0 } },
            { variants: { $exists: false } },
          ],
        },
        { $inc: { stock: input.change } },
        {
          session,
          returnDocument: "after",
          includeResultMetadata: false,
        }
      );

      if (!updated)
        throw new PosConflictError(
          "Stock changed; refresh and retry."
        );

      const stock = (updated as unknown as Product).stock;
      await db.collection<Movement>(MOVEMENTS).insertOne(
        {
          _id: `adjust:${randomBytes(16).toString("hex")}`,
          type: "adjustment",
          productId: product.id,
          itemCode: product.itemCode,
          productName: product.name,
          quantityChange: input.change,
          resultingStock: stock,
          reason,
          createdAt: new Date().toISOString(),
        },
        { session }
      );

      result = { product: product.name, stock };
    });
  } finally {
    await session.endSession();
  }

  refresh();
  return result!;
}

export async function allPosSales(): Promise<PosSale[]> {
  const db = await getDb();
  return db
    .collection<PosSale>(SALES)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

export async function recentPosSales(
  limit = 50
): Promise<PosSale[]> {
  const db = await getDb();
  return db
    .collection<PosSale>(SALES)
    .find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(100, limit))
    .toArray();
}

export async function posSale(
  id: string
): Promise<PosSale | null> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const db = await getDb();
  return db.collection<PosSale>(SALES).findOne({ _id: id });
}