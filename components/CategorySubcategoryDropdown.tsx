"use client";

import { ChevronDown } from "lucide-react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

export default function CategorySubcategoryDropdown({
  subcategories,
  activeSubcategory,
}: {
  subcategories: string[];
  activeSubcategory: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function changeSubcategory(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const value = event.target.value;

    const nextUrl = value
      ? `${pathname}?subcategory=${encodeURIComponent(value)}`
      : pathname;

    router.replace(nextUrl);
  }

  return (
    <div className="relative mt-4">
      <label
        htmlFor="desktop-category-subcategory"
        className="sr-only"
      >
        Subcategories
      </label>

      <select
        id="desktop-category-subcategory"
        value={activeSubcategory}
        onChange={changeSubcategory}
        className="w-full appearance-none rounded-xl border border-cream-300 bg-white px-3 py-3 pr-10 text-sm font-semibold text-cocoa-800 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
      >
        <option value="">Subcategories</option>

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
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-700"
      />
    </div>
  );
}