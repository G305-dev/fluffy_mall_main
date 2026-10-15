import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import {
  PosConflictError,
  PosInputError,
  activateNativePos,
  adjustNativeStock,
  applyNativeWebsiteSale,
  createNativeSale,
  posSale,
  previewNativeOpening,
  type PosPayment,
} from "@/lib/native-pos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthed())
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

  try {
    const saleId = req.nextUrl.searchParams.get("sale");
    if (saleId) {
      const sale = await posSale(saleId);
      return sale
        ? NextResponse.json({ sale })
        : NextResponse.json(
            { error: "Sale not found." },
            { status: 404 }
          );
    }
    return NextResponse.json(await previewNativeOpening());
  } catch (error) {
    if (error instanceof PosConflictError)
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    console.error("[POS preview]", error);
    return NextResponse.json(
      { error: "Could not review current website inventory." },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed())
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );

  try {
    const body = await req.json();

    if (body?.action === "activate") {
      if (body.confirm !== "USE CURRENT WEBSITE STOCK")
        throw new PosInputError(
          "Type USE CURRENT WEBSITE STOCK to confirm."
        );
      return NextResponse.json({
        result: await activateNativePos(
          String(body.digest || ""),
          body.reviewedOldPaidOrders === true
        ),
      });
    }

    if (body?.action === "sale") {
      const sale = await createNativeSale({
        requestId: String(body.requestId || ""),
        items: body.items,
        paymentMethod: body.paymentMethod as PosPayment,
        confirmed: body.confirmed === true,
        discount: body.discount,
        customerName: body.customerName,
      });
      return NextResponse.json({ sale }, { status: 201 });
    }

    if (body?.action === "adjust") {
      return NextResponse.json({
        result: await adjustNativeStock({
          productId: String(body.productId || ""),
          change: Number(body.change),
          reason: String(body.reason || ""),
        }),
      });
    }

    if (body?.action === "reconcile") {
      const orderId = String(body.orderId || "");
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(orderId))
        throw new PosInputError(
          "Enter a valid website order ID."
        );
      return NextResponse.json({
        result: await applyNativeWebsiteSale(orderId),
      });
    }

    throw new PosInputError("Unknown POS action.");
  } catch (error) {
    if (
      error instanceof PosInputError ||
      error instanceof SyntaxError
    )
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    if (error instanceof PosConflictError)
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );

    console.error("[POS action]", error);
    return NextResponse.json(
      {
        error:
          "POS could not complete the action. Retry a sale using the same request ID.",
      },
      { status: 500 }
    );
  }
}