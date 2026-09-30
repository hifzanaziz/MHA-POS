import test from 'node:test';
import assert from 'node:assert/strict';
import { sortProducts, recordPurchase, validateSku } from './inventoryUtils.js';

test('sortProducts sorts text ascending and descending without mutating source', () => {
  const products = [
    { id: 1, name: 'Zinger', stock: 5 },
    { id: 2, name: 'Apple Pie', stock: 12 },
  ];
  const asc = sortProducts(products, 'name', 'asc');
  const desc = sortProducts(products, 'name', 'desc');
  assert.deepEqual(asc.map(x => x.name), ['Apple Pie', 'Zinger']);
  assert.deepEqual(desc.map(x => x.name), ['Zinger', 'Apple Pie']);
  assert.equal(products[0].name, 'Zinger');
});

test('sortProducts sorts numeric columns numerically', () => {
  const products = [
    { id: 1, stock: 20 },
    { id: 2, stock: 3 },
    { id: 3, stock: 11 },
  ];
  assert.deepEqual(sortProducts(products, 'stock', 'asc').map(x => x.stock), [3, 11, 20]);
});

test('recordPurchase increases stock and appends purchase history', () => {
  const product = { id: 1, stock: 10, purchaseHistory: [] };
  const updated = recordPurchase(product, { quantity: 6, reference: 'PO-1001', supplier: 'ABC Supplier', date: '2026-08-27' });
  assert.equal(updated.stock, 16);
  assert.equal(updated.purchaseHistory.length, 1);
  assert.equal(updated.purchaseHistory[0].quantity, 6);
  assert.equal(updated.purchaseHistory[0].reference, 'PO-1001');
  assert.equal(product.stock, 10);
});

test('recordPurchase rejects non-positive purchase quantities', () => {
  assert.throws(() => recordPurchase({ stock: 10, purchaseHistory: [] }, { quantity: 0 }), /greater than 0/i);
});

test('validateSku requires core SKU and UOM fields and catches duplicate code', () => {
  const existing = [{ id: 1, sku: 'CHK-001' }];
  const missing = validateSku({ sku: '', name: '', category: '', price: '', minimum: '', orderUom: '', inventoryUom: '', recipeUom: '' }, existing);
  assert.ok(missing.length >= 1);

  const duplicate = validateSku({ id: 2, sku: 'CHK-001', name: 'Chicken', category: 'Food', price: 10, minimum: 1, orderUom: 'Carton', inventoryUom: 'Piece', recipeUom: 'Gram', orderToInventory: 1, inventoryToRecipe: 1 }, existing);
  assert.ok(duplicate.some(x => /already exists/i.test(x)));

  const valid = validateSku({ id: 2, sku: 'NEW-001', name: 'New SKU', category: 'Food', price: 10, minimum: 1, orderUom: 'Carton', inventoryUom: 'Piece', recipeUom: 'Gram', orderToInventory: 1, inventoryToRecipe: 1 }, existing);
  assert.deepEqual(valid, []);
});

test('recordPurchase converts Order UOM quantity into Inventory UOM stock', () => {
  const product = { stock: 10, orderUom: 'Carton', inventoryUom: 'Pack', orderToInventory: 5, purchaseHistory: [] };
  const updated = recordPurchase(product, { quantity: 2, uom: 'order', supplier: 'A', reference: 'PO1', date: '2026-08-27' });
  assert.equal(updated.stock, 20);
  assert.equal(updated.purchaseHistory[0].inventoryQuantity, 10);
});
