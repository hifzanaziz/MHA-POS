export function sortProducts(products, key, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...products].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * factor;
  });
}

export function recordPurchase(product, purchase) {
  const quantity = Number(purchase.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Purchase quantity must be greater than 0');
  const inventoryQuantity = purchase.uom === 'order' ? quantity * Number(product.orderToInventory || 1) : quantity;
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quantity,
    uom: purchase.uom || 'inventory',
    inventoryQuantity,
    reference: purchase.reference?.trim() || '-',
    supplier: purchase.supplier?.trim() || '-',
    date: purchase.date || new Date().toISOString().slice(0, 10),
  };
  return {
    ...product,
    stock: Number(product.stock || 0) + inventoryQuantity,
    purchaseHistory: [...(product.purchaseHistory || []), record],
  };
}

export function validateSku(product, existingProducts) {
  const required = [
    ['sku', 'SKU Code'], ['name', 'SKU Name'], ['category', 'Category'],
    ['price', 'Selling Price'], ['minimum', 'Minimum Stock'],
    ['orderUom', 'Order UOM'], ['inventoryUom', 'Inventory UOM'], ['recipeUom', 'Recipe UOM'],
    ['orderToInventory', 'Order to Inventory Conversion'], ['inventoryToRecipe', 'Inventory to Recipe Conversion'],
  ];
  const errors = required.filter(([k]) => product[k] === '' || product[k] === null || product[k] === undefined)
    .map(([, label]) => `${label} is required.`);
  const duplicate = existingProducts.some(p => p.id !== product.id && String(p.sku).toLowerCase() === String(product.sku).trim().toLowerCase());
  if (duplicate) errors.push('SKU Code already exists.');
  if (product.price !== '' && Number(product.price) < 0) errors.push('Selling Price cannot be negative.');
  if (product.minimum !== '' && Number(product.minimum) < 0) errors.push('Minimum Stock cannot be negative.');
  if (product.orderToInventory !== '' && Number(product.orderToInventory) <= 0) errors.push('Order to Inventory Conversion must be greater than 0.');
  if (product.inventoryToRecipe !== '' && Number(product.inventoryToRecipe) <= 0) errors.push('Inventory to Recipe Conversion must be greater than 0.');
  return errors;
}
