import type { CategorySlug } from "./types";

export type CategoryDefinition = {
  slug: CategorySlug;
  name: string;
  blurb: string;
  emoji: string;
  subcategories: string[];
};

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: "kitchen-appliances",
    name: "Kitchen Appliances",
    blurb: "Blenders, kettles, ovens and food-preparation machines",
    emoji: "🍳",
    subcategories: [
      "Air Fryers",
      "Blenders",
      "Oven",
      "Electric Chopper",
      "Electric Kettle",
      "Food Warmer",
      "Breakfast Makers",
      "Slow Juicer",
      "Dehydrator",
      "Gas Burner",
      "Mixer",
      "Food Processor",
    ],
  },
  {
    slug: "cookware",
    name: "Cookware",
    blurb: "Bakeware, pressure cookers and cooking moulds",
    emoji: "🍲",
    subcategories: [
      "Bakeware",
      "Pressure Cooker",
      "Moulds",
    ],
  },
  {
    slug: "kitchen-tools",
    name: "Kitchen Tools",
    blurb: "Sieves, chopping boards and kitchen scales",
    emoji: "🥄",
    subcategories: [
      "Sieve",
      "Chopping Board",
      "Scale",
    ],
  },
  {
    slug: "dining-serveware",
    name: "Dining & Serveware",
    blurb: "Cutlery, dinnerware, glassware and serving items",
    emoji: "🍽️",
    subcategories: [
      "Cutlery / Utensils",
      "Dinnerware",
      "Glassware",
      "Trays",
      "Spoons",
      "Wooden Utensils",
      "Straws",
    ],
  },
  {
    slug: "storage-organisation",
    name: "Storage & Organisation",
    blurb: "Pantry storage, racks, hangers and covers",
    emoji: "🧺",
    subcategories: [
      "Pantry / Storage Organiser",
      "Hangers",
      "Rack",
      "Covers",
    ],
  },
  {
    slug: "cleaning-laundry",
    name: "Cleaning & Laundry",
    blurb: "Bins, cleaning tools, laundry and ironing essentials",
    emoji: "🧹",
    subcategories: [
      "Waste Bin",
      "Cleaning Tools",
      "Laundry",
      "Vacuum Cleaner",
      "Clothes Dryer",
      "Iron",
    ],
  },
  {
    slug: "bathroom",
    name: "Bathroom",
    blurb: "Bathroom holders, racks and cleaning essentials",
    emoji: "🚿",
    subcategories: [
      "Bath Series",
    ],
  },
  {
    slug: "home-utility",
    name: "Home & Utility",
    blurb: "Ladders, tools, mats and tables",
    emoji: "🏠",
    subcategories: [
      "Ladders",
      "Tools",
      "Mats",
      "Tables",
    ],
  },
];

export function categoryName(slug: string) {
  return (
    CATEGORIES.find((category) => category.slug === slug)?.name ??
    slug
  );
}