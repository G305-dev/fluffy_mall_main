"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Package,
} from "lucide-react";
import { LOW_STOCK_LIMIT } from "@/lib/admin-inventory";

export type ProductTypeStats = {
  products: number;
  options: number;
  units: number;
  healthy: number;
  low: number;
  out: number;
  coded: number;
};

type TabId = "standard" | "variable";

const TABS: Array<{ id: TabId; label: string; icon: typeof Package }> = [
  { id: "standard", label: "Standard Products", icon: Package },
  { id: "variable", label: "Variable Products", icon: Boxes },
];

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "neutral" | "green" | "orange" | "red";
}) {
  const toneClass = {
    neutral: "text-cocoa-800",
    green: "text-emerald-700",
    orange: "text-orange-700",
    red: "text-red-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

const PANEL_COPY: Record<
  "standard" | "variable",
  { title: string; blurb: string; bullets: string[] }
> = {
  standard: {
    title: "Standard products",
    blurb:
      "Single sellable units — e.g. one kettle, one ladder size. Stock, price and barcode live on the product itself.",
    bullets: [
      "A standard product with no variants appears as one sellable option in Admin → Inventory and in the low-stock report.",
      "Create or edit these under Admin → Products with type “Standard”; the total stock quantity is entered directly.",
      "Unit price, compare-at price, stock and barcode are stored on the product (see Product in lib/types.ts).",
      "The parent’s stock is the authoritative quantity for a standard product — it is not derived from anything else.",
      "Category, images, description and delivery note are edited on the product itself, not here.",
    ],
  },
  variable: {
    title: "Variable products",
    blurb:
      "Option combinations such as size × colour. Each option carries its own price, stock and barcode.",
    bullets: [
      "Each option (ProductVariant) holds its own price, stock and barcode; the product-level price/stock is a summary.",
      "On save or import, the parent’s stock is stored as the sum of option stock (see app/api/admin/products/create/route.ts).",
      "Storefront availability never trusts the parent’s stock — a positive option keeps the product in stock, and oversell checks run per option (lib/product-availability.ts).",
      "Edit option-level price and stock under Admin → Products with type “Variable”; the parent quantity is not edited directly.",
      "Options are the sellable items in Admin → Inventory and reports — the parent row is not counted on top of its options.",
    ],
  },
};

function ProductTypePanel({
  kind,
  stats,
}: {
  kind: "standard" | "variable";
  stats: ProductTypeStats | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const copy = PANEL_COPY[kind];

  async function clearProducts() {
    const phrase = kind === "standard" ? "DELETE STANDARD" : "DELETE VARIABLE";
    const confirmation = window.prompt(
      `This permanently deletes ALL ${kind} products from the catalogue, including their variants. It cannot be undone. Orders are not deleted. Type ${phrase} to confirm.`
    );
    if (confirmation !== phrase) return;
    setDeleting(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/products/clear-by-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not clear products.");
      setMessage(`Deleted ${result.deleted} ${kind} product(s).`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not clear products.");
    } finally {
      setDeleting(false);
    }
  }
  const Icon = kind === "standard" ? Package : Boxes;
  const attention = stats ? stats.low + stats.out : 0;

  return (
    <section className="rounded-3xl bg-white p-4 ring-1 ring-cream-200 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-2xl bg-cream-100 p-3 text-cocoa-800">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl text-cocoa-800">{copy.title}</h2>
          <p className="mt-1 text-sm text-cocoa-700/70">{copy.blurb}</p>
        </div>
      </div>

      {stats ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Products" value={stats.products} />
            <Stat label="Sellable options" value={stats.options} />
            <Stat label="Units in stock" value={stats.units} />
            <Stat label="Barcode-coded" value={stats.coded} hint="options with a barcode" />
            <Stat label="Healthy" value={stats.healthy} tone="green" />
            <Stat label="Low stock" value={stats.low} tone="orange" hint={`1–${LOW_STOCK_LIMIT} units`} />
            <Stat label="Out of stock" value={stats.out} tone="red" />
            <Stat label="Needs attention" value={attention} tone="orange" hint="low + out" />
          </dl>
          <p className="mt-2 text-xs text-stone-500">
            Live figures from the products catalogue (MongoDB). Low stock follows{" "}
            <code>LOW_STOCK_LIMIT</code> ({LOW_STOCK_LIMIT} units) in{" "}
            <code>lib/admin-inventory.ts</code>; variable products count their option rows, not the parent.
          </p>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-cream-300 bg-cream-100 px-4 py-3 text-sm text-cocoa-800">
          Catalogue stats are unavailable right now — the products database could not be read. The notes below
          still apply; the figures will appear once the database is reachable.
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.19em] text-orange-600">
          How {copy.title.toLowerCase()} work in this project
        </h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cocoa-800">
          {copy.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/admin/products"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-cocoa-800 hover:border-orange-300"
        >
          Manage products
        </Link>
        <Link
          href="/admin/inventory"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-cocoa-800 hover:border-orange-300"
        >
          Inventory overview
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-cocoa-800 hover:border-orange-300"
        >
          Reports &amp; low stock
        </Link>
      </div>

      <div className="mt-5">
        <button type="button" onClick={clearProducts} disabled={deleting}
          className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50">
          {deleting ? "Deleting…" : "Clear out all products"}
        </button>
        <p className="mt-2 text-xs text-red-700">Permanently deletes all {kind} products. A typed confirmation is required.</p>
        {message && <p role="status" className="mt-2 text-sm text-cocoa-800">{message}</p>}
      </div>
    </section>
  );
}

export default function SettingsTabs({
  standard,
  variable,
}: {
  standard: ProductTypeStats | null;
  variable: ProductTypeStats | null;
}) {
  const [tab, setTab] = useState<TabId>("standard");

  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={active}
              aria-controls="settings-tabpanel"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-cocoa-800 text-cream-50"
                  : "bg-white text-cocoa-800 ring-1 ring-cream-300 hover:border-orange-300"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="settings-tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        className="mt-4"
      >
        {tab === "standard" && <ProductTypePanel kind="standard" stats={standard} />}
        {tab === "variable" && <ProductTypePanel kind="variable" stats={variable} />}
      </div>
    </div>
  );
}