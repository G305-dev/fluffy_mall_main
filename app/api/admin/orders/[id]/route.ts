import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getOrder } from "@/lib/db";
import { COLLECTIONS, getDb } from "@/lib/mongo";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "pending_payment", "paid", "processing", "out_for_delivery",
  "awaiting_pickup", "completed", "cancelled", "refunded",
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const status = body.status as OrderStatus;
  if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const existing = await getOrder(params.id);
  if (!existing) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (status === "paid" && existing.payment.status !== "paid") {
    return NextResponse.json({ error: "Payment must be verified before the order can be marked paid." }, { status: 409 });
  }

  const db = await getDb();
  const result = await db.collection(COLLECTIONS.ORDERS).updateOne(
    { id: params.id }, { $set: { status, updatedAt: new Date().toISOString() } }
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // This changes fulfilment status only. It cannot mark a payment paid or
  // change stock; only verified server-side payment callbacks do that.
  return NextResponse.json({ order: await getOrder(params.id) });
}