import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductSku, getRecipeStatus, canDeleteProductSku } from './productUtils.js';

test('validates a new Product SKU and rejects duplicate SKU codes', () => {
  const products = [{ id: 1, skuType: 'product', sku: 'BUR-001', name: 'Burger' }];
  assert.equal(validateProductSku({ sku: 'BUR-002', name: 'Wrap', category: 'Food', price: 10 }, products), '');
  assert.match(validateProductSku({ sku: 'BUR-001', name: 'Wrap', category: 'Food', price: 10 }, products), /already exists/i);
});

test('recipe status reports configured only when recipe has ingredients', () => {
  assert.equal(getRecipeStatus([{ inventorySkuId: 101, qtyRecipeUom: 10 }]), 'Recipe Configured');
  assert.equal(getRecipeStatus([]), 'Recipe Not Configured');
  assert.equal(getRecipeStatus(undefined), 'Recipe Not Configured');
});

test('blocks Product SKU deletion when recipe exists or production has been recorded', () => {
  assert.equal(canDeleteProductSku({ produced: 0 }, []), '');
  assert.match(canDeleteProductSku({ produced: 0 }, [{ inventorySkuId: 101 }]), /recipe/i);
  assert.match(canDeleteProductSku({ produced: 3 }, []), /production history/i);
});

test('filters Product SKUs by sku, name, category and recipe status', async () => {
  const { filterAndSortProductSkus } = await import('./productUtils.js');
  const products = [
    { id: 1, skuType: 'product', sku: 'KR-001', name: 'Samperit Susu', category: 'Kuih Raya', price: 20, produced: 5, sold: 2, stock: 3 },
    { id: 2, skuType: 'product', sku: 'RT-001', name: 'Sausage Roll', category: 'Roti', price: 25, produced: 8, sold: 4, stock: 4 },
  ];
  const recipes = { 1: [{ inventorySkuId: 101, qtyRecipeUom: 10 }], 2: [] };
  assert.deepEqual(filterAndSortProductSkus(products, recipes, 'samperit', { key: 'name', direction: 'asc' }).map(p => p.id), [1]);
  assert.deepEqual(filterAndSortProductSkus(products, recipes, 'roti', { key: 'name', direction: 'asc' }).map(p => p.id), [2]);
  assert.deepEqual(filterAndSortProductSkus(products, recipes, 'not configured', { key: 'name', direction: 'asc' }).map(p => p.id), [2]);
});

test('sorts Product SKUs ascending and descending by supported columns', async () => {
  const { filterAndSortProductSkus } = await import('./productUtils.js');
  const products = [
    { id: 1, skuType: 'product', sku: 'B-002', name: 'Beta', category: 'Roti', price: 25, produced: 3, sold: 2, stock: 1 },
    { id: 2, skuType: 'product', sku: 'A-001', name: 'Alpha', category: 'Kuih Raya', price: 20, produced: 7, sold: 1, stock: 6 },
  ];
  const recipes = { 1: [], 2: [{ inventorySkuId: 101, qtyRecipeUom: 10 }] };
  assert.deepEqual(filterAndSortProductSkus(products, recipes, '', { key: 'sku', direction: 'asc' }).map(p => p.id), [2,1]);
  assert.deepEqual(filterAndSortProductSkus(products, recipes, '', { key: 'price', direction: 'desc' }).map(p => p.id), [1,2]);
  assert.deepEqual(filterAndSortProductSkus(products, recipes, '', { key: 'recipeStatus', direction: 'asc' }).map(p => p.id), [2,1]);
});

test('validates product option groups and their option price adjustments', async () => {
  const { validateProductOptions } = await import('./productUtils.js');
  assert.equal(validateProductOptions([{ id: 'size', name: 'Size', required: true, recipeImpact: true, options: [{ id: 'reg', name: 'Regular', priceAdjustment: 0 }] }]), '');
  assert.match(validateProductOptions([{ id: 'size', name: '', options: [] }]), /name/i);
});
