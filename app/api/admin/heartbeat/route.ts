import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  isAdminBypassed,
  newAdminSession,
  validAdminSession,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isAdminBypassed()) {
    return NextResponse.json({ ok: true });
  }

  if (
    !validAdminSession(
      req.cookies.get(ADMIN_COOKIE)?.value
    )
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(
    ADMIN_COOKIE,
    newAdminSession(),
    sessionCookieOptions(req, ADMIN_SESSION_MAX_AGE)
  );

  return response;
}