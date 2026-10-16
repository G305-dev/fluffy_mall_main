import { NextRequest, NextResponse } from "next/server";
import { isStaffAuthed } from "@/lib/auth";
import { getOrder, saveOrder } from "@/lib/db";
import type { OrderStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: { id: string };
  }
) {
  if (!await isStaffAuthed()) {
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

  order.updatedAt = new Date().toISOString();

  await saveOrder(order);

  const latestOrder = await getOrder(order.id);

  return NextResponse.json({
    order: latestOrder || order,
  });
}