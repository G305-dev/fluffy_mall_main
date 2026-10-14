import { Workbook } from "exceljs";
import type { Product } from "@/lib/types";

export const PRODUCT_COLUMNS = [
  "id", "slug", "name", "item_code", "category", "price", "compare_at",
  "stock", "image_urls", "short", "description", "delivery_note",
  "featured", "bestseller", "variants_json",
  "barcode", "unit", "product_type", "purchase_cost",
] as const;

export type ProductColumn = (typeof PRODUCT_COLUMNS)[number];
export type SpreadsheetRow = {
  line: number;
  fields: Record<ProductColumn, string>;
};

const ALIASES: Record<ProductColumn, string[]> = {
  id: ["id", "product_id"],
  slug: ["slug"],
  name: ["name", "product_name", "item_name", "item_description", "product"],
  item_code: ["item_code", "tracepos_item_code", "code", "sku", "barcode"],
  category: ["category", "category_name", "category_slug"],
  price: ["price", "selling_price", "sales_price", "retail_price", "unit_price"],
  compare_at: ["compare_at", "compare_at_price"],
  stock: ["stock", "current_stock", "qty", "quantity", "on_hand"],
  image_urls: ["image_urls", "images", "image_url", "image"],
  short: ["short", "summary", "short_description"],
  description: ["description", "details"],
  delivery_note: ["delivery_note", "delivery"],
  featured: ["featured"],
  bestseller: ["bestseller", "best_seller"],
  variants_json: ["variants_json"],
  barcode: ["barcode", "product_barcode"],
  unit: ["unit", "measurement_unit"],
  product_type: ["product_type", "type"],
  purchase_cost: ["purchase_cost", "cost_price", "buying_price"],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// A small RFC 4180-style reader: handles BOM, CRLF, quoted commas and newlines.
function parseCsv(text: string) {
  const rows: string[][] = [];
  const input = text.replace(/^\uFEFF/, "");
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("The CSV has an unclosed quoted cell.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export async function readProductSheet(file: File): Promise<SpreadsheetRow[]> {
  const extension = file.name.toLowerCase().split(".").pop();
  let rows: string[][];

  if (extension === "csv") {
    rows = parseCsv(await file.text());
  } else if (extension === "xlsx") {
    const workbook = new Workbook();
    // ExcelJS's bundled Buffer type is older than the project's Node Buffer type.
    await workbook.xlsx.load(
      Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]
    );
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("The Excel workbook has no worksheet.");
    rows = [];
    sheet.eachRow((line) => {
      const cells: string[] = [];
      for (let index = 1; index <= line.cellCount; index++) {
        cells.push(line.getCell(index).text.trim());
      }
      if (cells.some(Boolean)) rows.push(cells);
    });
  } else {
    throw new Error("Upload a .csv or .xlsx file (older .xls is not supported).");
  }

  if (rows.length < 2) throw new Error("The file needs a header and at least one product row.");
  if (rows.length > 1001) throw new Error("Import up to 1,000 products per file.");

  const headings = rows[0].map(normalizeHeader);
  // A plain "barcode" column belongs to this website. Only interpret it as a
  // legacy POS item code when the rest of the file clearly uses POS headers.
  const legacyPosSheet = headings.includes("barcode") &&
    ["item_description", "item_name"].some((heading) => headings.includes(heading)) &&
    ["selling_price", "sales_price", "retail_price"].some((heading) => headings.includes(heading));
  const columns = {} as Record<ProductColumn, number>;
  for (const column of PRODUCT_COLUMNS) {
    const aliases = column === "item_code" && !legacyPosSheet
      ? ALIASES.item_code.filter((alias) => alias !== "barcode")
      : ALIASES[column];
    columns[column] = headings.findIndex((heading) => aliases.includes(heading));
  }
  if (columns.name < 0 || columns.price < 0) {
    throw new Error("Required columns: name and price. Download the template for all supported columns.");
  }

  return rows.slice(1).map((cells, index) => {
    const fields = {} as Record<ProductColumn, string>;
    for (const column of PRODUCT_COLUMNS) {
      fields[column] = columns[column] < 0 ? "" : (cells[columns[column]] || "").trim();
    }
    return { line: index + 2, fields };
  });
}

function exportFields(product: Product, purchaseCost?: number): string[] {
  return [
    product.id,
    product.slug,
    product.name,
    product.traceposItemCode || "",
    product.category,
    String(product.price),
    product.compareAt ? String(product.compareAt) : "",
    String(product.stock),
    product.images.filter((image) => image !== "/images/product-placeholder.svg").join("|"),
    product.short || "",
    product.description || "",
    product.deliveryNote || "",
    product.featured ? "true" : "false",
    product.bestseller ? "true" : "false",
    product.variants.length ? JSON.stringify(product.variants) : "",
    product.barcode || "",
    product.unit || "pcs",
    product.productType || (product.variants.length ? "variable" : "standard"),
    purchaseCost === undefined ? "" : String(purchaseCost),
  ];
}

function csvCell(raw: string) {
  // Prevent a product name/code from becoming a spreadsheet formula.
  const safe = /^[\s]*[=+@\-]/.test(raw) ? `\t${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function writeProductSheet(
  products: Product[],
  format: "csv" | "xlsx",
  costs: Record<string, number> = {}
): Promise<string | Buffer> {
  const rows = [Array.from(PRODUCT_COLUMNS), ...products.map((product) => exportFields(product, costs[product.id]))];
  if (format === "csv") {
    return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  for (const column of sheet.columns) column.width = 20;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}