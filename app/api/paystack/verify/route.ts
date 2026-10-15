import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Paystack is not configured." }, { status: 503 });
  }

  let reference: unknown;
  try {
    ({ reference } = await req.json());
  } catch {
    return NextResponse.json({ error: "Send a payment reference." }, { status: 400 });
  }

  if (typeof reference !== "string" || !/^PSK-[a-zA-Z0-9-]{1,80}$/.test(reference)) {
    return NextResponse.json({ error: "Invalid payment reference." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      }
    );
    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Could not verify payment." },
        { status: 502 }
      );
    }

    const transaction = data.data;
    if (transaction?.reference !== reference) {
      return NextResponse.json({ error: "Payment reference mismatch." }, { status: 400 });
    }

    const orderId = reference.replace(/^PSK-/, "").replace(/-\d+$/, "");
    const order = await getOrder(orderId);
    if (!order || order.payment.method !== "paystack") {
      return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
    }

    if (transaction.metadata?.order_id && transaction.metadata.order_id !== order.id) {
      return NextResponse.json({ error: "Payment order mismatch." }, { status: 400 });
    }

    if (transaction.status === "success") {
      if (
        transaction.currency !== "NGN" ||
        Number(transaction.amount) !== Math.round(order.total * 100)
      ) {
        return NextResponse.json(
          { error: "Verified amount or currency does not match the order." },
          { status: 400 }
        );
      }

      const result = await confirmVerifiedWebsitePayment(
        order.id,
        reference,
        transaction.paid_at
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (transaction.status === "failed" || transaction.status === "abandoned") {
      const updated = await recordWebsitePaymentFailure(order.id, reference);
      return NextResponse.json({ ok: false, order: updated });
    }

    return NextResponse.json({ ok: false, status: transaction.status || "pending" });
  } catch (error) {
    console.error("[Paystack verify]", error);
    return NextResponse.json(
      {
        error:
          "Payment could not be verified yet. If charged, your order will be reconciled.",
      },
      { status: 502 }
    );
  }
}