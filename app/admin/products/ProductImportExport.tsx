"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-categories";

type Report = {
  total: number;
  stockReport: boolean;
  importable: number;
  updatable: number;
  duplicates: number;
  held: number;
  invalid: number;
  imported?: number;
  updated?: number;
  issues: Array<{ row: number; message: string }>;
  sample: Array<{ name: string; code: string; category: string; price: number; image: boolean }>;
  updateSample: Array<{ name: string; code: string; price: number; stock: number }>;
  error?: string;
};

export default function ProductImportExport({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [defaultCategory, setDefaultCategory] = useState("");
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function send(mode: "preview" | "import") {
    if (!file) {
      setError("Choose a CSV or Excel (.xlsx) file first.");
      return;
    }
    setBusy(mode);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("defaultCategory", defaultCategory);
      const response = await fetch(`/api/admin/products/import?mode=${mode}`, {
        method: "POST",
        body: form,
      });
      const data = await response.json() as Report;
      if (data.issues) setReport(data);
      if (!response.ok) throw new Error(data.error || "Import failed.");
      if (mode === "preview") {
        setReport(data);
      } else {
        setSuccess(`Added ${data.imported || 0} new products, updated ${data.updated || 0} existing singles, skipped ${data.duplicates} duplicates and held ${data.held} for review. Item codes are linked to TracePOS; Code 128 barcodes were not changed.`);
        setReport({ ...data, importable: 0, updatable: 0 });
        router.refresh();
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not process the file.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => { setOpen(!open); setExportOpen(false); }}
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e87700]"
        >
          <Upload size={16} aria-hidden="true" /> Import products
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => { setExportOpen(!exportOpen); setOpen(false); }}
            aria-expanded={exportOpen}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-cocoa-800 hover:border-orange-300"
          >
            <Download size={16} aria-hidden="true" /> Export products <ChevronDown size={15} aria-hidden="true" />
          </button>
          {exportOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
              <a href="/api/admin/products/export?format=csv" className="block rounded-lg px-3 py-2 text-sm hover:bg-orange-50">Download CSV</a>
              <a href="/api/admin/products/export?format=xlsx" className="block rounded-lg px-3 py-2 text-sm hover:bg-orange-50">Download Excel (.xlsx)</a>
            </div>
          )}
        </div>
      </div>

      {open && (
        <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5" aria-label="Import products">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-cocoa-800">
                <FileSpreadsheet size={18} aria-hidden="true" /> Import from a spreadsheet
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                CSV or Excel (.xlsx), up to 5 MB / 1,000 rows. The classified Single (candidate) CSV can be uploaded directly: its ₦ prices, PC/Pcs quantities and report categories are understood. Duplicate names/codes are checked against live products and options. Existing standard products with a confident match get their item code, price and stock updated; their photos and descriptions stay unchanged. Ambiguous matches and ladder sizes are held for review. Item codes link to TracePOS, never to Code 128 barcode labels. Products without a photo use an “Image coming soon” placeholder.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close import" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-orange-600">
            <a href="/api/admin/products/export?format=csv&template=1" className="hover:underline">Download CSV template</a>
            <a href="/api/admin/products/export?format=xlsx&template=1" className="hover:underline">Download Excel template</a>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-stone-600">
              Product file
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setReport(null);
                  setSuccess("");
                  setError("");
                }}
                className="mt-1 block w-full rounded-xl border border-stone-200 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1 file:text-orange-700"
              />
            </label>
            <label className="block text-xs font-medium text-stone-600">
              Default category (only for rows without a category)
              <select
                value={defaultCategory}
                onChange={(event) => { setDefaultCategory(event.target.value); setReport(null); }}
                className="mt-1 block w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Use the category column</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => send("preview")} disabled={!file || !!busy} className="rounded-xl border border-orange-300 px-4 py-2.5 text-sm font-semibold text-orange-700 disabled:opacity-50">
              {busy === "preview" ? "Checking..." : "Preview import"}
            </button>
            <button type="button" onClick={() => send("import")} disabled={!report || (!report.importable && !report.updatable) || !!report.invalid || !!busy} className="rounded-xl bg-[#ff8200] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "import" ? "Importing..." : `Apply ${report?.importable || 0} new + ${report?.updatable || 0} updates`}
            </button>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</p>}

          {report && (
            <div className="mt-5 space-y-4 text-sm">
              <p className="rounded-xl bg-orange-50 p-3 text-cocoa-800">
                {report.total} rows · {report.imported === undefined ? report.importable : report.imported} new · {report.updated === undefined ? report.updatable : report.updated} existing updates · {report.duplicates} duplicates skipped · {report.held} held for review · {report.invalid} invalid.
                {report.invalid > 0 && " Fix invalid rows before importing; nothing will be saved yet."}
              </p>
              {report.stockReport && <p className="text-xs text-stone-600">Only classified single candidates are eligible. Ladder sizes and possible duplicates are held, not changed. Source row numbers appear with the issues below.</p>}
              {report.sample.length > 0 && (
                <div>
                  <p className="font-semibold text-cocoa-800">{report.imported === undefined ? "First products to import" : "Sample of products added"}</p>
                  <ul className="mt-2 space-y-1 text-xs text-stone-600">
                    {report.sample.map((item, index) => (
                      <li key={`${item.name}-${index}`}>
                        {item.name} · {item.code} · {item.category} · ₦{item.price.toLocaleString("en-NG")} · {item.image ? "Image URL" : "Placeholder"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.updateSample.length > 0 && (
                <div>
                  <p className="font-semibold text-cocoa-800">{report.updated === undefined ? "Existing products to update" : "Sample of existing products updated"}</p>
                  <ul className="mt-2 space-y-1 text-xs text-stone-600">
                    {report.updateSample.map((item, index) => (
                      <li key={`${item.name}-${index}`}>{item.name} · item code {item.code} · ₦{item.price.toLocaleString("en-NG")} · {item.stock} in stock</li>
                    ))}
                  </ul>
                </div>
              )}
              {report.issues.length > 0 && (
                <div>
                  <p className="font-semibold text-cocoa-800">Held, invalid and duplicate rows (first 100)</p>
                  <ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-stone-600">
                    {report.issues.map((issue, index) => <li key={`${issue.row}-${index}`}>Row {issue.row}: {issue.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}