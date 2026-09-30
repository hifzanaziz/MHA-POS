import test from 'node:test';
import assert from 'node:assert/strict';
import { getNetSalesSummary, getTopProductSales, getTopInventoryUsage, getStockAlerts, getSellingTrend } from './dashboardUtils.js';

test('net sales includes only completed orders for daily and current month', () => {
  const now = new Date('2026-08-27T17:00:00+08:00');
  const orders = [
    { orderDate: '2026-08-27T10:00:00+08:00', paymentStatus: 'Completed', grandTotal: 106 },
    { orderDate: '2026-08-27T11:00:00+08:00', paymentStatus: 'Pending', grandTotal: 212 },
    { orderDate: '2026-08-05T09:00:00+08:00', paymentStatus: 'Completed', grandTotal: 53 },
    { orderDate: '2026-07-31T09:00:00+08:00', paymentStatus: 'Completed', grandTotal: 500 },
  ];
  assert.deepEqual(getNetSalesSummary(orders, now), { daily: 106, monthly: 159 });
});

test('top product sales returns top five product SKUs by sold quantity', () => {
  const products = [
    { id: 1, skuType: 'product', name: 'A', sold: 2 },
    { id: 2, skuType: 'product', name: 'B', sold: 8 },
    { id: 3, skuType: 'product', name: 'C', sold: 5 },
    { id: 4, skuType: 'product', name: 'D', sold: 9 },
    { id: 5, skuType: 'product', name: 'E', sold: 1 },
    { id: 6, skuType: 'product', name: 'F', sold: 6 },
    { id: 101, skuType: 'inventory', name: 'Raw', sold: 99 },
  ];
  assert.deepEqual(getTopProductSales(products).map(x => [x.name, x.sold]), [
    ['D', 9], ['B', 8], ['F', 6], ['C', 5], ['A', 2],
  ]);
});

test('inventory usage is calculated from produced quantity times recipe quantity', () => {
  const products = [
    { id: 1, skuType: 'product', name: 'Cake', produced: 10 },
    { id: 2, skuType: 'product', name: 'Bread', produced: 4 },
    { id: 101, skuType: 'inventory', sku: 'FLOUR', name: 'Flour', recipeUom: 'Gram' },
    { id: 102, skuType: 'inventory', sku: 'EGG', name: 'Egg', recipeUom: 'Piece' },
  ];
  const recipes = {
    1: [{ inventorySkuId: 101, qtyRecipeUom: 100 }, { inventorySkuId: 102, qtyRecipeUom: 2 }],
    2: [{ inventorySkuId: 101, qtyRecipeUom: 80 }],
  };
  assert.deepEqual(getTopInventoryUsage(products, recipes).map(x => [x.name, x.usage, x.uom]), [
    ['Flour', 1320, 'Gram'], ['Egg', 20, 'Piece'],
  ]);
});

test('stock alerts are separated between inventory and product SKUs', () => {
  const products = [
    { skuType: 'product', name: 'A', stock: 2, minimum: 3 },
    { skuType: 'product', name: 'B', stock: 5, minimum: 3 },
    { skuType: 'inventory', name: 'Flour', stock: 0, minimum: 2 },
    { skuType: 'inventory', name: 'Sugar', stock: 9, minimum: 2 },
  ];
  const alerts = getStockAlerts(products);
  assert.deepEqual(alerts.product.map(x => x.name), ['A']);
  assert.deepEqual(alerts.inventory.map(x => x.name), ['Flour']);
});

test('selling trend aggregates completed order item quantities by day and excludes pending orders', () => {
  const now = new Date('2026-08-27T17:00:00+08:00');
  const orders = [
    { orderDate: '2026-08-27T10:00:00+08:00', paymentStatus: 'Completed', items: [{ qty: 2 }, { qty: 1 }] },
    { orderDate: '2026-08-27T11:00:00+08:00', paymentStatus: 'Pending', items: [{ qty: 99 }] },
    { orderDate: '2026-08-26T09:00:00+08:00', paymentStatus: 'Completed', items: [{ qty: 4 }] },
    { orderDate: '2026-08-20T09:00:00+08:00', paymentStatus: 'Completed', items: [{ qty: 7 }] },
  ];
  const trend = getSellingTrend(orders, '7d', now);
  assert.equal(trend.length, 7);
  assert.equal(trend.at(-1).sold, 3);
  assert.equal(trend.at(-2).sold, 4);
  assert.equal(trend.reduce((sum, row) => sum + row.sold, 0), 7);
});

test('one month selling trend returns 30 ordered daily points', () => {
  const now = new Date('2026-08-27T17:00:00+08:00');
  const trend = getSellingTrend([], '1m', now);
  assert.equal(trend.length, 30);
  assert.equal(trend.every((row) => row.sold === 0), true);
  assert.ok(trend[0].date < trend.at(-1).date);
});
