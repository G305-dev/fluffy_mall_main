import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  ADMIN_SESSION_MAX_AGE,
  adminAuthConfigured,
  newAdminSession,
} from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!adminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin login is not configured." },
      { status: 503 }
    );
  }

  let password: unknown;

  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json(
      { error: "Enter your password." },
      { status: 400 }
    );
  }

  const supplied =
    typeof password === "string"
      ? Buffer.from(password)
      : Buffer.alloc(0);
  const expected = Buffer.from(ADMIN_PASSWORD);

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return NextResponse.json(
      { error: "Invalid password." },
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