function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function getNetSalesSummary(orders, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now);
  const year = current.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();
  let daily = 0;
  let monthly = 0;

  for (const order of orders || []) {
    if (order?.paymentStatus !== 'Completed') continue;
    const when = new Date(order.orderDate);
    if (Number.isNaN(when.getTime())) continue;
    const total = Number(order.grandTotal || 0);
    if (when.getFullYear() === year && when.getMonth() === month) {
      monthly += total;
      if (when.getDate() === day) daily += total;
    }
  }

  return { daily: roundMoney(daily), monthly: roundMoney(monthly) };
}

export function getTopProductSales(products, limit = 5) {
  return (products || [])
    .filter((item) => item.skuType !== 'inventory')
    .map((item) => ({ id: item.id, sku: item.sku, name: item.name, sold: Number(item.sold || 0) }))
    .sort((a, b) => b.sold - a.sold || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

export function getTopInventoryUsage(products, recipes, limit = 5) {
  const productById = new Map((products || []).filter((p) => p.skuType !== 'inventory').map((p) => [p.id, p]));
  const inventoryById = new Map((products || []).filter((p) => p.skuType === 'inventory').map((p) => [p.id, p]));
  const totals = new Map();

  for (const [productIdText, lines] of Object.entries(recipes || {})) {
    const product = productById.get(Number(productIdText));
    if (!product) continue;
    const producedQty = Number(product.produced || 0);
    for (const line of lines || []) {
      const inventory = inventoryById.get(line.inventorySkuId);
      if (!inventory) continue;
      const usage = producedQty * Number(line.qtyRecipeUom || 0);
      totals.set(inventory.id, (totals.get(inventory.id) || 0) + usage);
    }
  }

  return [...totals.entries()]
    .map(([id, usage]) => {
      const item = inventoryById.get(id);
      return { id, sku: item.sku, name: item.name, usage, uom: item.recipeUom || '' };
    })
    .sort((a, b) => b.usage - a.usage || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

export function getStockAlerts(products) {
  const alerts = { inventory: [], product: [] };
  for (const item of products || []) {
    if (Number(item.stock || 0) > Number(item.minimum || 0)) continue;
    if (item.skuType === 'inventory') alerts.inventory.push(item);
    else alerts.product.push(item);
  }
  return alerts;
}

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getSellingTrend(orders, range = '7d', now = new Date()) {
  const current = now instanceof Date ? new Date(now) : new Date(now);
  const days = range === '1m' ? 30 : 7;
  const rows = [];
  const byDate = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(current);
    date.setHours(12, 0, 0, 0);
    date.setDate(current.getDate() - offset);
    const key = localDateKey(date);
    const row = {
      date: key,
      label: date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }),
      sold: 0,
    };
    rows.push(row);
    byDate.set(key, row);
  }

  for (const order of orders || []) {
    if (order?.paymentStatus !== 'Completed') continue;
    const when = new Date(order.orderDate);
    if (Number.isNaN(when.getTime())) continue;
    const row = byDate.get(localDateKey(when));
    if (!row) continue;
    row.sold += (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  return rows;
}
