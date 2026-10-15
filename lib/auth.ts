import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fny_admin";
export const ADMIN_SESSION_MAX_AGE = 30 * 60;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.ADMIN_SESSION_SECRET || "";

export function adminAuthConfigured() {
  return Boolean(ADMIN_PASSWORD) && SECRET.length >= 32;
}

export function isAdminBypassed() {
  // Only a local/sandbox preview may bypass staff authentication.
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.PREVIEW_ADMIN_BYPASS === "1"
  );
}

export function newAdminSession() {
  if (!adminAuthConfigured()) {
    throw new Error(
      "Set ADMIN_PASSWORD and a random ADMIN_SESSION_SECRET of at least 32 characters."
    );
  }

  const expires =
    Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `${expires}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export function validAdminSession(token: string | undefined) {
  if (
    !adminAuthConfigured() ||
    !token ||
    !/^\d{10,11}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)
  ) {
    return false;
  }

  const [expiry, nonce, signature] = token.split(".");
  const now = Math.floor(Date.now() / 1000);

  if (
    Number(expiry) <= now ||
    Number(expiry) > now + ADMIN_SESSION_MAX_AGE
  ) {
    return false;
  }

  const expected = createHmac("sha256", SECRET)
    .update(`${expiry}.${nonce}`)
    .digest();

  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    expected
  );
}

export function isAdminAuthed() {
  return (
    isAdminBypassed() ||
    validAdminSession(cookies().get(ADMIN_COOKIE)?.value)
  );
}