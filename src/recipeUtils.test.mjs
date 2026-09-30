import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderToRecipeFactor,
  getInventoryToRecipeFactor,
  calculateRecipeUsage,
  applyProductionWithRecipe,
} from './recipeUtils.js';

test('converts order UOM and inventory UOM directly to recipe UOM', () => {
  const sugar = { orderToInventory: 5, inventoryToRecipe: 500 };
  assert.equal(getOrderToRecipeFactor(sugar), 2500);
  assert.equal(getInventoryToRecipeFactor(sugar), 500);
});

test('calculates recipe usage from produced quantity', () => {
  const recipe = [{ inventorySkuId: 100, qtyRecipeUom: 50 }];
  assert.deepEqual(calculateRecipeUsage(recipe, 20), [{ inventorySkuId: 100, qtyRecipeUom: 1000 }]);
});

test('deducts inventory in inventory UOM using recipe UOM conversion', () => {
  const products = [
    { id: 1, skuType: 'product', stock: 10, produced: 10 },
    { id: 100, skuType: 'inventory', stock: 10, inventoryToRecipe: 500, recipeUom: 'Gram' },
  ];
  const recipes = { 1: [{ inventorySkuId: 100, qtyRecipeUom: 50 }] };
  const result = applyProductionWithRecipe(products, recipes, 1, 20);
  const product = result.products.find(p => p.id === 1);
  const sugar = result.products.find(p => p.id === 100);
  assert.equal(product.stock, 30);
  assert.equal(product.produced, 30);
  assert.equal(sugar.stock, 8);
  assert.equal(result.usage[0].qtyRecipeUom, 1000);
  assert.equal(result.usage[0].qtyInventoryUom, 2);
});

test('rejects production when inventory is insufficient', () => {
  const products = [
    { id: 1, skuType: 'product', stock: 0, produced: 0 },
    { id: 100, skuType: 'inventory', stock: 1, inventoryToRecipe: 500, recipeUom: 'Gram', name: 'Sugar' },
  ];
  const recipes = { 1: [{ inventorySkuId: 100, qtyRecipeUom: 300 }] };
  assert.throws(() => applyProductionWithRecipe(products, recipes, 1, 2), /Insufficient inventory/i);
});

test('resolves a base recipe with selected recipe-impacting option additions', async () => {
  const { resolveRecipeForSelections } = await import('./recipeUtils.js');
  const base = [{ inventorySkuId: 101, qtyRecipeUom: 100 }];
  const groups = [{
    id: 'size', name: 'Size', recipeImpact: true,
    options: [{ id: 'large', name: 'Large', recipeChanges: [{ inventorySkuId: 101, qtyRecipeUom: 100, mode: 'add' }] }]
  }];
  const result = resolveRecipeForSelections(base, groups, { size: 'large' });
  assert.deepEqual(result, [{ inventorySkuId: 101, qtyRecipeUom: 200 }]);
});

test('replaces a base ingredient for a selected recipe-impacting option', async () => {
  const { resolveRecipeForSelections } = await import('./recipeUtils.js');
  const base = [
    { inventorySkuId: 101, qtyRecipeUom: 100 },
    { inventorySkuId: 102, qtyRecipeUom: 20 },
  ];
  const groups = [{
    id: 'flavour', name: 'Flavour', recipeImpact: true,
    options: [{ id: 'spicy', name: 'Spicy', recipeChanges: [{ inventorySkuId: 103, qtyRecipeUom: 25, mode: 'replace', replacesInventorySkuId: 102 }] }]
  }];
  const result = resolveRecipeForSelections(base, groups, { flavour: 'spicy' });
  assert.deepEqual(result, [
    { inventorySkuId: 101, qtyRecipeUom: 100 },
    { inventorySkuId: 103, qtyRecipeUom: 25 },
  ]);
});

test('production deducts inventory using the selected option recipe', async () => {
  const { applyProductionWithRecipe } = await import('./recipeUtils.js');
  const products = [
    { id: 1, skuType: 'product', stock: 0, produced: 0 },
    { id: 101, skuType: 'inventory', stock: 10, inventoryToRecipe: 100, recipeUom: 'Gram', name: 'Patty' },
    { id: 102, skuType: 'inventory', stock: 10, inventoryToRecipe: 100, recipeUom: 'Gram', name: 'Spicy Patty' },
  ];
  const recipes = { 1: [{ inventorySkuId: 101, qtyRecipeUom: 100 }] };
  const optionGroups = [{ id: 'flavour', name: 'Flavour', recipeImpact: true, required: true, options: [{ id: 'spicy', name: 'Spicy', recipeChanges: [{ inventorySkuId: 102, qtyRecipeUom: 100, mode: 'replace', replacesInventorySkuId: 101 }] }] }];
  const result = applyProductionWithRecipe(products, recipes, 1, 2, optionGroups, { flavour: 'spicy' });
  assert.equal(result.products.find(x => x.id === 101).stock, 10);
  assert.equal(result.products.find(x => x.id === 102).stock, 8);
  assert.equal(result.products.find(x => x.id === 1).stock, 2);
});
