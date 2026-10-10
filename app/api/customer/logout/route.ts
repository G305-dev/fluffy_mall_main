import {
  NextRequest,
  NextResponse,
} from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

const COOKIE_PATHS = [
  "/",
  "/api",
  "/api/customer",
  "/login",
  "/checkout",
];

function expireCustomerCookies(
  req: NextRequest,
  response: NextResponse
) {
  const expires = new Date(0);

  /*
   * Clear the default cookie.
   */
  response.cookies.delete(CUSTOMER_COOKIE);

  for (const path of COOKIE_PATHS) {
    /*
     * Clear normal production cookies.
     */
    response.cookies.set(
      CUSTOMER_COOKIE,
      "",
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        maxAge: 0,
        expires,
        path,
      }
    );

    /*
     * Clear sandbox/iframe cookies.
     */
    response.cookies.set(
      CUSTOMER_COOKIE,
      "",
      {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        partitioned: true,
        maxAge: 0,
        expires,
        path,
      }
    );

    /*
     * Clear cookies created using the current
     * session-cookie configuration.
     */
    response.cookies.set(
      CUSTOMER_COOKIE,
      "",
      {
        ...sessionCookieOptions(req, 0),
        expires,
        maxAge: 0,
        path,
      }
    );
  }
}

function logoutResponse(req: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/", req.url),
    303
  );

  expireCustomerCookies(req, response);

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0"
  );

  return response;
}

/*
 * Direct browser navigation uses GET.
 */
export function GET(req: NextRequest) {
  return logoutResponse(req);
}

/*
 * Keep POST available for any existing callers.
 */
export function POST(req: NextRequest) {
  return logoutResponse(req);
}