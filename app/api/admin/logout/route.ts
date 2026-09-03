import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  // Redirect to a fixed, reachable origin instead of echoing the request host
  // (which can be "0.0.0.0:3000" and cause ERR_ADDRESS_INVALID in the browser).
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    req.nextUrl.origin;

  const res = NextResponse.redirect(new URL("/admin/login", appUrl));
  res.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(req, 0));
  return res;
}
