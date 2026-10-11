import {
  createHmac,
  timingSafeEqual,
} from "crypto";

function getSecret() {
  const secret =
    process.env.SUBSCRIBER_UNSUBSCRIBE_SECRET ||
    process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SUBSCRIBER_UNSUBSCRIBE_SECRET is not configured."
    );
  }

  return secret;
}

export function normalizeSubscriberEmail(
  email: string
) {
  return email.trim().toLowerCase();
}

export function createSubscriberToken(
  email: string
) {
  return createHmac(
    "sha256",
    getSecret()
  )
    .update(
      normalizeSubscriberEmail(email)
    )
    .digest("hex");
}

export function verifySubscriberToken(
  email: string,
  token: string
) {
  try {
    const expected = Buffer.from(
      createSubscriberToken(email),
      "hex"
    );

    const received = Buffer.from(
      token,
      "hex"
    );

    return (
      expected.length === received.length &&
      timingSafeEqual(expected, received)
    );
  } catch {
    return false;
  }
}