import {
  NextRequest,
  NextResponse,
} from "next/server";
import { randomBytes } from "crypto";

function allowedNext(value: string | null) {
  return value === "/checkout"
    ? "/checkout"
    : "/";
}

function errorUrl(
  appUrl: string,
  next: string,
  message: string
) {
  const url = new URL(next, appUrl);
  url.searchParams.set(
    "authError",
    message
  );
  return url;
}

export function GET(req: NextRequest) {
  const clientId =
    process.env.GOOGLE_CLIENT_ID;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin;

  const next = allowedNext(
    req.nextUrl.searchParams.get("next")
  );

  if (!clientId) {
    return NextResponse.redirect(
      errorUrl(
        appUrl,
        next,
        "Google sign-in is not configured yet"
      )
    );
  }

  const state = randomBytes(24).toString(
    "hex"
  );

  const redirectUri = `${appUrl}/api/customer/google/callback`;

  const googleUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );

  googleUrl.searchParams.set(
    "client_id",
    clientId
  );

  googleUrl.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  googleUrl.searchParams.set(
    "response_type",
    "code"
  );

  googleUrl.searchParams.set(
    "scope",
    "openid email"
  );

  googleUrl.searchParams.set(
    "state",
    state
  );

  const response =
    NextResponse.redirect(googleUrl);

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV ===
      "production",
    maxAge: 600,
    path: "/",
  };

  response.cookies.set(
    "fny_google_state",
    state,
    cookieOptions
  );

  response.cookies.set(
    "fny_google_next",
    next,
    cookieOptions
  );

  return response;
}