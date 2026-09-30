export function getInventoryToRecipeFactor(item) {
  const factor = Number(item?.inventoryToRecipe);
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('Inventory to Recipe conversion must be greater than 0');
  return factor;
}

export function getOrderToRecipeFactor(item) {
  const orderToInventory = Number(item?.orderToInventory);
  if (!Number.isFinite(orderToInventory) || orderToInventory <= 0) throw new Error('Order to Inventory conversion must be greater than 0');
  return orderToInventory * getInventoryToRecipeFactor(item);
}

export function calculateRecipeUsage(recipeLines, producedQty) {
  const qty = Number(producedQty);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Produced quantity must be greater than 0');
  return (recipeLines || []).map(line => ({
    inventorySkuId: line.inventorySkuId,
    qtyRecipeUom: Number(line.qtyRecipeUom) * qty,
  }));
}


export function resolveRecipeForSelections(baseRecipe = [], optionGroups = [], selections = {}) {
  const lines = (baseRecipe || []).map((line) => ({ ...line, qtyRecipeUom: Number(line.qtyRecipeUom) }));
  const byInventory = new Map(lines.map((line) => [Number(line.inventorySkuId), line]));
  for (const group of optionGroups || []) {
    if (!group?.recipeImpact) continue;
    const selectedId = selections?.[group.id];
    if (!selectedId) continue;
    const option = (group.options || []).find((candidate) => candidate.id === selectedId);
    if (!option) continue;
    for (const change of option.recipeChanges || []) {
      const inventorySkuId = Number(change.inventorySkuId);
      const qty = Number(change.qtyRecipeUom);
      if (!inventorySkuId || !Number.isFinite(qty) || qty <= 0) continue;
      if (change.mode === 'replace') {
        const replaceId = Number(change.replacesInventorySkuId);
        if (replaceId && byInventory.has(replaceId)) byInventory.delete(replaceId);
        byInventory.set(inventorySkuId, { inventorySkuId, qtyRecipeUom: qty });
      } else {
        const current = byInventory.get(inventorySkuId);
        byInventory.set(inventorySkuId, { inventorySkuId, qtyRecipeUom: Number(current?.qtyRecipeUom || 0) + qty });
      }
    }
  }
  return [...byInventory.values()];
}

export function validateOptionSelections(optionGroups = [], selections = {}) {
  for (const group of optionGroups || []) {
    if (!group?.required) continue;
    if (!selections?.[group.id]) return `Please select ${group.name || 'an option'}.`;
  }
  return '';
}

export function calculateOptionPrice(basePrice, optionGroups = [], selections = {}) {
  let price = Number(basePrice || 0);
  for (const group of optionGroups || []) {
    const selectedId = selections?.[group.id];
    if (!selectedId) continue;
    const option = (group.options || []).find((candidate) => candidate.id === selectedId);
    if (option && group.priceImpact !== false) price += Number(option.priceAdjustment || 0);
  }
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

export function applyProductionWithRecipe(products, recipes, productId, producedQty, optionGroups = [], selections = {}) {
  const qty = Number(producedQty);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Produced quantity must be greater than 0');
  const product = products.find(p => p.id === productId);
  if (!product) throw new Error('Product SKU not found');
  const recipe = resolveRecipeForSelections(recipes?.[productId] || [], optionGroups, selections);
  if (!recipe.length) throw new Error('Recipe is not configured for this Product SKU');

  const usage = calculateRecipeUsage(recipe, qty).map(line => {
    const inventory = products.find(p => p.id === line.inventorySkuId);
    if (!inventory) throw new Error('Recipe Inventory SKU not found');
    const factor = getInventoryToRecipeFactor(inventory);
    const qtyInventoryUom = line.qtyRecipeUom / factor;
    if (Number(inventory.stock || 0) + 1e-9 < qtyInventoryUom) {
      throw new Error(`Insufficient inventory for ${inventory.name || inventory.sku || 'ingredient'}`);
    }
    return { ...line, qtyInventoryUom, inventoryName: inventory.name, inventoryUom: inventory.inventoryUom, recipeUom: inventory.recipeUom };
  });

  const updated = products.map(item => {
    if (item.id === productId) {
      return { ...item, stock: Number(item.stock || 0) + qty, produced: Number(item.produced || 0) + qty };
    }
    const used = usage.find(x => x.inventorySkuId === item.id);
    if (!used) return item;
    return { ...item, stock: Number(item.stock || 0) - used.qtyInventoryUom };
  });

  return { products: updated, usage };
}
