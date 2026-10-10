import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { syncWebsiteStockFromTracepos } from "@/lib/inventory-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result =
      await syncWebsiteStockFromTracepos();

    return NextResponse.json({
      ok: true,
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