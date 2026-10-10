import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  CUSTOMER_COOKIE,
  markCustomerWelcomeShown,
  readCustomerSession,
} from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest
) {
  const session = readCustomerSession(
    req.cookies.get(CUSTOMER_COOKIE)?.value
  );

  if (!session) {
    return NextResponse.json(
      {
        error: "You must be signed in.",
      },
      { status: 401 }
    );
  }

  try {
    const marked =
      await markCustomerWelcomeShown(
        session.email
      );

    return NextResponse.json({
      ok: true,
      marked,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not mark welcome message as seen.",
      },
      { status: 500 }
    );
  }
}