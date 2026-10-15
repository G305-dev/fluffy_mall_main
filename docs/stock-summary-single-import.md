# Import the classified single-product stock report

The uploaded `Untitled spreadsheet - Single (candidate).csv` is **not in Git**: this repository is public, and the report contains live item codes and stock figures. Keep the original file private. No database import happens merely by deploying this code.

After deploying the import changes:

1. Back up the production products collection. In **Admin → Products → Import products**, choose the original **Single (candidate)** CSV (not the Variant or Needs review sheet).
2. Click **Preview import**. The server compares each row with **current MongoDB products and their options**. Review the `new`, `existing updates`, `duplicates`, `held for review`, and `invalid` counts and the row-by-row issues. If any invalid rows exist, the import button remains disabled.
3. When the preview is right, click **Apply** once. The server rechecks the live catalogue before writing. Refresh the preview before retrying a failed/partially completed import.
4. Review the held rows separately. In particular, **all five ladder-size rows are held**, including both conflicting 6-step codes. They are never created as new single products or silently attached to the existing ladder options.

For a confident existing **standard** product match, the report updates only its TracePOS item code, selling price and stock; it keeps its photos, description, category, variants and Code 128 barcode unchanged. New products are standard products with the report's name, item code, selling price and exact non-negative quantity. They use the existing image placeholder until photos are uploaded. Unknown or ambiguous matches are held, never overwritten. Saved admin category names take precedence, and Tray/Trays both use `trays`.

The importer understands the report's `₦` prices and `PC`/`Pcs` stock suffixes. Negative/fractional/unrecognized stocks are **rejected**, never clamped. Other classified sheets cannot be imported as singles. Import item codes link to the existing TracePOS stock/sales integrations; Code 128 barcodes remain independent.

A dry run against the **24 sample products in `data/products.json`**, *not* the live store, found 245 new rows, 6 confident existing-product updates, 11 rows to review (5 ladders and 6 possible duplicates), 0 invalid. The actual production counts may differ. Of the 47 quantity-one rows, 45 would be inserted, one would update an existing product, and one is held for review; no quantity is silently changed.

Checks: `npx tsc --noEmit`, `npm run lint`, and (with Node 22) `node --experimental-strip-types --test tests/product-import-matching.test.mjs`. The full Next.js production build also needs access to Google Fonts and a configured MongoDB connection; it cannot be verified in a network-restricted, credential-free workspace.
