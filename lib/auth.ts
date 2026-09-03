import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fny_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 5;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "FluffyAdmin1";

/**
 * Sandbox-preview escape hatch: some browsers block ALL third-party cookies
 * inside the preview iframe, so cookie-based admin sessions cannot work there.
 * Set PREVIEW_ADMIN_BYPASS=1 in .env.local (never in production) to let the
 * preview open /admin without a session cookie. The preview itself is already
 * protected by the sandbox traffic-access token.
 */
export function isAdminBypassed() {
  return process.env.PREVIEW_ADMIN_BYPASS === "1";
}

export function isAdminAuthed() {
  return isAdminBypassed() || cookies().get(ADMIN_COOKIE)?.value === "ok";
}

