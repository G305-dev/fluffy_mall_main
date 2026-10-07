"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { CategorySlug, Product } from "@/lib/types";

type CategoryInfo = {
  slug: CategorySlug;
  name: string;
  blurb: string;
  emoji: string;
};

const sectionStyles = [
  {
    background:
      "bg-white ring-1 ring-cream-200",
    text: "text-cocoa-900",
    mutedText: "text-cocoa-700/70",
    action:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
    control:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
  },
  {
    background:
      "bg-white ring-1 ring-cream-200",
    text: "text-cocoa-900",
    mutedText: "text-cocoa-700/70",
    action:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
    control:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
  },
  {
    background: "bg-black",
    text: "text-white",
    mutedText: "text-white/80",
    action:
      "bg-white text-cocoa-800 hover:bg-cream-50",
    control:
      "bg-white/95 text-cocoa-800 hover:bg-white",
  },
  {
    background:
      "bg-white ring-1 ring-cream-200",
    text: "text-cocoa-900",
    mutedText: "text-cocoa-700/70",
    action:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
    control:
      "bg-cocoa-900 text-white hover:bg-cocoa-800",
  },
];

export default function CategoryProductRail({
  category,
  products,
  index,
}: {
  category: CategoryInfo;
  products: Product[];
  index: number;
}) {
  const scrollContainer =
    useRef<HTMLDivElement | null>(null);

  const style =
    sectionStyles[index % sectionStyles.length];

  function scrollProducts(direction: number) {
    scrollContainer.current?.scrollBy({
      left: direction * 620,
      behavior: "smooth",
    });
  }

  return (
    <section
      className={`overflow-hidden rounded-[1.75rem] p-4 shadow-soft sm:p-6 lg:p-7 ${style.background}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">
              {category.emoji}
            </span>

            <h2
              className={`font-display text-2xl sm:text-3xl ${style.text}`}
            >
              {category.name}
            </h2>
          </div>

          <p
            className={`mt-1 max-w-xl text-sm ${style.mutedText}`}
          >
            {category.blurb}
          </p>
        </div>

        <Link
          href={`/shop/${category.slug}`}
         className={`inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${style.action}`}
        >
          See all
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollProducts(-1)}
          aria-label={`Scroll ${category.name} products left`}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-sm transition hover:bg-white sm:grid"
        >
          <ArrowLeft size={17} />
        </button>

        <div
          ref={scrollContainer}
          className="flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[205px] shrink-0 snap-start sm:w-[225px] lg:w-[240px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollProducts(1)}
          aria-label={`Scroll ${category.name} products right`}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-white/90 text-cocoa-800 shadow-sm transition hover:bg-white sm:grid"
        >
          <ArrowRight size={17} />
        </button>
      </div>

      <div className="mt-1 flex justify-center sm:hidden">
        <button
          type="button"
          onClick={() => scrollProducts(1)}
          className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition sm:grid ${style.control}`}
        >
          Swipe to see more
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}