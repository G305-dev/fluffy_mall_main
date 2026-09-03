import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/db";

export async function PUT(req: NextRequest) {
  if (!isAdminAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const current = await getSettings();
  const next = { ...current, ...body };
  await saveSettings(next);
  return NextResponse.json({ settings: next });
}
