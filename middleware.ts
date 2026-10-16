import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-session-token";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST =
  process.env.ADMIN_HOST || "admin.fluffynyummystore.com";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const forwardedHost = req.headers.get("x-forwarded-host") || "";
  const requestHost = req.headers.get("host") || "";

  const hostname = (forwardedHost || requestHost)
    .split(":")[0]
    .toLowerCase();

  const isAdminSubdomain =
    hostname === ADMIN_HOST.toLowerCase();

  /*
   * Visiting https://admin.fluffynyummystore.com
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

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Preview-only bypass. Do not enable this in production.
  if (process.env.PREVIEW_ADMIN_BYPASS === "1") {
    return NextResponse.next();
  }

  const session = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
  const isSetupPath =
    pathname === "/admin/staff/setup" ||
    pathname === "/api/admin/staff/setup";
  const hasValidSession =
    session?.kind === "staff" ||
    (session?.kind === "bootstrap" && isSetupPath);

  if (!hasValidSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);

    return NextResponse.redirect(url);
  }

  if (session?.kind === "bootstrap" && !isSetupPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/staff/setup";
    return NextResponse.redirect(url);
  }

  if (session?.kind === "staff") {
    const salesRepresentativePath =
      pathname === "/admin" ||
      pathname === "/admin/orders" ||
      pathname.startsWith("/admin/orders/") ||
      pathname === "/admin/pos";
    const adminOnlyPath =
      pathname === "/admin/staff" ||
      pathname.startsWith("/admin/staff/");
    if (
      (session.role === "sales_representative" && !salesRepresentativePath) ||
      (session.role === "manager" && adminOnlyPath)
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
