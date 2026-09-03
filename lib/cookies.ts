/**
 * Session cookie options that also work when the site is viewed inside the
 * sandbox preview iframe (https://*.e2b.app). Iframes over HTTPS drop
 * SameSite=lax cookies, so we switch to None+Secure on that domain only.
 * On a normal deployment the safer lax settings are kept.
 */
export function sessionCookieOptions(req: Request, maxAge: number) {
  const host = req.headers.get("host") || "";
  const forwardedHost = req.headers.get("x-forwarded-host") || "";
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  const isSandboxPreview =
    host.endsWith(".e2b.app") ||
    forwardedHost.endsWith(".e2b.app") ||
    forwardedProto.includes("https");
  return {
    httpOnly: true,
    sameSite: isSandboxPreview ? ("none" as const) : ("lax" as const),
    secure: isSandboxPreview || process.env.NODE_ENV === "production",
    // Partitioned (CHIPS) lets Chrome keep the cookie even inside the
    // preview iframe, where normal third-party cookies are blocked.
    ...(isSandboxPreview ? { partitioned: true } : {}),
    maxAge,
    path: "/",
  };
}
