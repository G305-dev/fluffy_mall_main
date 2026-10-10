import {
  NextRequest,
  NextResponse,
} from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

const LEGACY_CUSTOMER_COOKIE =
  "fny_customer";

function logoutResponse(req: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/", req.url),
    303
  );

  const expiredCookieOptions = {
    ...sessionCookieOptions(req, 0),
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  };

  /*
   * Clear the current customer cookie.
   */
  response.cookies.set(
    CUSTOMER_COOKIE,
    "",
    expiredCookieOptions
  );

  /*
   * Clear the previous customer cookie name.
   */
  response.cookies.set(
    LEGACY_CUSTOMER_COOKIE,
    "",
    expiredCookieOptions
  );

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );

  return response;
}

export function GET(req: NextRequest) {
  return logoutResponse(req);
}

export function POST(req: NextRequest) {
  return logoutResponse(req);
}