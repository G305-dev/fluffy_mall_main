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

  /*
   * Delete the cookie using the same options used
   * when the customer logged in.
   */
  response.cookies.set(
    CUSTOMER_COOKIE,
    "",
    {
      ...sessionCookieOptions(req, 0),
      expires,
    }
  );

  /*
   * Also clear an older partitioned version that
   * may have been created by the previous cookie
   * configuration.
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
      path: "/",
    }
  );

  return response;
}