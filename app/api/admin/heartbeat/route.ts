import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  isAdminBypassed,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const hasValidCookie =
    req.cookies.get(ADMIN_COOKIE)?.value === "ok";

  if (!hasValidCookie && !isAdminBypassed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
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