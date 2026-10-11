import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/auth";
import { getProducts, saveProducts } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug, Product } from "@/lib/types";

type Destination = {
  category: CategorySlug;
  subcategory?: string;
};

const newCategorySlugs = new Set(
  CATEGORIES.map((category) => category.slug)
);

const oldCategoryFallbacks: Record<string, Destination> = {
  "kitchen-appliances": {
    category: "kitchen-appliances",
  },
  "cookware-utensils": {
    category: "cookware",
  },
  "home-organisation": {
    category: "storage-organisation",
  },
  "household-essentials": {
    category: "home-utility",
  },
  bathroom: {
    category: "bathroom",
    subcategory: "Bath Series",
  },
};

const oldSubcategoryMap: Record<string, Destination> = {
  "cookware-utensils|cookware": {
    category: "cookware",
  },
  "cookware-utensils|bakeware": {
    category: "cookware",
    subcategory: "Bakeware",
  },
  "cookware-utensils|pressure cooker": {
    category: "cookware",
    subcategory: "Pressure Cooker",
  },
  "cookware-utensils|mold": {
    category: "cookware",
    subcategory: "Moulds",
  },

  "cookware-utensils|sieve": {
    category: "kitchen-tools",
    subcategory: "Sieve",
  },
  "cookware-utensils|chopping board": {
    category: "kitchen-tools",
    subcategory: "Chopping Board",
  },
  "cookware-utensils|scale": {
    category: "kitchen-tools",
    subcategory: "Scale",
  },

  "cookware-utensils|cooking spoon": {
    category: "dining-serveware",
    subcategory: "Spoons",
  },
  "cookware-utensils|spoon": {
    category: "dining-serveware",
    subcategory: "Spoons",
  },
  "cookware-utensils|cutlery": {
    category: "dining-serveware",
    subcategory: "Cutlery / Utensils",
  },
  "cookware-utensils|utensils": {
    category: "dining-serveware",
    subcategory: "Cutlery / Utensils",
  },
  "cookware-utensils|straw": {
    category: "dining-serveware",
    subcategory: "Straws",
  },
  "cookware-utensils|tray / trays": {
    category: "dining-serveware",
    subcategory: "Trays",
  },
  "cookware-utensils|woodens": {
    category: "dining-serveware",
    subcategory: "Wooden Utensils",
  },
  "cookware-utensils|gas burner": {
    category: "kitchen-appliances",
    subcategory: "Gas Burner",
  },
  "cookware-utensils|food warmer": {
    category: "kitchen-appliances",
    subcategory: "Food Warmer",
  },

  "home-organisation|cloth dryer": {
    category: "cleaning-laundry",
    subcategory: "Clothes Dryer",
  },
  "home-organisation|rack": {
    category: "storage-organisation",
    subcategory: "Rack",
  },
  "home-organisation|hangers": {
    category: "storage-organisation",
    subcategory: "Hangers",
  },
  "home-organisation|pant hanger": {
    category: "storage-organisation",
    subcategory: "Hangers",
  },
  "home-organisation|peg": {
    category: "storage-organisation",
    subcategory: "Hangers",
  },

  "household-essentials|vacuum cleaner": {
    category: "cleaning-laundry",
    subcategory: "Vacuum Cleaner",
  },
  "household-essentials|cleaning tools": {
    category: "cleaning-laundry",
    subcategory: "Cleaning Tools",
  },
  "household-essentials|spray bottles": {
    category: "cleaning-laundry",
    subcategory: "Cleaning Tools",
  },
  "household-essentials|waste bin": {
    category: "cleaning-laundry",
    subcategory: "Waste Bin",
  },
  "household-essentials|iron": {
    category: "cleaning-laundry",
    subcategory: "Iron",
  },
  "household-essentials|ironing board": {
    category: "cleaning-laundry",
    subcategory: "Iron",
  },
  "household-essentials|mats": {
    category: "home-utility",
    subcategory: "Mats",
  },
  "household-essentials|ladders": {
    category: "home-utility",
    subcategory: "Ladders",
  },
  "household-essentials|tools": {
    category: "home-utility",
    subcategory: "Tools",
  },
  "household-essentials|glassware": {
    category: "dining-serveware",
    subcategory: "Glassware",
  },
  "household-essentials|dinnerware": {
    category: "dining-serveware",
    subcategory: "Dinnerware",
  },
};

