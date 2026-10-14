import { NextRequest, NextResponse } from "next/server";
import bwipjs from "bwip-js/node";
import { isAdminAuthed } from "@/lib/auth";
import { code128Text } from "@/lib/product-barcodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const text = code128Text(req.nextUrl.searchParams.get("value"));
    const svg = bwipjs.toSVG({
      bcid: "code128",
      text,
      scale: 3,
      height: 14,
      includetext: true,
      textxalign: "center",
      paddingwidth: 8,
      paddingheight: 8,
    });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid Code 128 barcode." }, { status: 400 });
  }
}