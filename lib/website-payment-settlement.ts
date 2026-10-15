import { COLLECTIONS, getDb } from "@/lib/mongo";
import { getOrder } from "@/lib/db";
import { sendPaymentEmail } from "@/lib/email";
import { applyNativeWebsiteSale } from "@/lib/native-pos";

export async function confirmVerifiedWebsitePayment(
  orderId: string, reference: string, verifiedPaidAt?: string
) {
  const db = await getDb();
  const orders = db.collection(COLLECTIONS.ORDERS);
  const original = await getOrder(orderId);
  if (!original) throw new Error("Order not found.");
  if (original.payment.method !== "paystack") throw new Error("This is not a Paystack order.");
  if (original.payment.status === "paid" && original.payment.reference &&
      original.payment.reference !== reference) {
    throw new Error("A different payment reference is already recorded for this order.");
  }

  const now = new Date().toISOString();
  const paidAt = verifiedPaidAt && !Number.isNaN(Date.parse(verifiedPaidAt))
    ? new Date(verifiedPaidAt).toISOString() : undefined;
  const updates: Record<string, unknown> = {
    "payment.status": "paid",
    "payment.reference": reference,
    updatedAt: now,
    customerNotified: false,
  };
  if (paidAt) updates["payment.paidAt"] = paidAt;
  if (original.status === "pending_payment") updates.status = "paid";

  await orders.updateOne(
    { id: original.id, "payment.status": { $ne: "paid" } },
    { $set: updates }
  );

  const paidOrder = await getOrder(original.id);
  if (!paidOrder) throw new Error("Order not found after payment verification.");
  if (paidOrder.payment.status !== "paid") throw new Error("Could not record the verified payment.");
  if (paidOrder.payment.reference !== reference) {
    throw new Error("A different successful payment is already recorded for this order. Reconcile the duplicate charge.");
  }

  let inventorySync: { status: string; error?: string };
  try {
    inventorySync = await applyNativeWebsiteSale(paidOrder.id);
  } catch (error) {
    console.error("[native stock] Paid website order needs reconciliation", paidOrder.id, error);
    inventorySync = { status: "failed", error: "Payment succeeded; stock needs admin reconciliation." };
  }

  if (!paidOrder.customerNotified) {
    try {
      if (await sendPaymentEmail(paidOrder, "success")) {
        await orders.updateOne({ id: paidOrder.id }, { $set: { customerNotified: true } });
      }
    } catch (error) {
      console.error("[payment email]", error);
    }
  }

  return { order: await getOrder(paidOrder.id), inventorySync };
}

export async function recordWebsitePaymentFailure(orderId: string, reference: string) {
  const db = await getDb();
  const orders = db.collection(COLLECTIONS.ORDERS);
  const result = await orders.updateOne(
    { id: orderId, "payment.status": { $ne: "paid" } },
    {
      $set: {
        "payment.status": "failed",
        "payment.reference": reference,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  const order = await getOrder(orderId);
  if (result.modifiedCount && order && !order.customerNotified) {
    try {
      if (await sendPaymentEmail(order, "failure")) {
        await orders.updateOne({ id: order.id }, { $set: { customerNotified: true } });
      }
    } catch (error) {
      console.error("[payment failure email]", error);
    }
  }

  return order;
}