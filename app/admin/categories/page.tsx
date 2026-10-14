import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-categories";
import CategoryManager from "./CategoryManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  if (!isAdminAuthed()) redirect("/admin/login");
  const categories = await getAdminCategories();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
          Inventory / Categories
        </p>
        <h1 className="mt-1 font-display text-3xl text-cocoa-800">Categories</h1>
        <p className="mt-2 text-sm text-stone-600">
          Your existing category list is already here. Add only categories that are new to your business.
        </p>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}