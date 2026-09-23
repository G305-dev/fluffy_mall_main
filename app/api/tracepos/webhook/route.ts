import { NextRequest, NextResponse } from "next/server";
import { syncWebsiteStockFromTracepos } from "@/lib/inventory-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_EVENTS = new Set([
  "sales.created",
  "sales.updated",
  "sales.deleted",
  "purchases.created",
  "stock_transfers.created",
  "inventory.adjusted",
  "product.created",
  "product.updated",
  "product.deleted",
]);

export async function POST(req: NextRequest) {
  const webhookSecret =
    process.env.TRACEPOS_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error:
          "Tracepos webhook secret is not configured.",
      },
      { status: 503 }
    );
  }

  const authorization =
    req.headers.get("authorization")?.trim() || "";

  if (
    authorization !==
    `Bearer ${webhookSecret}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const rawBody = await req.text();

  let payload: {
    event_type?: unknown;
    data?: {
      warehouse_slug?: unknown;
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const eventType = String(
    payload.event_type || ""
  );

  if (!SUPPORTED_EVENTS.has(eventType)) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Unsupported event type.",
      event_type: eventType,
    });
  }

  const configuredWarehouse =
    process.env.TRACEPOS_WAREHOUSE_SLUG?.trim();

  const eventWarehouse = String(
    payload.data?.warehouse_slug || ""
  ).trim();

  if (
    configuredWarehouse &&
    eventWarehouse &&
    configuredWarehouse !== eventWarehouse
  ) {
    return NextResponse.json({
      received: true,
      ignored: true,
      reason: "Warehouse does not match.",
    });
  }

  try {
    const result =
      await syncWebsiteStockFromTracepos();

    return NextResponse.json({
      received: true,
      event_type: eventType,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tracepos stock sync failed.",
      },
      { status: 500 }
    );
  }
}