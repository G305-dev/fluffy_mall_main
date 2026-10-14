import { MongoServerError } from "mongodb";
import { CATEGORIES } from "@/lib/categories";
import { COLLECTIONS, getDb } from "@/lib/mongo";

export type AdminCategory = {
  slug: string;
  name: string;
  blurb: string;
  emoji: string;
  source: "existing" | "added";
};

type StoredCategory = {
  _id: string; // The category slug; MongoDB makes this unique.
  name: string;
  blurb: string;
  emoji: string;
  createdAt: string;
};

export class CategoryInputError extends Error {}
export class CategoryAlreadyExistsError extends Error {}

function normalizeName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function categorySlug(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const db = await getDb();
  const added = await db
    .collection<StoredCategory>(COLLECTIONS.CATEGORIES)
    .find({})
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const existing: AdminCategory[] = CATEGORIES.map((category) => ({
    ...category,
    source: "existing",
  }));
  const existingSlugs = new Set(existing.map((category) => category.slug));

  return [
    ...existing,
    ...added
      .filter((category) => !existingSlugs.has(category._id))
      .map((category) => ({
        slug: category._id,
        name: category.name,
        blurb: category.blurb,
        emoji: category.emoji,
        source: "added" as const,
      })),
  ];
}

export async function addAdminCategory(input: {
  name: unknown;
  blurb: unknown;
}): Promise<AdminCategory> {
  if (typeof input.name !== "string") {
    throw new CategoryInputError("Enter a category name.");
  }
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) {
    throw new CategoryInputError("The name must be between 2 and 80 characters.");
  }
  if (input.blurb !== undefined && typeof input.blurb !== "string") {
    throw new CategoryInputError("The description must be text.");
  }
  const blurb = (input.blurb || "").trim();
  if (blurb.length > 200) {
    throw new CategoryInputError("The description must be 200 characters or fewer.");
  }

  const slug = categorySlug(name);
  if (!slug) {
    throw new CategoryInputError("The name needs an English letter or number to make a category code.");
  }

  // The existing Tray/Trays names belong to the single 'trays' category.
  if (slug === "tray") {
    throw new CategoryAlreadyExistsError("Tray is already included in Trays.");
  }

  const categories = await getAdminCategories();
  if (categories.some((category) =>
    category.slug === slug || normalizeName(category.name) === normalizeName(name)
  )) {
    throw new CategoryAlreadyExistsError("That category is already in the list.");
  }

  const db = await getDb();
  const document: StoredCategory = {
    _id: slug,
    name,
    blurb,
    emoji: "🏷️",
    createdAt: new Date().toISOString(),
  };

  try {
    await db.collection<StoredCategory>(COLLECTIONS.CATEGORIES).insertOne(document);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new CategoryAlreadyExistsError("That category is already in the list.");
    }
    throw error;
  }

  return { slug, name, blurb, emoji: document.emoji, source: "added" };
}