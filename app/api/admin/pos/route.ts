import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/auth";
import { makeOrderId } from "@/lib/db";
import { COLLECTIONS, getDb, getMongoClient } from "@/lib/mongo";
import { resolveAvailableOrderItems, StockUnavailableError } from "@/lib/product-availability";
import type { Order, Product } from "@/lib/types";

type PosSelection = {
  productId: string;
  variantId?: string;
  qty: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest) {
  if (!await isStaffAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid sale details." }, { status: 400 });
  }

  if (body.confirmedReceived !== true) {
    return NextResponse.json(
      { error: "Confirm that the bank transfer has been received before completing the sale." },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return NextResponse.json({ error: "Add between 1 and 50 items to the sale." }, { status: 400 });
  }

  const selections = new Map<string, PosSelection>();
  for (const rawItem of body.items) {
    if (!isRecord(rawItem)) {
      return NextResponse.json({ error: "A sale item is invalid." }, { status: 400 });
    }
    const productId = typeof rawItem.productId === "string" ? rawItem.productId.trim() : "";
    const variantId = typeof rawItem.variantId === "string" ? rawItem.variantId.trim() : "";
    const qty = Number(rawItem.qty);
    if (!productId || productId.length > 160 || !Number.isSafeInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: "A sale item has an invalid product or quantity." }, { status: 400 });
    }

    const key = JSON.stringify([productId, variantId]);
    const existing = selections.get(key);
    const totalQty = (existing?.qty ?? 0) + qty;
    if (!Number.isSafeInteger(totalQty)) {
      return NextResponse.json({ error: "A sale quantity is too large." }, { status: 400 });
    }
    selections.set(key, { productId, variantId: variantId || undefined, qty: totalQty });
  }

  const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
  const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
  const paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
  if (customerName.length > 100 || customerPhone.length > 40 || paymentReference.length > 120) {
    return NextResponse.json({ error: "Customer details or payment reference are too long." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = await getDb();
  const session = client.startSession();
  const orderId = makeOrderId();
  let createdOrder: Order | undefined;

  try {
    await session.withTransaction(async () => {
      const productCollection = db.collection(COLLECTIONS.PRODUCTS);
      const productDocs = await productCollection
        .find(
          { id: { $in: Array.from(new Set(Array.from(selections.values(), (item) => item.productId))) } },
          { session }
        )
        .toArray();
      const products = productDocs.map((document) => {
        const { _id, sortOrder, key, ...product } = document;
        return product as Product;
      });
      const requestedItems = Array.from(selections.values());
      const items = resolveAvailableOrderItems(requestedItems, products);

      for (let index = 0; index < requestedItems.length; index += 1) {
        const requested = requestedItems[index];
        const query = requested.variantId
          ? {
              id: requested.productId,
              variants: {
                $elemMatch: { id: requested.variantId, stock: { $gte: requested.qty } },
              },
            }
          : { id: requested.productId, stock: { $gte: requested.qty } };
        const update = requested.variantId
          ? { $inc: { "variants.$.stock": -requested.qty } }
          : { $inc: { stock: -requested.qty } };
        const result = await productCollection.updateOne(query, update, {
          session,
        });

        if (result.modifiedCount !== 1) {
          const item = items[index];
          throw new StockUnavailableError(
            `Stock for ${item.name}${item.variantName ? ` — ${item.variantName}` : ""} changed. Refresh the POS and try again.`
          );
        }
      }

      const now = new Date().toISOString();
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      const order: Order = {
        id: orderId,
        createdAt: now,
        updatedAt: now,
        channel: "pos",
        customer: {
          name: customerName || "Walk-in customer",
          phone: customerPhone,
          email: "",
          address: "",
          state: "Lagos",
        },
        items,
        fulfilment: "pickup",
        zone: "lagos",
        subtotal,
        deliveryFee: 0,
        pickupDiscount: 0,
        total: subtotal,
        status: "completed",
        payment: {
          method: "bank",
          status: "paid",
          amount: subtotal,
          reference: paymentReference || orderId,
          paidAt: now,
        },
      };

      await db.collection(COLLECTIONS.ORDERS).insertOne(order, { session });
      createdOrder = order;
    });
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!createdOrder) {
    throw new Error("POS sale transaction completed without creating an order.");
  }

  return NextResponse.json({ order: createdOrder }, { status: 201 });
}
