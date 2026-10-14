"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-categories";

export default function CategoryManager({
  initialCategories,
}: {
  initialCategories: AdminCategory[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [blurb, setBlurb] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const existingCount = categories.filter((category) => category.source === "existing").length;
  const addedCount = categories.length - existingCount;
  const query = search.trim().toLowerCase();
  const visible = query
    ? categories.filter((category) =>
        [category.name, category.slug, category.blurb].some((value) =>
          value.toLowerCase().includes(query)
        )
      )
    : categories;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, blurb }),
      });
      const result: { category?: AdminCategory; error?: string } = await response.json();
      const added = result.category;
      if (!response.ok || !added) {
        throw new Error(result.error || "Could not save the category.");
      }
      setCategories((previous) => [...previous, added]);
      setName("");
      setBlurb("");
      setSearch("");
      setFormOpen(false);
      setSuccess(`${added.name} was added to your category list.`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the category.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-white p-4 sm:p-5">
        <div>
          <p className="font-semibold text-cocoa-800">{categories.length} categories</p>
          <p className="mt-1 text-sm text-stone-500">
            {existingCount} already listed · {addedCount} added here
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setFormOpen((open) => !open); setError(""); setSuccess(""); }}
          aria-expanded={formOpen}
          aria-controls={formOpen ? "new-category-form" : undefined}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          {formOpen ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {formOpen ? "Close form" : "New category"}
        </button>
      </div>

      {formOpen && (
        <form id="new-category-form" onSubmit={save} className="space-y-4 rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
          <div>
            <h2 className="text-lg font-semibold text-cocoa-800">Add a category</h2>
            <p className="mt-1 text-sm text-stone-500">Only for categories not already shown in the list below.</p>
          </div>
          <label className="block max-w-xl text-sm font-medium text-stone-700">
            Category name <span aria-hidden="true">*</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Kitchen accessories"
              className="mt-2 block w-full rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-orange-500"
            />
          </label>
          <label className="block max-w-xl text-sm font-medium text-stone-700">
            Description <span className="font-normal text-stone-400">(optional)</span>
            <textarea
              value={blurb}
              onChange={(event) => setBlurb(event.target.value)}
              maxLength={200}
              rows={3}
              placeholder="A short description of this category"
              className="mt-2 block w-full resize-y rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-orange-500"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="rounded-xl bg-[#ff8200] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700] disabled:opacity-50">
              {saving ? "Saving…" : "Save category"}
            </button>
            <button type="button" disabled={saving} onClick={() => { setFormOpen(false); setError(""); }} className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {success && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{success}</p>}

      <section className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4 sm:p-5">
          <h2 className="font-semibold text-cocoa-800">Category list</h2>
          <label className="flex w-full items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 sm:w-64">
            <Search size={16} aria-hidden="true" className="shrink-0 text-stone-400" />
            <span className="sr-only">Search categories</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className="w-full min-w-0 bg-transparent text-sm outline-none" />
          </label>
        </div>
        {visible.length ? (
          <ul className="divide-y divide-stone-100">
            {visible.map((category) => (
              <li key={category.slug} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-xl">{category.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-cocoa-800">{category.name}</p>
                  <p className="break-all text-xs text-stone-400">{category.slug}</p>
                  {category.blurb && <p className="mt-1 text-sm text-stone-500">{category.blurb}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold sm:text-xs ${category.source === "existing" ? "bg-stone-100 text-stone-600" : "bg-orange-100 text-orange-700"}`}>
                  {category.source === "existing" ? "Existing" : "Added"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-stone-500">No categories match that search.</p>
        )}
      </section>
      <p className="text-xs leading-relaxed text-stone-500">
        Existing categories are already included. New categories saved here also become selectable when adding products and appear on the storefront category list.
      </p>
    </>
  );
}