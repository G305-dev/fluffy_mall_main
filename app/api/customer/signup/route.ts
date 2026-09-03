import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE, createCustomerAccount, createCustomerSession } from "@/lib/customer-auth";
import { sendWelcomeEmail } from "@/lib/email";
import { sessionCookieOptions } from "@/lib/cookies";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const account = await createCustomerAccount(email, password);
  if (!account) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  try {
    await sendWelcomeEmail(account.email);
  } catch {
    // Account creation should not fail because an email provider is unavailable.
  }

  const response = NextResponse.json({ ok: true, email: account.email });
  response.cookies.set(
    CUSTOMER_COOKIE,
    createCustomerSession(account.email),
    sessionCookieOptions(req, 60 * 60 * 24 * 30)
  );
  return response;
}