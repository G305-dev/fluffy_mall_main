import ProductCard from "@/components/ProductCard";
import { CATEGORIES, categoryName } from "@/lib/categories";
import { getAdminCategories } from "@/lib/admin-categories";
import { getProducts } from "@/lib/db";
import {
  notFound,
  redirect,
} from "next/navigation";
import Link from "next/link";

const LEGACY_SUBCATEGORY_REDIRECTS: Record<
  string,
  string
> = {
  "air fryers": "air-fryers",
  blenders: "blenders",
  oven: "oven",
  "electric chopper": "electric-chopper",
  "electric kettle": "electric-kettle",
  "food warmer": "food-warmer",
  "breakfast makers": "breakfast-makers",
  "slow juicer": "slow-juicer",
  dehydrator: "dehydrator",
  "gas burner": "gas-burner",
  mixer: "mixer",
  "food processor": "food-processor",
  bakeware: "bakeware",
  "pressure cooker": "pressure-cooker",
  moulds: "moulds",
  mold: "moulds",
  sieve: "sieve",
  "chopping board": "chopping-board",
  scale: "scale",
  "cutlery utensils": "cutlery-utensils",
  cutlery: "cutlery-utensils",
  utensils: "cutlery-utensils",
  dinnerware: "dinnerware",
  glassware: "glassware",
  glasswares: "glassware",
  trays: "trays",
  tray: "trays",
  spoons: "spoons",
  spoon: "spoons",
  "wooden utensils": "wooden-utensils",
  woodens: "wooden-utensils",
  straws: "straws",
  straw: "straws",
  "pantry / storage organiser":
    "pantry-storage-organiser",
  "pantry storage organiser":
    "pantry-storage-organiser",
  "hangers": "hangers",
  rack: "rack",
  covers: "covers",
  cover: "covers",
  "waste bin": "waste-bin",
  "cleaning tools": "cleaning-tools",
  laundry: "laundry",
  laundries: "laundry",
  "vacuum cleaner": "vacuum-cleaner",
  "vaccum cleaner": "vacuum-cleaner",
  iron: "iron",
  "clothes dryer": "clothes-dryer",
  "cloth dryer": "clothes-dryer",
  "bath series": "bath-series",
  ladders: "ladders",
  ladder: "ladders",
  tools: "tools",
  mats: "mats",
  tables: "tables",
  table: "tables",
};

const LEGACY_PARENT_REDIRECTS: Record<
  string,
  string
> = {
  "kitchen-appliances": "/shop",
  "kitchen-tools": "/shop",
  "dining-serveware": "/shop",
  "storage-organisation": "/shop",
  "home-organisation": "/shop",
  "cleaning-laundry": "/shop",
  "household-essentials": "/shop",
  bathroom: "/shop/bath-series",
};

function normalizeLegacyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}) {
  const category = (await getAdminCategories()).find((item) => item.slug === params.category);
  return { title: category?.name || categoryName(params.category) };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: {
    category: string;
  };
  searchParams: {
    subcategory?: string;
  };
}) {
  const category = (await getAdminCategories()).find(
    (item) => item.slug === params.category
  );

  /*
   * Old URLs are redirected for bookmarked links only.
   * The live shop has no subcategory navigation or filtering.
   */
  const legacySubcategory = normalizeLegacyValue(
    searchParams.subcategory || ""
  );

  if (
    legacySubcategory &&
    (!category || params.category === "cookware")
  ) {
    const destination =
      LEGACY_SUBCATEGORY_REDIRECTS[
        legacySubcategory
      ];

    if (destination) {
      redirect(`/shop/${destination}`);
    }
  }

  if (category && searchParams.subcategory) {
    redirect(`/shop/${category.slug}`);
  }

  if (!category) {
    const oldParent =
      LEGACY_PARENT_REDIRECTS[
        params.category
      ];

    if (oldParent) {
      redirect(oldParent);
    }

    notFound();
  }

  const allProducts = await getProducts();

  const products = allProducts.filter(
    (product) =>
      product.category ===
      category.slug
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/shop"
        className="text-sm text-terracotta-600 hover:underline"
      >
        ← All products
      </Link>

      <div className="mt-5">
        <h1 className="break-words font-display text-3xl text-cocoa-800 sm:text-4xl">
          {category.name}
        </h1>

        <p className="mt-2 text-sm text-cocoa-700/70">
          {category.blurb}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-b border-cream-200 pb-4">
        <p className="text-sm text-cocoa-700/70">
          Browse all products in {category.name}.
        </p>

        <p className="shrink-0 text-sm text-cocoa-700/70">
          {products.length}{" "}
          {products.length === 1
            ? "item"
            : "items"}
        </p>
      </div>

      {products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="reveal"
              data-reveal-delay={
                (index % 4) * 80
              }
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-cream-200">
          <p className="text-sm text-cocoa-700/70">
            No products are currently listed
            in this category.
          </p>

          <Link
            href="/shop"
            className="mt-4 inline-flex rounded-full bg-cocoa-800 px-5 py-2.5 text-sm font-semibold text-white"
          >
            View all products
          </Link>
        </div>
      )}
    </div>
  );
}