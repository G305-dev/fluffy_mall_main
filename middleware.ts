import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST =
  process.env.ADMIN_HOST || "admin.fluffynyummystore.com";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const forwardedHost = req.headers.get("x-forwarded-host") || "";
  const requestHost = req.headers.get("host") || "";

  const hostname = (forwardedHost || requestHost)
    .split(":")[0]
    .toLowerCase();

  const isAdminSubdomain =
    hostname === ADMIN_HOST.toLowerCase();

  /*
   * Visiting https://admin.fluffynyummy.com
   * redirects to the existing admin login page.
   */
  if (isAdminSubdomain && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";

    return NextResponse.redirect(url);
  }

  /*
   * Protect all /admin pages with the existing admin cookie.
   */
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // Preview-only bypass. Do not enable this in production.
  if (process.env.PREVIEW_ADMIN_BYPASS === "1") {
    return NextResponse.next();
  }

  const session = req.cookies.get("fny_admin")?.value;

  if (session !== "ok") {
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