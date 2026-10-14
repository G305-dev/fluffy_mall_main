"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { categoryName } from "@/lib/categories";

type UnresolvedProduct = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
};

type CategoryChange = {
  id: string;
  name: string;
  fromCategory: string;
  fromSubcategory: string;
  toCategory: string;
  reason: string;
};

type MigrationPreview = {
  total: number;
  updated: number;
  unchanged: number;
  unresolved: UnresolvedProduct[];
  changes: CategoryChange[];
  fingerprint: string;
};

export default function CategoryMigrationButton() {
  const router = useRouter();
  const [preview, setPreview] =
    useState<MigrationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  async function previewMigration() {
    setBusy(true);
    setMessage(null);
    setPreview(null);

    try {
      const response = await fetch(
        "/api/admin/products/migrate-categories",
        { cache: "no-store" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not preview categories."
        );
      }

      setPreview(result as MigrationPreview);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not preview categories."
      );
    } finally {
      setBusy(false);
    }
  }

  async function applyMigration() {
    if (
      !preview ||
      preview.updated === 0 ||
      preview.unresolved.length > 0
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Have you backed up the products collection and reviewed all ${preview.updated} proposed changes? This will change the database.`
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/products/migrate-categories",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirm: true,
            fingerprint: preview.fingerprint,
          }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not update categories."
        );
      }

      setMessage(
        `Updated ${result.updated} products. Preview again to verify.`
      );
      setPreview(null);
      router.refresh();
    } catch (error) {
      setPreview(null);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update categories. Preview again before retrying."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-200">
      <h2 className="text-sm font-semibold text-cocoa-800">
        Move old products to flat categories
      </h2>

      <p className="mt-1 text-xs leading-relaxed text-cocoa-700/70">
        First back up MongoDB, then preview the suggested category for every
        product. Nothing is changed by the preview. Review name-based matches
        and fix any unresolved products before applying.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={previewMigration}
          disabled={busy}
          className="rounded-full bg-cocoa-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Please wait..." : "Preview categories"}
        </button>

        {preview && preview.updated > 0 && (
          <button
            type="button"
            onClick={applyMigration}
            disabled={busy || preview.unresolved.length > 0}
            className="rounded-full bg-terracotta-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Apply {preview.updated} reviewed changes
          </button>
        )}
      </div>

      {message && (
        <p role="status" className="mt-3 text-xs text-cocoa-700">
          {message}
        </p>
      )}

      {preview && (
        <div className="mt-4 space-y-3 text-xs text-cocoa-700">
          <p role="status" className="font-semibold">
            {preview.total} total · {preview.updated} to update ·{" "}
            {preview.unchanged} already flat ·{" "}
            {preview.unresolved.length} need manual review
          </p>

          {preview.unresolved.length > 0 && (
            <div className="rounded-xl bg-red-50 p-3 text-red-800 ring-1 ring-red-200">
              <p className="font-semibold">
                These products must be assigned a category manually before
                the migration can run:
              </p>
              <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {preview.unresolved.map((product) => (
                  <li key={product.id}>
                    {product.name} ({product.id}) · old category:{" "}
                    {product.category}
                    {product.subcategory &&
                      ` · old product type: ${product.subcategory}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.changes.length > 0 && (
            <div className="rounded-xl bg-white p-3 ring-1 ring-cream-200">
              <p className="font-semibold">
                Proposed changes (review each one):
              </p>
              <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                {preview.changes.map((change) => (
                  <li key={change.id} className="border-b border-cream-100 pb-2">
                    <span className="font-semibold">{change.name}</span>
                    {" · "}{change.fromCategory}
                    {change.fromSubcategory &&
                      ` / ${change.fromSubcategory}`}
                    {" → "}{categoryName(change.toCategory)}
                    {" ("}{change.toCategory}{")"}
                    <span className="block text-cocoa-700/60">
                      {change.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.updated === 0 && preview.unresolved.length === 0 && (
            <p>All products already use the flat categories.</p>
          )}
        </div>
      )}
    </section>
  );
}