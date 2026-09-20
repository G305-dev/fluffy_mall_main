export type TraceposProduct = {
  id?: string;
  name?: string;
  item_code?: string | null;
  sku?: string | null;
  current_stock?: number | string | null;
};

function getTraceposConfig() {
  const baseUrl =
    process.env.TRACEPOS_BASE_URL ||
    "https://app.tracepos.net/api/v1/public";

  const publicKey =  process.env.TRACEPOS_PUBLIC_KEY?.trim();
  const secretKey = process.env.TRACEPOS_SECRET_KEY?.trim();

  if (!publicKey || !secretKey) {
    throw new Error(
      "Tracepos API keys are not configured."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    headers: {
  "X-Tracepos-Public-Key": publicKey,
  "X-Tracepos-Secret-Key": secretKey,
  "X-Tracepos-API-Key": secretKey,
  Accept: "application/json",
},
  };
}

export function normalizeTraceposCode(
  value: unknown
) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export async function fetchTraceposProducts(): Promise<
  TraceposProduct[]
> {
  const {
    baseUrl,
    headers,
  } = getTraceposConfig();

  const products: TraceposProduct[] = [];
  const limit = 100;
  let page = 1;

  while (page <= 100) {
    const response = await fetch(
      `${baseUrl}/products?limit=${limit}&page=${page}`,
      {
        headers,
        cache: "no-store",
      }
    );

    

    const text = await response.text();

if (!response.ok) {
  let detail = text.slice(0, 500);

  try {
    const errorBody = JSON.parse(text);
    detail =
      errorBody?.message ||
      errorBody?.error ||
      detail;
  } catch {
    // Tracepos may return plain text or HTML for a 403.
  }

  throw new Error(
    `Tracepos request failed with HTTP ${response.status}: ${detail}`
  );
}

let payload: any;

try {
  payload = JSON.parse(text);
} catch {
  throw new Error(
    `Tracepos returned invalid JSON. HTTP status: ${response.status}`
  );
}

    if (!response.ok) {
      throw new Error(
        payload?.message ||
          payload?.error ||
          `Tracepos request failed with HTTP ${response.status}`
      );
    }

    const pageData = payload?.data;

    const rows = Array.isArray(pageData)
      ? pageData
      : Array.isArray(pageData?.data)
        ? pageData.data
        : [];

    products.push(...rows);

    const total = Number(pageData?.total || 0);
    const currentPage = Number(
      pageData?.current_page || page
    );

    if (
      rows.length === 0 ||
      rows.length < limit ||
      (total > 0 && products.length >= total) ||
      currentPage !== page
    ) {
      break;
    }

    page += 1;
  }

  return products;
}