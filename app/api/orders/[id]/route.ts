import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/db";
import {
  CUSTOMER_COOKIE,
  readCustomerSession,
} from "@/lib/customer-auth";
import { nativePosControl } from "@/lib/native-pos";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      { error: "Sign in to view this order." },
      { status: 401 }
    );
  }

  const order = await getOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    (order.customer.email || "").toLowerCase() !==
    session.email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "You can only view your own orders." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    order,
    checkoutPaused: !(await nativePosControl()),
  });
}

// Payment states must NEVER be set from a browser claim. Only a verified
// Paystack API response or a signed Paystack webhook may confirm payment.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Payment status can only be updated by verified Paystack callbacks.",
    },
    { status: 403 }
  );
}