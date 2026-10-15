import { NextRequest, NextResponse } from "next/server";
import { getOrder, saveOrder } from "@/lib/db";
import {
  CUSTOMER_COOKIE,
  readCustomerSession,
} from "@/lib/customer-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await getOrder(params.id);

  if (!order) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      {
        error: "You must sign in to view this order.",
      },
      { status: 401 }
    );
  }

  if (
    (order.customer.email || "").toLowerCase() !==
    session.email.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: "You can only view your own orders.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ order });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const order = await getOrder(params.id);

  if (!order) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      {
        error: "You must sign in to update this order.",
      },
      { status: 401 }
    );
  }

  if (
    (order.customer.email || "").toLowerCase() !==
    session.email.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: "You can only update your own orders.",
      },
      { status: 403 }
    );
  }

  const body = await req.json();
  const action = body.action as string;

  if (action === "paystack_success") {
    if (order.payment.method !== "paystack") {
      return NextResponse.json(
        {
          error: "This order is not a Paystack order.",
        },
        { status: 400 }
      );
    }

    order.status =
      order.fulfilment === "pickup"
        ? "awaiting_pickup"
        : "paid";

    order.payment.status = "paid";
    order.payment.paidAt =
      new Date().toISOString();
    order.payment.reference =
      body.reference || order.id;
    order.customerNotified = true;
    order.updatedAt = new Date().toISOString();

    await saveOrder(order);

    return NextResponse.json({ order });
  }

  if (action === "paystack_failed") {
    if (order.payment.method !== "paystack") {
      return NextResponse.json(
        {
          error: "This order is not a Paystack order.",
        },
        { status: 400 }
      );
    }

    order.payment.status = "failed";
    order.updatedAt = new Date().toISOString();

    await saveOrder(order);

    return NextResponse.json({ order });
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 }
  );
}