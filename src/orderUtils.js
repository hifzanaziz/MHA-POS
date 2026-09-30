function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function applySale(products, items) {
  const required = new Map(items.map((item) => [item.id, Number(item.qty || 0)]));
  for (const [id, qty] of required) {
    const product = products.find((p) => p.id === id);
    if (!product || Number(product.stock || 0) < qty) {
      throw new Error(`Insufficient product stock for ${product?.name || id}`);
    }
  }
  return products.map((product) => {
    const qty = required.get(product.id);
    if (!qty) return product;
    return {
      ...product,
      stock: Number(product.stock || 0) - qty,
      sold: Number(product.sold || 0) + qty,
    };
  });
}

export function createOrderRecord(products, cart, options = {}) {
  if (!Array.isArray(cart) || cart.length === 0) throw new Error("Order must contain at least one item");
  const paymentStatus = options.paymentStatus === "Pending" ? "Pending" : "Completed";
  const subtotal = roundMoney(cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0));
  const tax = roundMoney(subtotal * 0.06);
  const grandTotal = roundMoney(subtotal + tax);
  const date = options.date || new Date().toISOString();
  const items = cart.map((item) => ({
    id: item.id,
    sku: item.sku,
    name: item.name,
    price: Number(item.price || 0),
    basePrice: Number(item.basePrice ?? item.price ?? 0),
    selections: item.selections || {},
    selectedOptions: item.selectedOptions || [],
    qty: Number(item.qty || 0),
    lineTotal: roundMoney(Number(item.price || 0) * Number(item.qty || 0)),
  }));
  const order = {
    id: options.orderId || `ORD-${Date.now()}`,
    orderDate: date,
    items,
    subtotal,
    tax,
    grandTotal,
    paymentStatus,
    customerName: String(options.customerName || "").trim(),
    customerTelephone: String(options.customerTelephone || "").trim(),
    pickupStatus: "Pending",
    pickedUpAt: null,
    paidAt: paymentStatus === "Completed" ? date : null,
  };
  return {
    order,
    products: paymentStatus === "Completed" ? applySale(products, items) : products,
  };
}

export function completeOrderPayment(products, order, paidAt = new Date().toISOString()) {
  if (order.paymentStatus === "Completed") return { products, order };
  return {
    products: applySale(products, order.items || []),
    order: { ...order, paymentStatus: "Completed", paidAt },
  };
}


export function completeOrderPickup(order, pickedUpAt = new Date().toISOString()) {
  if (order.pickupStatus === "Complete") return order;
  return { ...order, pickupStatus: "Complete", pickedUpAt };
}

export function filterAndSortOrders(orders, options = {}) {
  const query = String(options.query || "").trim().toLowerCase();
  const fromDate = options.fromDate ? new Date(`${options.fromDate}T00:00:00`) : null;
  const toDate = options.toDate ? new Date(`${options.toDate}T23:59:59.999`) : null;
  const sortKey = options.sortKey || "orderDate";
  const sortDir = options.sortDir === "asc" ? "asc" : "desc";

  const filtered = (orders || []).filter((order) => {
    const when = new Date(order.orderDate);
    if (fromDate && when < fromDate) return false;
    if (toDate && when > toDate) return false;
    if (!query) return true;
    const haystack = [
      order.customerName, order.customerTelephone, order.id, order.paymentStatus, order.pickupStatus,
      ...(order.items || []).flatMap((item) => [item.sku, item.name]),
    ].join(" " ).toLowerCase();
    return haystack.includes(query);
  });

  const numericKeys = new Set(["subtotal", "tax", "grandTotal"]);
  return [...filtered].sort((a, b) => {
    let left = a?.[sortKey] ?? "";
    let right = b?.[sortKey] ?? "";
    let cmp;
    if (sortKey === "orderDate") cmp = new Date(left) - new Date(right);
    else if (numericKeys.has(sortKey)) cmp = Number(left) - Number(right);
    else cmp = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });
}
