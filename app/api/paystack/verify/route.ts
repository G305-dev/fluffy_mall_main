import { NextRequest, NextResponse } from "next/server";
import { getOrder, saveOrder } from "@/lib/db";
import { sendPaymentEmail } from "@/lib/email";

/**
 * Server-side verification after the Paystack inline popup reports success.
 * Never trust the browser alone: we confirm the transaction with Paystack's
 * API using the secret key before marking the order paid.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Paystack is not configured on this server." },
      { status: 501 }
    );
  }

  const { reference } = await req.json();
  if (!reference || typeof reference !== "string") {
    return NextResponse.json({ error: "Missing transaction reference." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" }
  );
  const data = await res.json();

  if (!res.ok || !data.status) {
    return NextResponse.json(
      { error: data.message || "Could not verify transaction." },
      { status: 502 }
    );
  }

  const tx = data.data;
  const orderId = String(tx.reference || "").replace(/^PSK-/, "").replace(/-\d+$/, "");
  const order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (tx.status === "success") {
    // Amount is returned in kobo; make sure it covers the order total.
    if (Number(tx.amount) < order.total * 100) {
      return NextResponse.json(
        { error: "Paid amount does not match the order total." },
        { status: 400 }
      );
    }
    if (order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date().toISOString();
      order.payment.reference = tx.reference;
      order.status = "paid";
      order.updatedAt = new Date().toISOString();
      await saveOrder(order);
      if (!order.customerNotified) {
        order.customerNotified = await sendPaymentEmail(order, "success");
        await saveOrder(order);
      }
    }
    return NextResponse.json({ ok: true, order });
  }

  order.payment.status = "failed";
  order.payment.reference = tx.reference;
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);
  return NextResponse.json({ ok: false, order });
}
