import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  if (!clientId) {
    return NextResponse.redirect(new URL("/checkout?authError=Google+sign-in+is+not+configured+yet", appUrl));
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = `${appUrl}/api/customer/google/callback`;
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email");
  googleUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set("fny_google_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}