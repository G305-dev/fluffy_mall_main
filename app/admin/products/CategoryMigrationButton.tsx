"use client";

import { useState } from "react";

type MigrationResult = {
  updated?: number;
  unchanged?: number;
  unresolved?: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  error?: string;
};

export default function CategoryMigrationButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function migrate() {
    const confirmed = window.confirm(
      "Automatically update all products to the new category structure?"
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
        }
      );

      const result =
        (await response.json()) as MigrationResult;

      if (!response.ok) {
        throw new Error(
          result.error || "Category migration failed."
        );
      }

      const unresolvedCount =
        result.unresolved?.length || 0;

      setMessage(
        `Updated ${result.updated || 0} products. ${
          unresolvedCount
        } products need review.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Category migration failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl bg-cream-50 p-4 ring-1 ring-cream-200">
      <p className="text-sm font-semibold text-cocoa-800">
        Update existing product categories
      </p>

      <p className="mt-1 text-xs text-cocoa-700/70">
        Automatically move products from the old category
        structure to the new one.
      </p>

      <button
        type="button"
        onClick={migrate}
        disabled={busy}
        className="mt-3 rounded-full bg-terracotta-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy
          ? "Updating categories..."
          : "Update existing categories"}
      </button>

      {message && (
        <p className="mt-3 text-xs text-cocoa-700">
          {message}
        </p>
      )}
    </div>
  );
}