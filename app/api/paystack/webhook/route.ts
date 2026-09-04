import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOrder, saveOrder } from "@/lib/db";
import { sendPaymentEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (secret) {
    const signature = req.headers.get("x-paystack-signature") || "";
    const hash = crypto.createHmac("sha512", secret).update(raw).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }
  const event = JSON.parse(raw);
  if (event?.event === "charge.success" || event?.event === "charge.failed") {
    const ref = String(event.data?.reference || "");
    const orderId = ref.replace(/^PSK-/, "").replace(/-\d+$/, "");
    const order = await getOrder(orderId);
    if (order && event.event === "charge.success" && order.payment.status !== "paid") {
  }
  return NextResponse.json({ received: true });
}
