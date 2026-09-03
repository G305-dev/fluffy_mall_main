import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-auth";

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