const keywordRules: Array<{
  pattern: RegExp;
  destination: Destination;
}> = [
  {
    pattern: /toilet|bathroom/i,
    destination: {
      category: "bathroom",
      subcategory: "Bath Series",
    },
  },
  {
    pattern: /air fryer/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Air Fryers",
    },
  },
  {
    pattern: /blender/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Blenders",
    },
  },
  {
    pattern: /kettle/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Electric Kettle",
    },
  },
  {
    pattern: /oven/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Oven",
    },
  },
  {
    pattern: /chopper/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Electric Chopper",
    },
  },
  {
    pattern: /slow juic|juicer/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Slow Juicer",
    },
  },
  {
    pattern: /food processor/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Food Processor",
    },
  },
  {
    pattern: /mixer/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Mixer",
    },
  },
  {
    pattern: /dehydrat/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Dehydrator",
    },
  },
  {
    pattern: /gas burner/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Gas Burner",
    },
  },
  {
    pattern: /food warmer/i,
    destination: {
      category: "kitchen-appliances",
      subcategory: "Food Warmer",
    },
  },
  {
    pattern: /cookware/i,
    destination: {
      category: "cookware",
    },
  },
  {
    pattern: /bakeware/i,
    destination: {
      category: "cookware",
      subcategory: "Bakeware",
    },
  },
  {
    pattern: /pressure cooker/i,
    destination: {
      category: "cookware",
      subcategory: "Pressure Cooker",
    },
  },
  {
    pattern: /mou?ld/i,
    destination: {
      category: "cookware",
      subcategory: "Moulds",
    },
  },
  {
    pattern: /colander|drainer|sieve/i,
    destination: {
      category: "kitchen-tools",
      subcategory: "Sieve",
    },
  },
  {
    pattern: /chopping board|chop board/i,
    destination: {
      category: "kitchen-tools",
      subcategory: "Chopping Board",
    },
  },
  {
    pattern: /scale/i,
    destination: {
      category: "kitchen-tools",
      subcategory: "Scale",
    },
  },
  {
    pattern: /cutlery|utensil/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Cutlery / Utensils",
    },
  },
  {
    pattern: /dinnerware/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Dinnerware",
    },
  },
  {
    pattern: /glassware/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Glassware",
    },
  },
  {
    pattern: /fruit platter|tray/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Trays",
    },
  },
  {
    pattern: /spoon/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Spoons",
    },
  },
  {
    pattern: /straw/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Straws",
    },
  },
  {
    pattern: /wooden/i,
    destination: {
      category: "dining-serveware",
      subcategory: "Wooden Utensils",
    },
  },
  {
    pattern: /pantry|storage|organis|organizer|canister|grain bucket|lazy susan|egg rack/i,
    destination: {
      category: "storage-organisation",
      subcategory: "Pantry / Storage Organiser",
    },
  },
  {
    pattern: /hanger|peg/i,
    destination: {
      category: "storage-organisation",
      subcategory: "Hangers",
    },
  },
  {
    pattern: /rack/i,
    destination: {
      category: "storage-organisation",
      subcategory: "Rack",
    },
  },
  {
    pattern: /cover/i,
    destination: {
      category: "storage-organisation",
      subcategory: "Covers",
    },
  },
  {
    pattern: /vacuum/i,
    destination: {
      category: "cleaning-laundry",
      subcategory: "Vacuum Cleaner",
    },
  },
  {
    pattern: /cleaning|spray bottle|waste bin|\bbin\b/i,
    destination: {
      category: "cleaning-laundry",
      subcategory: "Cleaning Tools",
    },
  },
  {
    pattern: /laundry|cloth(es)? dryer|dryer/i,
    destination: {
      category: "cleaning-laundry",
      subcategory: "Clothes Dryer",
    },
  },
  {
    pattern: /iron|ironing/i,
    destination: {
      category: "cleaning-laundry",
      subcategory: "Iron",
    },
  },
  {
    pattern: /ladder/i,
    destination: {
      category: "home-utility",
      subcategory: "Ladders",
    },
  },
  {
    pattern: /\btools?\b/i,
    destination: {
      category: "home-utility",
      subcategory: "Tools",
    },
  },
  {
    pattern: /mat/i,
    destination: {
      category: "home-utility",
      subcategory: "Mats",
    },
  },
  {
    pattern: /table/i,
    destination: {
      category: "home-utility",
      subcategory: "Tables",
    },
  },
];

function classifyProduct(product: Product): Destination | null {
  const currentCategory = String(product.category || "") as CategorySlug;
  const currentSubcategory = String(
    product.subcategory || ""
  )
    .trim()
    .toLowerCase();

  const text = [
    product.name,
    product.short,
    product.description,
  ]
    .join(" ")
    .toLowerCase();

  const oldSubcategoryDestination =
    oldSubcategoryMap[
      `${currentCategory}|${currentSubcategory}`
    ];

  if (oldSubcategoryDestination) {
    return oldSubcategoryDestination;
  }

  const isAlreadyNew =
    newCategorySlugs.has(currentCategory);

  if (isAlreadyNew) {
    const categoryDefinition = CATEGORIES.find(
      (category) => category.slug === currentCategory
    );

    const validSubcategory =
      product.subcategory &&
      categoryDefinition?.subcategories.includes(
        product.subcategory
      );

    if (validSubcategory) {
      return {
        category: currentCategory as CategorySlug,
        subcategory: product.subcategory,
      };
    }

    const sameCategoryKeyword =
      keywordRules.find(
        (rule) =>
          rule.destination.category === currentCategory &&
          rule.pattern.test(text)
      );

    return (
      sameCategoryKeyword?.destination || {
        category: currentCategory as CategorySlug,
      }
    );
  }

  const keywordDestination = keywordRules.find(
    (rule) => rule.pattern.test(text)
  );

  return (
    keywordDestination?.destination ||
    oldCategoryFallbacks[currentCategory] ||
    null
  );
}

function applyDestination(
  product: Product,
  destination: Destination
): Product {
  const nextProduct = {
    ...product,
    category: destination.category,
  };

  if (destination.subcategory) {
    nextProduct.subcategory = destination.subcategory;
  } else {
    delete nextProduct.subcategory;
  }

  return nextProduct;
}

export async function POST() {
  if (!isAdminAuthed()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const products = await getProducts();
  const unresolved: Array<{
    id: string;
    name: string;
    category: string;
  }> = [];

  let updated = 0;
  let unchanged = 0;

  const migratedProducts = products.map((product) => {
    const destination = classifyProduct(product);

    if (!destination) {
      unresolved.push({
        id: product.id,
        name: product.name,
        category: String(product.category),
      });
      return product;
    }

    const nextProduct = applyDestination(
      product,
      destination
    );

    const changed =
      product.category !== nextProduct.category ||
      (product.subcategory || "") !==
        (nextProduct.subcategory || "");

    if (changed) {
      updated += 1;
    } else {
      unchanged += 1;
    }

    return nextProduct;
  });

  if (updated > 0) {
    await saveProducts(migratedProducts);
  }

  return NextResponse.json({
    ok: true,
    updated,
    unchanged,
    unresolved,
  });
}