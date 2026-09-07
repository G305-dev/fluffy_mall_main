import { CategorySlug } from "./types";

export const CATEGORIES: {
  slug: CategorySlug;
  name: string;
  blurb: string;
  emoji: string;
  subcategories: string[];
}[] = [
  {
    slug: "kitchen-appliances",
    name: "Kitchen Appliances",
    blurb: "Blenders, juicers, kettles & healthy cookware",
    emoji: "🍲",
    subcategories: [
      "Electric Kettle", "Blenders", "Slow Juicer", "Breakfast Makers",
      "Air Fryers", "Food Processor", "Electric Chopper", "Mixer", "Dehydrator",
    ],
  },
  {
    slug: "cookware-utensils",
    name: "Cookware & Utensils",
    blurb: "Drainers, organisers, pots and tools",
    emoji: "🥄",
    subcategories: [
      "Cookware", "Bakeware", "Cooking Spoon", "Spoon", "Chopping Board",
      "Cutlery", "Utensils", "Sieve", "Straw", "Pressure Cooker", "Gas Burner",
      "Tray / Trays", "Food Warmer", "Scale", "Woodens", "Mold",
    ],
  },
  {
    slug: "home-organisation",
    name: "Home Organisation",
    blurb: "Pantry, shelves and acrylic storage",
    emoji: "🧺",
    subcategories: [
      "Food Storage", "Spice/Sauce Bottles", "Refrigerator Storage",
      "Pantry Organizer", "Pantry", "Organisers", "Rack", "Hangers", "Cloth Dryer",
    ],
  },
  {
    slug: "household-essentials",
    name: "Household Essentials",
    blurb: "Ladders, ironing boards, scales & mats",
    emoji: "🏠",
    subcategories: [
      "Vacuum Cleaner", "Cleaning Tools", "Spray Bottles", "Waste Bin", "Mats",
      "Ladders", "Iron", "Tools", "Glassware", "Dinnerware",
    ],
  },
  {
    slug: "bathroom",
    name: "Bathroom",
    blurb: "Holders, organisers and vanity sets",
    emoji: "🚿",
    subcategories: ["Bath Series"],
  },
  {
    slug: "corporate-gifts",
    name: "Corporate Gifts & Souvenirs",
    blurb: "Hampers, weddings and office branding",
    emoji: "🎁",
    subcategories: ["Cover", "Any future corporate gift items", "Any future souvenir items"],
  },
];

export function categoryName(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}
