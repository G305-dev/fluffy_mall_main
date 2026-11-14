import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterProductsForExport } from '../lib/product-export-filter.ts';

test('export filters explicit and legacy product types consistently', () => {
  const products = [
    { id: 'explicit-standard', productType: 'standard', variants: [] },
    { id: 'explicit-variable', productType: 'variable', variants: [] },
    { id: 'legacy-standard', variants: [] },
    { id: 'legacy-variable', variants: [{ id: 'v' }] },
  ];
  assert.equal(filterProductsForExport(products, 'all').length, 4);
  assert.deepEqual(filterProductsForExport(products, 'standard').map(p => p.id), ['explicit-standard', 'legacy-standard']);
  assert.deepEqual(filterProductsForExport(products, 'variable').map(p => p.id), ['explicit-variable', 'legacy-variable']);
  assert.equal(filterProductsForExport([], 'variable').length, 0);
});
