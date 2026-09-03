import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "ok", sessionCookieOptions(req, 60 * 60 * 24 * 7));
  return res;
}
