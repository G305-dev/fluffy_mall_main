import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  CUSTOMER_COOKIE,
  createGoogleCustomerAccount,
  createCustomerSession,
} from "@/lib/customer-auth";
import { sessionCookieOptions } from "@/lib/cookies";

function allowedNext(value?: string) {
  return value === "/checkout"
    ? "/checkout"
    : "/";
}

function errorRedirect(
  appUrl: string,
  next: string,
  message: string
) {
  const url = new URL(next, appUrl);

  url.searchParams.set(
    "authError",
    message
  );

  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest
) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin;

  const next = allowedNext(
    request.cookies.get(
      "fny_google_next"
    )?.value
  );

  const code =
    request.nextUrl.searchParams.get(
      "code"
    );

  const state =
    request.nextUrl.searchParams.get(
      "state"
    );

  const savedState =
    request.cookies.get(
      "fny_google_state"
    )?.value;

  const clientId =
    process.env.GOOGLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET;

  if (
    !code ||
    !state ||
    state !== savedState ||
    !clientId ||
    !clientSecret
  ) {
    return errorRedirect(
      appUrl,
      next,
      "Google sign-in could not be completed"
    );
  }

  const redirectUri = `${appUrl}/api/customer/google/callback`;

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  );

  if (!tokenResponse.ok) {
    return errorRedirect(
      appUrl,
      next,
      "Google sign-in failed"
    );
  }

  const tokens =
    await tokenResponse.json();

  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    }
  );

  const profile =
    await profileResponse.json();

  if (
    !profileResponse.ok ||
    !profile.email ||
    profile.email_verified === false
  ) {
    return errorRedirect(
      appUrl,
      next,
      "Google email could not be verified"
    );
  }

  const account =
    await createGoogleCustomerAccount(
      profile.email
    );

  const response =
    NextResponse.redirect(
      new URL(next, appUrl)
    );

  response.cookies.set(
    CUSTOMER_COOKIE,
    createCustomerSession(account.email),
    sessionCookieOptions(
      request,
      60 * 60 * 24 * 30
    )
  );

  const expiredCookieOptions = {
    maxAge: 0,
    expires: new Date(0),
    path: "/",
  };

  response.cookies.set(
    "fny_google_state",
    "",
    expiredCookieOptions
  );

  response.cookies.set(
    "fny_google_next",
    "",
    expiredCookieOptions
  );

  return response;
}