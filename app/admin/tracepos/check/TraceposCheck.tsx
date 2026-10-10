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

type SyncResult = {
  updated?: number;
  unchanged?: number;
  unmatchedWebsiteItems?: number;
  unmappedWebsiteItems?: number;
  ambiguousWebsiteItems?: number;
  unmatchedTraceposItems?: number;
  invalidTraceposStock?: number;
};

type SearchResult = {
  xid: string;
  id: string;
  name: string;
  itemCode: string;
  sku: string;
  stock: number;
};

type ApiResponse = {
  error?: string;
  results?: SearchResult[];
  result?: SyncResult;
  [key: string]: unknown;
};

async function readApiResponse(
  response: Response
): Promise<ApiResponse> {
  const text = await response.text();

  if (!text.trim()) {
    throw new Error(
      `The server returned an empty response. HTTP ${response.status}.`
    );
  }

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    const preview = text
      .replace(/\s+/g, " ")
      .slice(0, 160);

    throw new Error(
      `The Tracepos admin endpoint returned HTML instead of JSON. HTTP ${response.status}. Response: ${preview}`
    );
  }
}

export default function TraceposCheck() {
  const [result, setResult] =
    useState<CheckResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searching, setSearching] = useState(false);

  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);

  async function runCheck() {
    setLoading(true);
    setError("");
    setSyncMessage("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/admin/tracepos/check",
        {
          cache: "no-store",
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error || "Tracepos check failed."
        );
      }

      setResult(data as unknown as CheckResult);
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

  async function syncStock() {
    setSyncing(true);
    setError("");
    setSyncMessage("");

    try {
      const response = await fetch(
        "/api/admin/tracepos/sync-stock",
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Tracepos stock synchronization failed."
        );
      }

      const syncResult =
        data.result || {};

      await runCheck();

      setSyncMessage(
        `Stock sync completed. Updated ${
          syncResult.updated ?? 0
        } website stock value${
          syncResult.updated === 1
            ? ""
            : "s"
        }.`
      );
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : "Tracepos stock synchronization failed."
      );
    } finally {
      setSyncing(false);
    }
  }

  async function searchTraceposProducts() {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setError(
        "Enter at least two characters to search."
      );
      return;
    }

    setSearching(true);
    setError("");
    setSearchResults([]);

    try {
      const response = await fetch(
        `/api/admin/tracepos/search?q=${encodeURIComponent(
          query
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await readApiResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Tracepos product search failed."
        );
      }

      setSearchResults(data.results || []);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Tracepos product search failed."
      );
    } finally {
      setSearching(false);
    }
  }

  const disabled =
    loading || syncing || searching;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runCheck}
          disabled={disabled}
          className="rounded-full bg-cocoa-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? "Checking Tracepos..."
            : "Check Tracepos products"}
        </button>

        <button
          type="button"
          onClick={syncStock}
          disabled={disabled}
          className="rounded-full bg-terracotta-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {syncing
            ? "Syncing website stock..."
            : "Sync website stock"}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              searchTraceposProducts();
            }
          }}
          placeholder="Search Tracepos name, code, SKU or XID"
          className="min-w-0 flex-1 rounded-full border border-cream-300 bg-white px-4 py-3 text-sm outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
        />

        <button
          type="button"
          onClick={searchTraceposProducts}
          disabled={disabled}
          className="rounded-full bg-gold-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {searching
            ? "Searching..."
            : "Search Tracepos"}
        </button>
      </div>

      {syncMessage && (
        <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">
          {syncMessage}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {searchResults.length > 0 && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-cream-200">
          <h2 className="font-semibold text-cocoa-800">
            Tracepos search results
          </h2>

          <div className="mt-4 space-y-3">
            {searchResults.map((product) => (
              <div
                key={
                  product.xid ||
                  product.id ||
                  `${product.name}-${product.itemCode}`
                }
                className="rounded-xl border border-cream-200 bg-cream-50 p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold text-cocoa-800">
                      {product.name ||
                        "Unnamed product"}
                    </p>

                    <p className="mt-1 text-xs text-stone-600">
                      Item code:{" "}
                      {product.itemCode || "None"}
                    </p>

                    <p className="text-xs text-stone-600">
                      SKU: {product.sku || "None"}
                    </p>

                    <p className="break-all text-xs text-stone-600">
                      Product XID:{" "}
                      <strong>
                        {product.xid || "Missing"}
                      </strong>
                    </p>
                  </div>

                  <div className="text-sm text-cocoa-800">
                    Stock:{" "}
                    <strong>{product.stock}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {searchQuery.trim().length >= 2 &&
        !searching &&
        searchResults.length === 0 && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            No Tracepos products matched “
            {searchQuery}”.
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