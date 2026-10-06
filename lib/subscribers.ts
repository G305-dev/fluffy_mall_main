import {
  COLLECTIONS,
  getDb,
} from "@/lib/mongo";
import type { Subscriber } from "@/lib/types";

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

  const email = input.email
    .trim()
    .toLowerCase();

  const name = input.name.trim();

  const result = await collection.updateOne(
    { email },
    {
      $setOnInsert: {
        name,
        email,
        subscribedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return {
    created: result.upsertedCount === 1,
  };
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

  return documents.map((document) => {
    const {
      _id,
      ...subscriber
    } = document;

    return subscriber as Subscriber;
  });
}