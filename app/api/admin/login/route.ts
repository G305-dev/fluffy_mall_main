import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(
    ADMIN_COOKIE,
    "ok",
    sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE)
  );

  return res;
}