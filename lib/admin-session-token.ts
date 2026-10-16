export const ADMIN_COOKIE = "fny_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 30;

export type AdminRole = string;
export type AdminAccessLevel = "admin" | "manager" | "sales_representative";

export type AdminTokenPayload = {
  kind: "staff" | "bootstrap";
  exp: number;
  staffId?: string;
  role?: AdminAccessLevel;
};

function sessionSecret() {
  const secret = process.env.STAFF_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  if (!secret) throw new Error("STAFF_SESSION_SECRET or ADMIN_PASSWORD must be configured.");
  return secret;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createAdminToken(
  payload: Omit<AdminTokenPayload, "exp">,
  maxAge = ADMIN_SESSION_MAX_AGE
) {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + maxAge,
    }))
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(body)
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminToken(token: string | undefined): Promise<AdminTokenPayload | null> {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      fromBase64Url(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AdminTokenPayload;
    if (!payload || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (payload.kind === "bootstrap") return payload;
    if (
      payload.kind !== "staff" ||
      typeof payload.staffId !== "string" ||
      !["admin", "manager", "sales_representative"].includes(payload.role || "")
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
