"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

export default function MobileCategorySubcategories({
  categoryName,
  subcategories,
  activeSubcategory,
}: {
  categoryName: string;
  subcategories: string[];
  activeSubcategory: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [visible, setVisible] =
    useState(true);

  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const difference =
        currentScrollY - lastScrollY.current;

      if (currentScrollY <= 40) {
        setVisible(true);
      } else if (difference < -4) {
        /*
         * Show the dropdown when the user scrolls up.
         */
        setVisible(true);
      } else if (difference > 4) {
        /*
         * Hide it when the user scrolls down.
         */
        setVisible(false);
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  function changeSubcategory(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = event.target.value;

    const nextUrl = value
      ? `${pathname}?subcategory=${encodeURIComponent(
          value
        )}`
      : pathname;

    router.replace(nextUrl);
  }

  return (
    <div
      className={`sticky top-[104px] z-40 -mx-4 border-y border-cream-200 bg-[#fff9f2]/95 px-4 py-3 shadow-sm backdrop-blur transition-transform duration-300 sm:-mx-6 sm:px-6 lg:hidden ${
        visible
          ? "translate-y-0"
          : "-translate-y-full"
      }`}
    >
      <label
        htmlFor="mobile-category-subcategory"
        className="sr-only"
      >
        Choose a subcategory
      </label>

      <div className="relative">
        <select
          id="mobile-category-subcategory"
          value={activeSubcategory}
          onChange={changeSubcategory}
          className="w-full appearance-none rounded-full border border-cream-300 bg-white px-4 py-3 pr-11 text-sm font-semibold text-cocoa-800 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
        >
          <option value="">
            All {categoryName}
          </option>

          {subcategories.map((subcategory) => (
            <option
              key={subcategory}
              value={subcategory}
            >
              {subcategory}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cocoa-700"
        />
      </div>
    </div>
  );
}