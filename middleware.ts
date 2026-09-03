import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  // Preview-only bypass (see lib/auth.ts) for browsers that block iframe cookies.
  if (process.env.PREVIEW_ADMIN_BYPASS === "1") return NextResponse.next();
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
  matcher: ["/admin/:path*"],
};
