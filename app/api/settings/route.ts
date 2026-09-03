import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}
