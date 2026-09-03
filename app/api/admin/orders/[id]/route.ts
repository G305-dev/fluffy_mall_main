import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getOrder, saveOrder } from "@/lib/db";
import { OrderStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const order = await getOrder(params.id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if (body.status) {
    order.status = body.status as OrderStatus;
  }
  if (body.verifyBank === true) {
    order.payment.status = "paid";
    order.payment.paidAt = new Date().toISOString();
    order.status = order.fulfilment === "pickup" ? "awaiting_pickup" : "paid";
  }
  order.updatedAt = new Date().toISOString();
  await saveOrder(order);
  return NextResponse.json({ order });
}
