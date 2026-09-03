import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_COOKIE,
  createGoogleCustomerAccount,
  createCustomerSession,
} from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("fny_google_state")?.value;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !state || state !== savedState || !clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/checkout?authError=Google+sign-in+could+not+be+completed", appUrl));
  }

  const redirectUri = `${appUrl}/api/customer/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/checkout?authError=Google+sign-in+failed", appUrl));
  }

  const tokens = await tokenResponse.json();
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
    return NextResponse.redirect(new URL("/checkout?authError=Google+email+could+not+be+verified", appUrl));
  }

  const account = await createGoogleCustomerAccount(profile.email);
  const response = NextResponse.redirect(new URL("/checkout", appUrl));
  response.cookies.set(
    CUSTOMER_COOKIE,
    createCustomerSession(account.email),
    sessionCookieOptions(req, 60 * 60 * 24 * 30)
  );
  response.cookies.set("fny_google_state", "", { maxAge: 0, path: "/" });
  return response;
}