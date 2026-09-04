import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getOrder, saveOrder } from "@/lib/db";
import { sendPaymentEmail } from "@/lib/email";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const order = await getOrder(params.id);

  if (!order) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const body = await req.json();

  if (body.status) {
    order.status = body.status as OrderStatus;
  }

  if (body.verifyBank === true) {
    if (order.payment.method !== "bank_transfer") {
      return NextResponse.json(
        {
          error:
            "This order does not use bank transfer.",
        },
        { status: 400 }
      );
    }

    order.payment.status = "paid";
    order.payment.paidAt = new Date().toISOString();
    order.payment.reference =
      order.payment.reference || order.id;

    order.status =
      order.fulfilment === "pickup"
        ? "awaiting_pickup"
        : "paid";
  }

  order.updatedAt = new Date().toISOString();

  /*
   * Save the payment confirmation first.
   */
  await saveOrder(order);

  let receiptSent: boolean | undefined;

  /*
   * Send the receipt only after the admin confirms
   * a bank-transfer payment.
   */
  if (
    body.verifyBank === true &&
    order.payment.method === "bank_transfer"
  ) {
    if (order.customerNotified) {
      receiptSent = true;
    } else {
      receiptSent = await sendPaymentEmail(
        order,
        "success"
      );

      if (receiptSent) {
        order.customerNotified = true;
        order.updatedAt = new Date().toISOString();
        await saveOrder(order);
      }
    }
  }

  return NextResponse.json({
    order,
    receiptSent,
  });
}
