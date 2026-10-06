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

const noStoreHeaders = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate",
};

export async function GET(req: NextRequest) {
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

  return NextResponse.json(
    {
      authenticated: Boolean(account),
      email: account?.email || null,
      newCustomerDiscountEligible: Boolean(
        account &&
          !account.newCustomerDiscountUsedAt
      ),
      newCustomerDiscountPercent:
        NEW_CUSTOMER_DISCOUNT_PERCENT,
    },
    {
      headers: noStoreHeaders,
    }
  );
}