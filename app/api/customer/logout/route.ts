import {
  NextRequest,
  NextResponse,
} from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

export function POST(req: NextRequest) {
  const response = NextResponse.json({
    ok: true,
  });

  const expires = new Date(0);

  const paths = [
    "/",
    "/api",
    "/api/customer",
    "/login",
    "/checkout",
  ];

  for (const path of paths) {
    /*
     * Clear the normal production cookie.
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
     * Clear the sandbox/iframe cookie.
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
     * Clear the cookie using the current request
     * cookie configuration as well.
     */
    response.cookies.set(
      CUSTOMER_COOKIE,
      "",
      {
        ...sessionCookieOptions(req, 0),
        expires,
        path,
      }
    );
  }

  return response;
}