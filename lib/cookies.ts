/**
 * Customer/admin cookie options.
 *
 * Sandbox previews need SameSite=None and Partitioned because
 * the site can be displayed inside an iframe. Normal production
 * domains use SameSite=Lax.
 */
export function sessionCookieOptions(
  req: Request,
  maxAge: number
) {
  const host =
    req.headers.get("host") || "";

  const forwardedHost =
    req.headers.get("x-forwarded-host") || "";

  const isSandboxPreview =
    host.endsWith(".e2b.app") ||
    forwardedHost.endsWith(".e2b.app");

  return {
    httpOnly: true,
    sameSite: isSandboxPreview
      ? ("none" as const)
      : ("lax" as const),
    secure:
      isSandboxPreview ||
      process.env.NODE_ENV === "production",
    ...(isSandboxPreview
      ? { partitioned: true }
      : {}),
    maxAge,
    path: "/",
  };
}