import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-auth";

export function GET(req: NextRequest) {
  const session = readCustomerSession(req.cookies.get(CUSTOMER_COOKIE)?.value);
  return NextResponse.json({ authenticated: Boolean(session), email: session?.email || null });
}
