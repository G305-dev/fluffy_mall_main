import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin sign-in is not configured for this deployment." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(
    ADMIN_COOKIE,
    "ok",
    sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE)
  );

  return res;
}