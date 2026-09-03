import { CategorySlug } from "./types";

export const CATEGORIES: {
  slug: CategorySlug;
  name: string;
  blurb: string;
  emoji: string;
}[] = [
  {
    slug: "kitchen-appliances",
    name: "Kitchen Appliances",
    blurb: "Blenders, juicers, kettles & healthy cookware",
    emoji: "🍲",
  },
  {
    slug: "cookware-utensils",
    name: "Cookware & Utensils",
    blurb: "Drainers, organisers, pots and tools",
    emoji: "🥄",
  },
  {
    slug: "home-organisation",
    name: "Home Organisation",
    blurb: "Pantry, shelves and acrylic storage",
    emoji: "🧺",
  },
  {
    slug: "household-essentials",
    name: "Household Essentials",
    blurb: "Ladders, ironing boards, scales & mats",
    emoji: "🏠",
  },
  {
    slug: "bathroom",
    name: "Bathroom",
    blurb: "Holders, organisers and vanity sets",
    emoji: "🚿",
  },
  {
    slug: "corporate-gifts",
    name: "Corporate Gifts & Souvenirs",
    blurb: "Hampers, weddings and office branding",
    emoji: "🎁",
  },
];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}
