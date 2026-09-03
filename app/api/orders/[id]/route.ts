import { NextRequest, NextResponse } from "next/server";
import { getOrder, saveOrder } from "@/lib/db";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Guest checkout: knowing the order id grants access (it is only shown to
  // the person who placed the order). If a session exists it must match.
  const session = readCustomerSession(_req.cookies.get(CUSTOMER_COOKIE)?.value);
  if (session && (order.customer.email || "").toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "You can only view your own orders." }, { status: 403 });
  }
  return NextResponse.json({ order });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = readCustomerSession(req.cookies.get(CUSTOMER_COOKIE)?.value);
  if (session && (order.customer.email || "").toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "You can only update your own orders." }, { status: 403 });
  }
  const body = await req.json();
  const action = body.action as string;

  if (action === "mark_transferred") {
    order.status = "awaiting_verification";
    order.payment.status = "awaiting_verification";
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    return NextResponse.json({ order });
  }

  if (action === "paystack_success") {
    // Demo / test-mode confirmation. Live Paystack should use the webhook.
    order.status = order.fulfilment === "pickup" ? "awaiting_pickup" : "paid";
    if (order.fulfilment !== "pickup") order.status = "paid";
    order.payment.status = "paid";
    order.payment.paidAt = new Date().toISOString();
    order.payment.reference = body.reference || order.id;
    order.customerNotified = true;
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    return NextResponse.json({ order });
  }

  if (action === "paystack_failed") {
    order.payment.status = "failed";
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);
    return NextResponse.json({ order });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
