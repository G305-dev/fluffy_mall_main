import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { getDb, COLLECTIONS } from "./mongo";

export const CUSTOMER_COOKIE = "fny_customer_v2";

const CUSTOMER_SECRET =
  process.env.CUSTOMER_SESSION_SECRET ||
  "fluffy-mall-customer-session";

type CustomerSession = {
  email: string;
  version: 2;
};

export type CustomerAccount = {
  email: string;
  passwordHash: string;
  createdAt: string;
  newCustomerDiscountUsedAt?: string;
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
    .findOne({
      email: normalizeEmail(email),
    });

  if (!doc) {
    return undefined;
  }

  const {
    _id,
    ...rest
  } = doc;

  return rest as CustomerAccount;
}

export async function createCustomerAccount(
  email: string,
  password: string
): Promise<CustomerAccount | null> {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  const collection = db.collection(
    COLLECTIONS.CUSTOMERS
  );

  const existing = await collection.findOne({
    email: normalizedEmail,
  });

  if (existing) {
    return null;
  }

  const salt = randomBytes(16).toString("hex");

  const passwordHash = `${salt}:${scryptSync(
    password,
    salt,
    64
  ).toString("hex")}`;

  const account: CustomerAccount = {
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  try {
    await collection.insertOne(account);
  } catch (error: any) {
    if (error?.code === 11000) {
      return null;
    }

    throw error;
  }

  return account;
}

export async function createGoogleCustomerAccount(
  email: string
): Promise<CustomerAccount> {
  const normalizedEmail = normalizeEmail(email);
  const db = await getDb();
  const collection = db.collection(
    COLLECTIONS.CUSTOMERS
  );

  const existing = await collection.findOne({
    email: normalizedEmail,
  });

  if (existing) {
    const {
      _id,
      ...rest
    } = existing;

    return rest as CustomerAccount;
  }

  const account: CustomerAccount = {
    email: normalizedEmail,
    passwordHash: "google",
    createdAt: new Date().toISOString(),
  };

  await collection.insertOne(account);

  return account;
}

export function verifyCustomerPassword(
  password: string,
  passwordHash: string
) {
  const [salt, storedHash] =
    passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedHash = scryptSync(
    password,
    salt,
    64
  );

  const storedBuffer = Buffer.from(
    storedHash,
    "hex"
  );

  return (
    storedBuffer.length ===
      derivedHash.length &&
    timingSafeEqual(
      storedBuffer,
      derivedHash
    )
  );
}

/**
 * Atomically claims the one-time new-customer
 * discount for an account.
 *
 * Returns true only for the request that successfully
 * claims the discount.
 */
export async function claimNewCustomerDiscount(
  email: string
): Promise<boolean> {
  const db = await getDb();

  const updated = await db
    .collection(COLLECTIONS.CUSTOMERS)
    .findOneAndUpdate(
      {
        email: normalizeEmail(email),
        $or: [
          {
            newCustomerDiscountUsedAt: {
              $exists: false,
            },
          },
          {
            newCustomerDiscountUsedAt: null,
          },
          {
            newCustomerDiscountUsedAt: "",
          },
        ],
      },
      {
        $set: {
          newCustomerDiscountUsedAt:
            new Date().toISOString(),
        },
      },
      {
        returnDocument: "after",
        includeResultMetadata: false,
      }
    );

  return Boolean(updated);
}

function signature(payload: string) {
  return createHmac("sha256", CUSTOMER_SECRET)
    .update(payload)
    .digest("hex");
}

export function createCustomerSession(
  email: string
) {
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      version: 2,
    }),
    "utf8"
  ).toString("base64url");

  return `${payload}.${signature(payload)}`;
}

export function readCustomerSession(
  value?: string
): CustomerSession | null {
  if (!value) {
    return null;
  }

  const [
    payload,
    providedSignature,
  ] = value.split(".");

  if (
    !payload ||
    !providedSignature ||
    signature(payload) !== providedSignature
  ) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(
        payload,
        "base64url"
      ).toString("utf8")
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