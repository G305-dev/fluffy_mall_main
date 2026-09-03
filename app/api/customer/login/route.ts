import { NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE,
  createCustomerSession,
  findCustomerAccount,
  verifyCustomerPassword,
} from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  const account = await findCustomerAccount(email);
  if (!account) {
    return NextResponse.json({ error: "No account found for this email." }, { status: 404 });
  }
  if (!verifyCustomerPassword(password, account.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, email });
  response.cookies.set(
    CUSTOMER_COOKIE,
    createCustomerSession(email),
    sessionCookieOptions(req, 60 * 60 * 24 * 30)
  );
  return response;
}
