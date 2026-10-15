import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getOrder } from "@/lib/db";
import {
  confirmVerifiedWebsitePayment,
  recordWebsitePaymentFailure,
} from "@/lib/website-payment-settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Paystack webhook is not configured." },
      { status: 503 }
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");

  if (
    !/^[0-9a-f]{128}$/i.test(signature) ||
    !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
  ) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid webhook data." }, { status: 400 });
  }

  if (event?.event !== "charge.success" && event?.event !== "charge.failed") {
    return NextResponse.json({ received: true });
  }

  const reference = String(event.data?.reference || "");
  if (!/^PSK-[a-zA-Z0-9-]{1,80}$/.test(reference)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderId = reference.replace(/^PSK-/, "").replace(/-\d+$/, "");
  const order = await getOrder(orderId);
  if (!order || order.payment.method !== "paystack") {
    return NextResponse.json({ received: true, ignored: true });
  }

  if (event.data?.metadata?.order_id && event.data.metadata.order_id !== order.id) {
    return NextResponse.json({ error: "Payment order mismatch." }, { status: 400 });
  }

  try {
    if (event.event === "charge.success") {
      if (
        event.data?.currency !== "NGN" ||
        Number(event.data?.amount) !== Math.round(order.total * 100)
      ) {
        return NextResponse.json(
          { error: "Payment amount or currency mismatch." },
          { status: 400 }
        );
      }

      const result = await confirmVerifiedWebsitePayment(
        order.id,
        reference,
        event.data?.paid_at
      );

      if (!["applied", "already"].includes(result.inventorySync.status)) {
        console.error("[stock review required]", order.id, result.inventorySync);
        return NextResponse.json({ received: true, stockReviewRequired: true });
      }
    } else {
      await recordWebsitePaymentFailure(order.id, reference);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Paystack webhook]", error);
    return NextResponse.json(
      { error: "Verified payment needs a retry or admin review." },
      { status: 500 }
    );
  }
}