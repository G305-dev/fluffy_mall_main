"use client";

import { useState } from "react";

type CheckResult = {
  summary: {
    traceposProducts: number;
    websiteMappedItems: number;
    matched: number;
    unmatchedWebsite: number;
    unmatchedTracepos: number;
    duplicateWebsiteCodes: number;
  };
  matched: Array<{
    code: string;
    productName: string;
    variantName?: string;
    websiteStock: number;
    traceposName: string;
    traceposStock: number;
  }>;
  unmatchedWebsite: Array<{
    code: string;
    productName: string;
    variantName?: string;
    websiteStock: number;
  }>;
  unmatchedTracepos: Array<{
    code: string;
    name: string;
    traceposStock: number;
  }>;
  duplicateWebsiteCodes: string[];
};

export default function TraceposCheck() {
  const [result, setResult] =
    useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runCheck() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/tracepos/check",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Tracepos check failed."
        );
      }

      setResult(data);
    } catch (checkError) {
      setError(
        checkError instanceof Error
          ? checkError.message
          : "Tracepos check failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="rounded-full bg-cocoa-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading
          ? "Checking Tracepos..."
          : "Check Tracepos products"}
      </button>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-cream-200">
              <p className="text-xs text-stone-500">
                Matched
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {result.summary.matched}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-cream-200">
              <p className="text-xs text-stone-500">
                Website not matched
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {result.summary.unmatchedWebsite}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 ring-1 ring-cream-200">
              <p className="text-xs text-stone-500">
                Tracepos not matched
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {result.summary.unmatchedTracepos}
              </p>
            </div>
          </div>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-cream-200">
            <h2 className="font-semibold text-cocoa-800">
              Matched products
            </h2>

            <div className="mt-3 space-y-2 text-sm">
              {result.matched.map((item) => (
                <div
                  key={`${item.productName}-${item.code}`}
                  className="flex flex-wrap justify-between gap-2 border-b border-cream-100 pb-2"
                >
                  <span>
                    {item.productName}
                    {item.variantName
                      ? ` — ${item.variantName}`
                      : ""}
                    {" · "}
                    <strong>{item.code}</strong>
                  </span>

                  <span>
                    Website: {item.websiteStock} · Tracepos:{" "}
                    {item.traceposStock}
                  </span>
                </div>
              ))}

              {result.matched.length === 0 && (
                <p className="text-stone-500">
                  No matched products yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-cream-200">
            <h2 className="font-semibold text-cocoa-800">
              Website codes not found in Tracepos
            </h2>

            <div className="mt-3 space-y-2 text-sm">
              {result.unmatchedWebsite.map((item) => (
                <div
                  key={`${item.productName}-${item.code}`}
                  className="border-b border-cream-100 pb-2"
                >
                  {item.productName}
                  {item.variantName
                    ? ` — ${item.variantName}`
                    : ""}
                  {" · "}
                  <strong>{item.code}</strong>
                </div>
              ))}

              {result.unmatchedWebsite.length === 0 && (
                <p className="text-stone-500">
                  None.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-cream-200">
            <h2 className="font-semibold text-cocoa-800">
              Tracepos products not found on website
            </h2>

            <div className="mt-3 space-y-2 text-sm">
              {result.unmatchedTracepos.map((item) => (
                <div
                  key={`${item.name}-${item.code}`}
                  className="border-b border-cream-100 pb-2"
                >
                  {item.name} ·{" "}
                  <strong>{item.code}</strong>
                  {" · Stock: "}
                  {item.traceposStock}
                </div>
              ))}

              {result.unmatchedTracepos.length === 0 && (
                <p className="text-stone-500">
                  None.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}