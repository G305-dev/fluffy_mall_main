// ─────────────────────────────────────────────────────────────
//  lib/customer-auth.ts  (REPLACE the existing file with this one)
//
//  Customer accounts were stored in `data/customers.json`; they now live in
//  the MongoDB "customers" collection. Existing password hashes are imported
//  as-is by scripts/seed.mjs, so current customers keep logging in unchanged.
//
//  IMPORTANT: this module uses Node crypto + MongoDB, so it is for the Node.js
//  runtime only (route handlers / server components). Do not import it from
//  middleware.ts (which runs on the Edge runtime).
// ─────────────────────────────────────────────────────────────

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDb, COLLECTIONS } from "./mongo";

export const CUSTOMER_COOKIE = "fny_customer";
const CUSTOMER_SECRET =
  process.env.CUSTOMER_SESSION_SECRET || "fluffy-mall-customer-session";

type CustomerSession = {
  email: string;
  version: 2;
};

export type CustomerAccount = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findCustomerAccount(
  email: string
): Promise<CustomerAccount | undefined> {
  const db = await getDb();
  const doc = await db
    .collection(COLLECTIONS.CUSTOMERS)
    .findOne({ email: normalizeEmail(email) });
  if (!doc) return undefined;
  const { _id, ...rest } = doc;
  return rest as CustomerAccount;
}

export async function createCustomerAccount(
  email: string,
  password: string
): Promise<CustomerAccount | null> {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);

  const existing = await col.findOne({ email: normalizedEmail });
  if (existing) return null;

  const salt = randomBytes(16).toString("hex");
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  const account: CustomerAccount = {
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  try {
    await col.insertOne(account);
  } catch (err: any) {
    // Unique-index race: another request created this account first.
    if (err?.code === 11000) return null;
    throw err;
  }
  return account;
}

export async function createGoogleCustomerAccount(
  email: string
): Promise<CustomerAccount> {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  const col = db.collection(COLLECTIONS.CUSTOMERS);

  const existing = await col.findOne({ email: normalizedEmail });
  if (existing) {
    const { _id, ...rest } = existing;
    return rest as CustomerAccount;
  }

  const account: CustomerAccount = {
    email: normalizedEmail,
    passwordHash: "google",
    createdAt: new Date().toISOString(),
  };
  await col.insertOne(account);
  return account;
}

export function verifyCustomerPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  const derivedHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, "hex");
  return (
    storedBuffer.length === derivedHash.length &&
    timingSafeEqual(storedBuffer, derivedHash)
  );
}

function signature(payload: string) {
  return createHmac("sha256", CUSTOMER_SECRET).update(payload).digest("hex");
}

export function createCustomerSession(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email, version: 2 }),
    "utf8"
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readCustomerSession(value?: string): CustomerSession | null {
  if (!value) return null;
  const [payload, providedSignature] = value.split(".");
  if (!payload || !providedSignature || signature(payload) !== providedSignature)
    return null;

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    return session.version === 2 &&
      typeof session.email === "string" &&
      session.email
      ? session
      : null;
  } catch {
    return null;
  }
}
