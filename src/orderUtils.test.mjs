import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderRecord, completeOrderPayment } from './orderUtils.js';

const products = [
  { id: 1, skuType: 'product', sku: 'A', name: 'Item A', price: 20, stock: 10, sold: 2 },
  { id: 2, skuType: 'product', sku: 'B', name: 'Item B', price: 25, stock: 5, sold: 1 },
];

const cart = [
  { id: 1, sku: 'A', name: 'Item A', price: 20, qty: 2 },
  { id: 2, sku: 'B', name: 'Item B', price: 25, qty: 1 },
];

test('creates a pending order with subtotal, tax and grand total without changing products', () => {
  const result = createOrderRecord(products, cart, {
    orderId: 'ORD-0001',
    date: '2026-08-27T16:00:00.000Z',
    paymentStatus: 'Pending',
  });
  assert.equal(result.order.subtotal, 65);
  assert.equal(result.order.tax, 3.9);
  assert.equal(result.order.grandTotal, 68.9);
  assert.equal(result.order.paymentStatus, 'Pending');
  assert.deepEqual(result.products, products);
  assert.equal(result.order.items.length, 2);
});

test('creates a completed order and reduces product stock while increasing sold quantity', () => {
  const result = createOrderRecord(products, cart, {
    orderId: 'ORD-0002',
    date: '2026-08-27T16:01:00.000Z',
    paymentStatus: 'Completed',
  });
  assert.equal(result.products[0].stock, 8);
  assert.equal(result.products[0].sold, 4);
  assert.equal(result.products[1].stock, 4);
  assert.equal(result.products[1].sold, 2);
});

test('completing a pending order changes its status and applies product sale exactly once', () => {
  const pending = createOrderRecord(products, cart, {
    orderId: 'ORD-0003',
    date: '2026-08-27T16:02:00.000Z',
    paymentStatus: 'Pending',
  });
  const completed = completeOrderPayment(pending.products, pending.order, '2026-08-27T16:05:00.000Z');
  assert.equal(completed.order.paymentStatus, 'Completed');
  assert.equal(completed.order.paidAt, '2026-08-27T16:05:00.000Z');
  assert.equal(completed.products[0].stock, 8);
  assert.equal(completed.products[0].sold, 4);

  const second = completeOrderPayment(completed.products, completed.order, '2026-08-27T16:06:00.000Z');
  assert.deepEqual(second.products, completed.products);
});

test('blocks payment completion if current product stock is insufficient', () => {
  const pending = createOrderRecord(products, cart, {
    orderId: 'ORD-0004',
    date: '2026-08-27T16:02:00.000Z',
    paymentStatus: 'Pending',
  });
  const lowStock = products.map((p) => p.id === 1 ? { ...p, stock: 1 } : p);
  assert.throws(() => completeOrderPayment(lowStock, pending.order), /Insufficient product stock/);
});

test('stores customer info and defaults pickup status to Pending', () => {
  const result = createOrderRecord(products, cart, {
    orderId: 'ORD-0100',
    date: '2026-08-27T10:00:00.000Z',
    paymentStatus: 'Completed',
    customerName: 'Ali Ahmad',
    customerTelephone: '0123456789',
  });
  assert.equal(result.order.customerName, 'Ali Ahmad');
  assert.equal(result.order.customerTelephone, '0123456789');
  assert.equal(result.order.pickupStatus, 'Pending');
});

test('completes pickup without changing payment status', async () => {
  const { completeOrderPickup } = await import('./orderUtils.js');
  const order = { id: 'ORD-0101', paymentStatus: 'Pending', pickupStatus: 'Pending' };
  const updated = completeOrderPickup(order, '2026-08-27T11:00:00.000Z');
  assert.equal(updated.pickupStatus, 'Complete');
  assert.equal(updated.pickedUpAt, '2026-08-27T11:00:00.000Z');
  assert.equal(updated.paymentStatus, 'Pending');
});

test('filters orders inclusively by date range and sorts customer name ascending/descending', async () => {
  const { filterAndSortOrders } = await import('./orderUtils.js');
  const sample = [
    { id: 'ORD-1', orderDate: '2026-08-20T10:00:00.000Z', customerName: 'Zara', paymentStatus: 'Completed', pickupStatus: 'Pending', subtotal: 20, tax: 1.2, grandTotal: 21.2, items: [] },
    { id: 'ORD-2', orderDate: '2026-08-21T10:00:00.000Z', customerName: 'Ali', paymentStatus: 'Pending', pickupStatus: 'Complete', subtotal: 25, tax: 1.5, grandTotal: 26.5, items: [] },
    { id: 'ORD-3', orderDate: '2026-08-22T10:00:00.000Z', customerName: 'Mira', paymentStatus: 'Completed', pickupStatus: 'Pending', subtotal: 30, tax: 1.8, grandTotal: 31.8, items: [] },
  ];
  const asc = filterAndSortOrders(sample, { fromDate: '2026-08-21', toDate: '2026-08-22', sortKey: 'customerName', sortDir: 'asc' });
  assert.deepEqual(asc.map((x) => x.customerName), ['Ali', 'Mira']);
  const desc = filterAndSortOrders(sample, { fromDate: '2026-08-21', toDate: '2026-08-22', sortKey: 'customerName', sortDir: 'desc' });
  assert.deepEqual(desc.map((x) => x.customerName), ['Mira', 'Ali']);
});

test('stores selected SKU options and final variation price in order items', () => {
  const optionGroups = [{ id: 'size', name: 'Size', options: [{ id: 'large', name: 'Large', priceAdjustment: 4 }] }];
  const cartWithOptions = [{ id: 1, sku: 'A', name: 'Item A', price: 24, basePrice: 20, qty: 1, selections: { size: 'large' }, selectedOptions: [{ groupId: 'size', groupName: 'Size', optionId: 'large', optionName: 'Large', priceAdjustment: 4 }] }];
  const result = createOrderRecord(products, cartWithOptions, { orderId: 'ORD-0200', paymentStatus: 'Completed' });
  assert.equal(result.order.items[0].price, 24);
  assert.equal(result.order.items[0].basePrice, 20);
  assert.deepEqual(result.order.items[0].selections, { size: 'large' });
  assert.equal(result.order.items[0].selectedOptions[0].optionName, 'Large');
});
