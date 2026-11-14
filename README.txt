Inventory admin UI update

Based on origin/main commit 9b6e212dc0d94c5514091e3f7ada37ebd3049942. Back up your project and merge these files into that version using their paths; review differences first if your version has later changes. No database migration is included.

Export: select all, variable or standard products and download CSV or Excel. Existing products without an explicit type are classified by their variants, as in the spreadsheet export. Barcode management stays on its existing Inventory > Barcode management page; its product counts come from the database. The category migration control is removed from the products page only; data and API remain unchanged.

The desktop sidebar can be collapsed; the existing mobile drawer remains. The account menu provides settings where the existing role permits it and logout. The theme switch applies to the admin area, not the storefront, and the preference and sidebar state are stored in the browser.

Checks: TypeScript, Next lint, and 18 tests passed. No live database or authenticated browser testing was available. This UI package does not include or resolve the earlier incomplete import/barcode retry and concurrent-edit fixes.
