# Import the classified single-product stock report

Keep the original stock report private; it contains live product and stock information and is not stored in this repository. Importing only occurs when an administrator previews and applies it.

1. Back up the production products collection. In **Admin → Products → Import products**, select the **Single (candidate)** CSV, not the Variant or Needs review sheet.
2. Click **Preview import** and review the new, updated, duplicate, held, and invalid rows. The server compares rows with the current product catalogue using product names and barcodes. The import cannot be applied while invalid rows remain.
3. When the preview is correct, click **Apply** once. The server checks the catalogue again before writing. If an import fails or may have partially completed, refresh the preview before retrying.
4. Review held rows separately. The ladder-size rows must not be created as separate products or silently attached to existing options.

For a confident existing standard-product match, the report updates its barcode when provided, selling price, and stock. It keeps photos, description, category, and options. New products use the report's name, barcode, price, and exact non-negative quantity, with the existing image placeholder until photos are uploaded. Unknown or ambiguous matches are held for review. Saved admin category names take precedence, and Tray/Trays both use `trays`.

The importer understands the report's `₦` prices and `PC`/`Pcs` stock suffixes. Negative, fractional, and unrecognized stock quantities are rejected, never clamped. Other classified sheets cannot be imported as singles.

The earlier dry run used the sample products in `data/products.json`, not the live store. Production preview counts may differ. Always use the live preview before applying an import.
