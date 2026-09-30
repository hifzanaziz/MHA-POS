import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOptionPrice, normalizeOptionGroups, validateOptionGroups } from './optionUtils.js';

test('normalizeOptionGroups keeps option groups optional and normalizes prices', () => {
  const groups = normalizeOptionGroups([
    { name: ' Size ', required: true, options: [{ name: 'Regular', price: '0' }, { name: 'Large', price: '3' }] },
  ]);
  assert.deepEqual(groups, [{ name: 'Size', required: true, options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 3 }] }]);
});

test('validateOptionGroups rejects duplicate groups/options and invalid prices', () => {
  assert.equal(validateOptionGroups([{ name: 'Size', required: true, options: [{ name: 'Regular', price: 0 }, { name: 'Regular', price: 1 }] }]), 'Option names must be unique within each group.');
  assert.equal(validateOptionGroups([{ name: 'Size', required: false, options: [{ name: 'Large', price: -1 }] }]), 'Option price adjustment must be 0 or greater.');
});

test('calculateOptionPrice applies selected option adjustments to the base price', () => {
  const product = { price: 10, optionGroups: [
    { name: 'Size', required: true, options: [{ name: 'Regular', price: 0 }, { name: 'Large', price: 3 }] },
    { name: 'Flavour', required: false, options: [{ name: 'Spicy', price: 1 }] },
  ] };
  const result = calculateOptionPrice(product, { Size: 'Large', Flavour: 'Spicy' });
  assert.equal(result.price, 14);
  assert.deepEqual(result.selections, [
    { group: 'Size', option: 'Large', priceAdjustment: 3 },
    { group: 'Flavour', option: 'Spicy', priceAdjustment: 1 },
  ]);
});

test('calculateOptionPrice reports missing required selections', () => {
  const product = { price: 10, optionGroups: [{ name: 'Size', required: true, options: [{ name: 'Regular', price: 0 }] }] };
  assert.throws(() => calculateOptionPrice(product, {}), /Please select Size/);
});
