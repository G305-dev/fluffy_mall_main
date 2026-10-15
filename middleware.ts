import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST =
  process.env.ADMIN_HOST || "admin.fluffynyummystore.com";
const COOKIE = "fny_admin";
const SESSION_SECONDS = 30 * 60;

async function validSession(token: string | undefined) {
  const secret = process.env.ADMIN_SESSION_SECRET || "";

  if (
    secret.length < 32 ||
    !token ||
    !/^\d{10,11}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)
  ) {
    return false;
  }

  const [expiry, nonce, signature] = token.split(".");
  const now = Math.floor(Date.now() / 1000);

  if (
    Number(expiry) <= now ||
    Number(expiry) > now + SESSION_SECONDS
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const bytes = Uint8Array.from(
    signature.match(/../g) || [],
    (pair) => parseInt(pair, 16)
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(`${expiry}.${nonce}`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();

  if (
    host === ADMIN_HOST.toLowerCase() &&
    pathname === "/"
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (
    !pathname.startsWith("/admin") ||
    pathname.startsWith("/admin/login")
  ) {
    return NextResponse.next();
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PREVIEW_ADMIN_BYPASS === "1"
  ) {
    return NextResponse.next();
  }

  if (
    !(await validSession(req.cookies.get(COOKIE)?.value))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};