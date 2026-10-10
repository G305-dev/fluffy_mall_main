import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  CUSTOMER_COOKIE,
  findCustomerAccount,
  readCustomerSession,
} from "@/lib/customer-auth";
import {
  NEW_CUSTOMER_DISCOUNT_PERCENT,
} from "@/lib/promotions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie",
};

export async function GET(
  req: NextRequest
) {
  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        email: null,
        newCustomerDiscountEligible: false,
        newCustomerDiscountPercent:
          NEW_CUSTOMER_DISCOUNT_PERCENT,
      },
      {
        headers: noStoreHeaders,
      }
    );
  }

  const account = await findCustomerAccount(
    session.email
  );

  if (!account) {
    const response = NextResponse.json(
      {
        authenticated: false,
        email: null,
        newCustomerDiscountEligible: false,
        newCustomerDiscountPercent:
          NEW_CUSTOMER_DISCOUNT_PERCENT,
      },
      {
        headers: noStoreHeaders,
      }
    );

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
        expires: new Date(0),
        path: "/",
      }
    );

    return response;
  }

  return NextResponse.json(
    {
      authenticated: true,
      email: account.email,
      newCustomerDiscountEligible:
        !account.newCustomerDiscountUsedAt,
      newCustomerDiscountPercent:
        NEW_CUSTOMER_DISCOUNT_PERCENT,
    },
    {
      headers: noStoreHeaders,
    }
  );
}