import {
  COLLECTIONS,
  getDb,
} from "@/lib/mongo";
import type { Subscriber } from "@/lib/types";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toSubscriber(
  document: Record<string, unknown>
): Subscriber {
  const {
    _id,
    ...subscriber
  } = document;

  return subscriber as Subscriber;
}

export async function addSubscriber(input: {
  name: string;
  email: string;
}) {
  const db = await getDb();

  const collection = db.collection(
    COLLECTIONS.SUBSCRIBERS
  );

  await collection.createIndex(
    { email: 1 },
    { unique: true }
  );

  const email = normalizeEmail(
    input.email
  );

  const name = input.name.trim();

  const result = await collection.updateOne(
    { email },
    {
      $set: {
        name,
        email,
      },
      $setOnInsert: {
        subscribedAt:
          new Date().toISOString(),
      },
      $unset: {
        unsubscribedAt: "",
      },
    },
    { upsert: true }
  );

  return {
    created: result.upsertedCount === 1,
  };
}

export async function hasActiveSubscriber(
  email: string
): Promise<boolean> {
  const db = await getDb();

  const subscriber = await db
    .collection(COLLECTIONS.SUBSCRIBERS)
    .findOne({
      email: normalizeEmail(email),
      $or: [
        {
          unsubscribedAt: {
            $exists: false,
          },
        },
        {
          unsubscribedAt: null,
        },
        {
          unsubscribedAt: "",
        },
      ],
    });

  return Boolean(subscriber);
}

export async function getSubscribers(): Promise<
  Subscriber[]
> {
  const db = await getDb();

  const documents = await db
    .collection(COLLECTIONS.SUBSCRIBERS)
    .find({})
    .sort({ subscribedAt: -1 })
    .toArray();

  return documents.map(toSubscriber);
}

export async function getActiveSubscribers(): Promise<
  Subscriber[]
> {
  const db = await getDb();

  const documents = await db
    .collection(COLLECTIONS.SUBSCRIBERS)
    .find({
      $or: [
        {
          unsubscribedAt: {
            $exists: false,
          },
        },
        {
          unsubscribedAt: null,
        },
        {
          unsubscribedAt: "",
        },
      ],
    })
    .sort({ subscribedAt: -1 })
    .toArray();

  return documents.map(toSubscriber);
}

export async function unsubscribeSubscriber(
  email: string
) {
  const db = await getDb();

  return db
    .collection(COLLECTIONS.SUBSCRIBERS)
    .updateOne(
      {
        email: normalizeEmail(email),
      },
      {
        $set: {
          unsubscribedAt:
            new Date().toISOString(),
        },
      }
    );
}