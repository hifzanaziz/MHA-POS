export function validateProductSku(form, products, editingId = null) {
  if (!String(form?.sku || '').trim()) return 'Product SKU is required.';
  if (!String(form?.name || '').trim()) return 'Product name is required.';
  if (!String(form?.category || '').trim()) return 'Category is required.';
  const price = Number(form?.price);
  if (!Number.isFinite(price) || price < 0) return 'Selling price must be 0 or greater.';
  const duplicate = (products || []).some((p) =>
    p.skuType !== 'inventory' &&
    p.id !== editingId &&
    String(p.sku || '').trim().toLowerCase() === String(form.sku).trim().toLowerCase()
  );
  if (duplicate) return 'Product SKU already exists.';
  return '';
}

export function getRecipeStatus(recipe) {
  return Array.isArray(recipe) && recipe.length ? 'Recipe Configured' : 'Recipe Not Configured';
}

export function canDeleteProductSku(product, recipe) {
  if (Array.isArray(recipe) && recipe.length) return 'Delete is blocked because this Product SKU has a configured recipe.';
  if (Number(product?.produced || 0) > 0) return 'Delete is blocked because this Product SKU has production history.';
  return '';
}

export function filterAndSortProductSkus(products, recipes = {}, query = '', sort = { key: 'name', direction: 'asc' }) {
  const term = String(query || '').trim().toLowerCase();
  const productSkus = (products || []).filter((p) => p.skuType !== 'inventory');
  const filtered = term
    ? productSkus.filter((p) => {
        const recipeStatus = getRecipeStatus(recipes[p.id] || []);
        return [p.sku, p.name, p.category, recipeStatus]
          .some((value) => String(value ?? '').toLowerCase().includes(term));
      })
    : productSkus;

  const key = sort?.key || 'name';
  const direction = sort?.direction === 'desc' ? -1 : 1;
  return [...filtered].sort((a, b) => {
    const valueFor = (p) => {
      if (key === 'recipeStatus') return getRecipeStatus(recipes[p.id] || []);
      return p[key] ?? '';
    };
    const av = valueFor(a);
    const bv = valueFor(b);
    const an = Number(av);
    const bn = Number(bv);
    if (av !== '' && bv !== '' && Number.isFinite(an) && Number.isFinite(bn)) {
      return (an - bn) * direction;
    }
    return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) * direction;
  });
}

export function validateProductOptions(optionGroups = []) {
  const ids = new Set();
  for (const group of optionGroups || []) {
    if (!String(group?.name || '').trim()) return 'Option group name is required.';
    if (!group.id || ids.has(group.id)) return 'Option group IDs must be unique.';
    ids.add(group.id);
    if (!Array.isArray(group.options) || group.options.length === 0) return `Add at least one option to ${group.name}.`;
    const optionIds = new Set();
    for (const option of group.options) {
      if (!String(option?.name || '').trim()) return `Option name is required in ${group.name}.`;
      if (!option.id || optionIds.has(option.id)) return `Option IDs must be unique in ${group.name}.`;
      optionIds.add(option.id);
      if (!Number.isFinite(Number(option.priceAdjustment)) || Number(option.priceAdjustment) < 0) return `Price adjustment must be 0 or greater for ${option.name}.`;
      if (group.recipeImpact) {
        for (const change of option.recipeChanges || []) {
          if (!change.inventorySkuId || !Number.isFinite(Number(change.qtyRecipeUom)) || Number(change.qtyRecipeUom) <= 0) return `Recipe quantity must be greater than 0 for ${option.name}.`;
          if (change.mode === 'replace' && !change.replacesInventorySkuId) return `Replacement ingredient is required for ${option.name}.`;
        }
      }
    }
  }
  return '';
}
