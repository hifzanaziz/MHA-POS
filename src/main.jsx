import { supabase } from './supabase'
import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Grid3X3,
  List,
  LogOut,
  Minus,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  ShoppingCart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil,
  Trash2,
  X,
  ReceiptText,
  History,
  CreditCard,
  BookOpenText,
  Store,
  UtensilsCrossed,
  WalletCards,
  Settings,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";
import { sortProducts, recordPurchase, validateSku } from "./inventoryUtils.js";
import { getOrderToRecipeFactor, applyProductionWithRecipe, calculateOptionPrice, validateOptionSelections } from "./recipeUtils.js";
import { validateProductSku, validateProductOptions, getRecipeStatus, canDeleteProductSku, filterAndSortProductSkus } from "./productUtils.js";
import { createOrderRecord, completeOrderPayment, completeOrderPickup, filterAndSortOrders } from "./orderUtils.js";
import { getNetSalesSummary, getTopProductSales, getTopInventoryUsage, getStockAlerts, getSellingTrend } from "./dashboardUtils.js";

const productsSeed = [
  { id: 1, skuType: "product", sku: "KR-SS-001", name: "Samperit Susu", category: "Kuih Raya", price: 20, stock: 24, minimum: 8, produced: 40, sold: 16, optionGroups: [
    { id: "size", name: "Size", required: true, priceImpact: true, recipeImpact: true, options: [
      { id: "regular", name: "Regular", priceAdjustment: 0, recipeChanges: [] },
      { id: "large", name: "Large", priceAdjustment: 5, recipeChanges: [{ inventorySkuId: 101, qtyRecipeUom: 50, mode: "add" }] },
    ] },
    { id: "flavour", name: "Flavour", required: false, priceImpact: true, recipeImpact: true, options: [
      { id: "original", name: "Original", priceAdjustment: 0, recipeChanges: [] },
      { id: "pandan", name: "Pandan", priceAdjustment: 2, recipeChanges: [{ inventorySkuId: 102, qtyRecipeUom: 15, mode: "add" }] },
    ] },
  ] },
  { id: 2, skuType: "product", sku: "KR-SB-002", name: "Samperit Bunga", category: "Kuih Raya", price: 20, stock: 20, minimum: 8, produced: 36, sold: 16 },
  { id: 3, skuType: "product", sku: "KR-TN-003", name: "Tart Nenas", category: "Kuih Raya", price: 20, stock: 18, minimum: 8, produced: 38, sold: 20 },
  { id: 4, skuType: "product", sku: "KR-AL-004", name: "Almond London", category: "Kuih Raya", price: 20, stock: 15, minimum: 6, produced: 30, sold: 15 },
  { id: 5, skuType: "product", sku: "KR-TB-005", name: "Tart Blueberry", category: "Kuih Raya", price: 20, stock: 22, minimum: 8, produced: 35, sold: 13 },
  { id: 6, skuType: "product", sku: "RT-SR-001", name: "Sausage Roll", category: "Roti", price: 25, stock: 16, minimum: 6, produced: 28, sold: 12 },
  { id: 7, skuType: "product", sku: "RT-PM-002", name: "Pizza Mini", category: "Roti", price: 25, stock: 14, minimum: 6, produced: 26, sold: 12 },
  { id: 8, skuType: "product", sku: "RT-PS-003", name: "Pizza Sardin", category: "Roti", price: 25, stock: 12, minimum: 6, produced: 24, sold: 12 },

  { id: 101, skuType: "inventory", sku: "INV-TG-001", name: "Tepung Gandum", category: "Bahan Kering", price: 0, stock: 25, minimum: 8, produced: 0, sold: 0, orderUom: "Carton", inventoryUom: "KG", recipeUom: "Gram", orderToInventory: 10, inventoryToRecipe: 1000, purchaseHistory: [] },
  { id: 102, skuType: "inventory", sku: "INV-GL-002", name: "Gula", category: "Bahan Kering", price: 0, stock: 18, minimum: 5, produced: 0, sold: 0, orderUom: "Carton", inventoryUom: "Pack", recipeUom: "Gram", orderToInventory: 5, inventoryToRecipe: 500, purchaseHistory: [] },
  { id: 103, skuType: "inventory", sku: "INV-TJ-003", name: "Tepung Jagung", category: "Bahan Kering", price: 0, stock: 20, minimum: 5, produced: 0, sold: 0, orderUom: "Carton", inventoryUom: "Pack", recipeUom: "Gram", orderToInventory: 10, inventoryToRecipe: 500, purchaseHistory: [] },
  { id: 104, skuType: "inventory", sku: "INV-YM-004", name: "Yis Maripan", category: "Bahan Kering", price: 0, stock: 12, minimum: 3, produced: 0, sold: 0, orderUom: "Carton", inventoryUom: "Pack", recipeUom: "Gram", orderToInventory: 20, inventoryToRecipe: 500, purchaseHistory: [] },
  { id: 105, skuType: "inventory", sku: "INV-SJ-005", name: "Sosej", category: "Bahan Sejuk Beku", price: 0, stock: 15, minimum: 5, produced: 0, sold: 0, orderUom: "Carton", inventoryUom: "Pack", recipeUom: "Piece", orderToInventory: 10, inventoryToRecipe: 10, purchaseHistory: [] },
  { id: 106, skuType: "inventory", sku: "INV-TL-006", name: "Telur", category: "Bahan Mentah", price: 0, stock: 60, minimum: 20, produced: 0, sold: 0, orderUom: "Tray", inventoryUom: "Piece", recipeUom: "Piece", orderToInventory: 30, inventoryToRecipe: 1, purchaseHistory: [] },
];

function money(value) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(value);
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    onLogin(data.user.email);
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="brand-badge">
          <Store size={24} />
          <span>MHA Web POS</span>
        </div>

        <div>
          <p className="eyebrow">RETAIL OPERATIONS</p>
          <h1>One workspace for sales, stock and production.</h1>
          <p className="lead">
            Responsive web POS for cashier, inventory and production workflows.
          </p>
        </div>

        <div className="login-stats">
          <div>
            <strong>4</strong>
            <span>Operation modes</span>
          </div>
          <div>
            <strong>24/7</strong>
            <span>Store visibility</span>
          </div>
          <div>
            <strong>Live</strong>
            <span>Inventory status</span>
          </div>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="mobile-brand">
          <Store size={22} />
          <span>MHA Web POS</span>
        </div>

        <p className="eyebrow">WELCOME BACK</p>
        <h2>Sign in to your store</h2>

        <p className="muted">
          Sign in using your MHA POS account.
        </p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button
          className="primary-btn full"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
          {!loading && <ChevronRight size={18} />}
        </button>
      </form>
    </div>
  );
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "order", label: "Order Taking", icon: ShoppingCart },
  { id: "orderHistory", label: "Order History", icon: History },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "recipe", label: "Recipe Management", icon: BookOpenText },
  { id: "production", label: "Production SKU", icon: UtensilsCrossed },
  { id: "config", label: "Config", icon: Settings },
];

function AppShell({ user, page, setPage, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><Store size={23} /></div>
          <div>
            <strong>HanaAzz</strong>
            <span>Enterprise • MHA POS</span>
          </div>
        </div>

        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={page === id ? "nav-active" : ""} onClick={() => setPage(id)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status"><span className="status-dot" /> System Online</div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">HanaAzz Enterprise • STORE 001</p>
            <h2>{navItems.find((x) => x.id === page)?.label}</h2>
          </div>
          <div className="user-chip">
            <span className="status-dot" />
            <div>
              <strong>{user}</strong>
              <span>Store Manager</span>
            </div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>

      <nav className="mobile-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className={page === id ? "nav-active" : ""} onClick={() => setPage(id)}>
            <Icon size={20} />
            <span>{label === "Production SKU" ? "Production" : label === "Recipe Management" ? "Recipe" : label === "Order History" ? "Orders" : label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, danger }) {
  return (
    <div className={`stat-card ${danger ? "danger-card" : ""}`}>
      <div className="stat-icon"><Icon size={21} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

function Dashboard({ products, orders, recipes, inventoryUsage, onNavigate }) {
  const [trendRange, setTrendRange] = useState("7d");
  const completedOrders = orders.filter((order) => order.paymentStatus === "Completed");
  const sold = completedOrders.reduce(
    (total, order) => total + (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    0
  );
  const netSales = getNetSalesSummary(orders);
  const salesByProduct = new Map();
  completedOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.productId ?? item.sku;
      const current = salesByProduct.get(key) || { id: key, name: item.name, sold: 0 };
      current.sold += Number(item.qty || 0);
      salesByProduct.set(key, current);
    });
  });
  const topProducts = [...salesByProduct.values()]
    .sort((a, b) => b.sold - a.sold || String(a.name).localeCompare(String(b.name)))
    .slice(0, 5)
    .map((item) => ({ ...item, label: item.name }));
  const topInventory = (inventoryUsage || [])
    .slice(0, 5)
    .map((item) => ({ ...item, label: `${item.name} (${item.uom})` }));
  const sellingTrend = getSellingTrend(orders, trendRange);
  const alerts = getStockAlerts(products);
  const totalAlerts = alerts.inventory.length + alerts.product.length;

  function AlertList({ items, type }) {
    if (!items.length) {
      return <div className="dashboard-empty-alert">No low or out-of-stock {type} SKU.</div>;
    }
    return (
      <div className="alert-list">
        {items.map((p) => (
          <div key={p.id} className="alert-row">
            <div className={`stock-indicator ${Number(p.stock || 0) === 0 ? "out" : "low"}`}>
              {Number(p.stock || 0) === 0 ? <PackageX size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div className="grow">
              <strong>{p.name}</strong>
              <span>{p.sku}</span>
            </div>
            <div className="stock-number">
              <strong>{Number(p.stock || 0)}</strong>
              <span>Min {Number(p.minimum || 0)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-grid dashboard-v2">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">TODAY'S STORE PULSE</p>
          <h1>Good afternoon. Your store is operational.</h1>
          <p>{totalAlerts} SKU require stock attention across Product and Inventory.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("order")}>
          Start Order <ShoppingCart size={18} />
        </button>
      </section>

      <section className="stats-grid dashboard-stats-three">
        <StatCard label="Sold SKU" value={sold} sub="Completed sales quantity" icon={PackageCheck} />
        <StatCard label="Daily Net Sales" value={money(netSales.daily)} sub="Completed payments today" icon={WalletCards} />
        <StatCard label="Monthly Net Sales" value={money(netSales.monthly)} sub="From day 1 until today" icon={CircleDollarSign} />
      </section>

      <section className="chart-card dashboard-selling-trend">
        <div className="section-head">
          <div>
            <p className="eyebrow">SELLING TREND</p>
            <h3>Product SKU Sold Trend</h3>
          </div>
          <div className="segmented">
            <button className={trendRange === "7d" ? "selected" : ""} onClick={() => setTrendRange("7d")}>1 Week</button>
            <button className={trendRange === "1m" ? "selected" : ""} onClick={() => setTrendRange("1m")}>1 Month</button>
          </div>
        </div>
        <div className="chart-wrap selling-trend-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sellingTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={trendRange === "1m" ? 22 : 8} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value}`, "Sold Qty"]} labelFormatter={(label) => `Date: ${label}`} />
              <Line type="monotone" dataKey="sold" strokeWidth={3} dot={trendRange === "7d" ? { r: 4 } : false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-card dashboard-rank-chart">
        <div className="section-head">
          <div>
            <p className="eyebrow">PRODUCT PERFORMANCE</p>
            <h3>Top 5 Product SKU Sold</h3>
          </div>
          <BarChart3 size={22} />
        </div>
        <div className="chart-wrap rank-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topProducts} layout="vertical" margin={{ top: 8, right: 20, left: 18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={120} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [`${value}`, "Sold Qty"]} />
              <Bar dataKey="sold" radius={[0, 7, 7, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="chart-card dashboard-rank-chart">
        <div className="section-head">
          <div>
            <p className="eyebrow">RECIPE CONSUMPTION</p>
            <h3>Top 5 Inventory SKU Usage</h3>
          </div>
          <Boxes size={22} />
        </div>
        <div className="chart-wrap rank-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topInventory} layout="vertical" margin={{ top: 8, right: 20, left: 18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value, _name, props) => [`${Number(value).toLocaleString()} ${props?.payload?.uom || ""}`, "Recipe Usage"]} />
              <Bar dataKey="usage" radius={[0, 7, 7, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dashboard-alerts-section">
        <div className="dashboard-alerts-heading">
          <div>
            <p className="eyebrow">STOCK ATTENTION</p>
            <h3>Low & out of stock alerts</h3>
          </div>
          <AlertTriangle size={22} />
        </div>
        <div className="dashboard-alert-grid">
          <article className="alert-card dashboard-alert-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">INVENTORY SKU</p>
                <h3>Inventory Alert</h3>
              </div>
              <span className="alert-count-badge">{alerts.inventory.length}</span>
            </div>
            <AlertList items={alerts.inventory} type="Inventory" />
            <button className="text-btn" onClick={() => onNavigate("inventory")}>View inventory <ChevronRight size={16} /></button>
          </article>

          <article className="alert-card dashboard-alert-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">PRODUCT SKU</p>
                <h3>Product SKU Alert</h3>
              </div>
              <span className="alert-count-badge">{alerts.product.length}</span>
            </div>
            <AlertList items={alerts.product} type="Product" />
            <button className="text-btn" onClick={() => onNavigate("production")}>View Production SKU <ChevronRight size={16} /></button>
          </article>
        </div>
      </section>
    </div>
  );
}

function OptionSelectionModal({ product, selections, setSelections, onCancel, onConfirm, title = "Select Options", actionLabel = "Add to Order", quantity = 1, setQuantity = null, maxQuantity = null }) {
  const groups = product?.optionGroups || [];
  const validation = validateOptionSelections(groups, selections);
  const finalPrice = calculateOptionPrice(product?.price || 0, groups, selections);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-card option-selection-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><p className="eyebrow">{title.toUpperCase()}</p><h3>{product?.name}</h3><span className="muted">Base price {money(product?.price || 0)}</span></div><button className="icon-btn" onClick={onCancel}><X size={18} /></button></div>
        <div className="option-selection-list">
          {groups.map((group) => (
            <div className="option-group-card" key={group.id}>
              <div className="option-group-head"><strong>{group.name}</strong><span>{group.required ? "Required" : "Optional"}{group.recipeImpact ? " • Recipe impact" : ""}</span></div>
              <div className="option-choice-grid">
                {!group.required && <button className={!selections[group.id] ? "option-choice selected" : "option-choice"} onClick={() => setSelections((current) => ({ ...current, [group.id]: "" }))}><strong>None</strong><span>No selection</span></button>}
                {group.options.map((option) => (
                  <button key={option.id} className={selections[group.id] === option.id ? "option-choice selected" : "option-choice"} onClick={() => setSelections((current) => ({ ...current, [group.id]: option.id }))}>
                    <strong>{option.name}</strong><span>{Number(option.priceAdjustment || 0) ? `+${money(option.priceAdjustment)}` : "No price change"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {validation && <div className="form-error">{validation}</div>}
        {setQuantity && (
          <div className="option-total">
            <span>Quantity</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button type="button" className="secondary-btn" style={{ minWidth: 44, padding: "8px 12px" }} onClick={() => setQuantity((q) => Math.max(1, Number(q || 1) - 1))}>−</button>
              <input type="number" min="1" max={maxQuantity || undefined} value={quantity} onChange={(e) => {
                const next = Math.max(1, Number(e.target.value || 1));
                setQuantity(maxQuantity ? Math.min(next, maxQuantity) : next);
              }} style={{ width: 80, textAlign: "center" }} />
              <button type="button" className="secondary-btn" style={{ minWidth: 44, padding: "8px 12px" }} disabled={!!maxQuantity && Number(quantity) >= Number(maxQuantity)} onClick={() => setQuantity((q) => maxQuantity ? Math.min(Number(maxQuantity), Number(q || 1) + 1) : Number(q || 1) + 1)}>+</button>
            </div>
          </div>
        )}
        <div className="option-total"><span>{setQuantity ? "Total Price" : "Final Unit Price"}</span><strong>{money(finalPrice * (setQuantity ? Math.max(1, Number(quantity || 1)) : 1))}</strong></div>
        <div className="modal-actions"><button className="secondary-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" disabled={!!validation} onClick={() => onConfirm(finalPrice)}>{actionLabel}</button></div>
      </div>
    </div>
  );
}

function OrderTaking({ products, setProducts, orders, setOrders, onNavigate, reloadOrders }) {
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerTelephone, setCustomerTelephone] = useState("");
  const [selectionProduct, setSelectionProduct] = useState(null);
  const [selections, setSelections] = useState({});
  const [selectionQuantity, setSelectionQuantity] = useState(1);

  const saleProducts = products.filter((p) => p.skuType !== "inventory");
  const categories = ["All", ...new Set(saleProducts.map((p) => p.category))];
  const filtered = saleProducts.filter((p) => {
    const matchCategory = category === "All" || p.category === category;
    const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase());
    return matchCategory && matchQuery;
  });

  function openProduct(product) {
    if (product.stock <= 0) return;
    if (!(product.optionGroups || []).length) return addConfigured(product, {}, Number(product.price));
    setSelectionProduct(product);
    setSelectionQuantity(1);
    const defaults = {};
    (product.optionGroups || []).forEach((group) => { if (!group.required && group.options?.length === 0) defaults[group.id] = ""; });
    setSelections(defaults);
  }

  function addConfigured(product, selected, finalPrice, quantity = 1) {
    const selectedOptions = (product.optionGroups || []).flatMap((group) => {
      const option = group.options?.find((item) => item.id === selected[group.id]);
      return option ? [{ groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, priceAdjustment: Number(option.priceAdjustment || 0) }] : [];
    });
    const signature = JSON.stringify(selected);
    setCart((current) => {
      const found = current.find((x) => x.id === product.id && JSON.stringify(x.selections || {}) === signature);
      const addQty = Math.max(1, Number(quantity || 1));
      if (found) {
        return current.map((x) => x === found ? { ...x, qty: x.qty + addQty } : x);
      }
      return [...current, { ...product, id: `${product.id}-${signature}`, productId: product.id, basePrice: Number(product.price), price: finalPrice, selections: selected, selectedOptions, qty: addQty }];
    });
    setSelectionProduct(null);
    setSelections({});
  }

  function adjust(id, delta) {
    setCart((current) => current.map((x) =>
      x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x
    ).filter((x) => x.qty > 0));
  }

  const subtotal = cart.reduce((sum, x) => sum + x.price * x.qty, 0);
  const taxableSubtotal = cart.reduce((sum, x) => {
    const product = products.find((p) => p.id === x.productId);
    return sum + (product?.taxApplicable !== false ? x.price * x.qty : 0);
  }, 0);
  const tax = taxableSubtotal * 0.06;
  const total = subtotal + tax;

  async function submitOrder(paymentStatus) {
    if (!cart.length) return;
    try {
      const rpcItems = cart.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        const selectedNames = (item.selectedOptions || []).map((option) => String(option.optionName || "").trim().toLowerCase()).filter(Boolean);
        let variant;
        if (selectedNames.length === 0 && (product?.variants || []).length === 1) {
          variant = product.variants[0];
        } else {
          variant = (product?.variants || []).find((v) => selectedNames.includes(String(v.name || "").trim().toLowerCase()));
        }
        if (!variant) throw new Error("No Product Variant matches the selected options.");
        return {
          product_variant_id: variant.id,
          quantity: item.qty,
          options: (item.selectedOptions || []).map((option) => {
            const group = (product.optionGroups || []).find((g) => g.id === option.groupId);
            const value = group?.options?.find((x) => x.id === option.optionId);
            return { variation_type_id: group?.databaseId || null, variation_value_id: value?.databaseId || null, group_name: option.groupName, value_name: option.optionName };
          }),
        };
      });
      const { data: orderId, error } = await supabase.rpc("create_sales_order", {
        p_customer_name: customerName || null,
        p_customer_telephone: customerTelephone || null,
        p_payment_status: paymentStatus,
        p_items: rpcItems,
      });
      if (error) throw error;
      const { data: stockRows, error: stockError } = await supabase.from("product_variant_stock").select("*");
      if (stockError) throw stockError;
      setProducts((current) => current.map((product) => {
        if (product.skuType === "inventory") return product;
        const variants = (product.variants || []).map((variant) => {
          const row = (stockRows || []).find((x) => x.product_variant_id === variant.id);
          return { ...variant, stock: Number(row?.current_stock || 0) };
        });
        return { ...product, variants, stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0) };
      }));
      if (reloadOrders) await reloadOrders();
      setCart([]); setCustomerName(""); setCustomerTelephone("");
      alert(paymentStatus === "Completed" ? `${orderId} payment completed successfully.` : `${orderId} saved as Pay Later.`);
    } catch (error) { alert(error.message); }
  }

  return (
    <div className="pos-layout">
      <section className="product-zone">
        <div className="toolbar"><div className="search-box"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product or SKU..." /></div><div className="category-strip">{categories.map((c) => <button key={c} className={category === c ? "selected" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
        <div className="product-grid">
          {filtered.map((p) => <button key={p.id} className="product-card" onClick={() => openProduct(p)}>
            <span className="product-category">{p.category}</span><strong>{p.name}</strong><span className="sku">{p.sku}</span>
            <div className="product-bottom"><b>{money(p.price)}</b><span>{p.optionGroups?.length ? "Options" : `${p.stock} left`}</span></div>
          </button>)}
        </div>
      </section>
      <aside className="cart-panel">
        <div className="section-head"><div><p className="eyebrow">CURRENT ORDER</p><h3>Table / Counter</h3></div><span className="cart-count">{cart.reduce((a, x) => a + x.qty, 0)}</span></div>
        <div className="customer-info-box"><div className="customer-info-title"><strong>Customer Info</strong><span>Optional</span></div><div className="customer-info-grid"><label>Name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" /></label><label>Telephone No.<input value={customerTelephone} onChange={(e) => setCustomerTelephone(e.target.value)} placeholder="e.g. 0123456789" /></label></div></div>
        <div className="cart-items">{!cart.length && <div className="empty-state"><ShoppingCart size={30} /><strong>No items yet</strong><span>Select an item to start the order.</span></div>}
          {cart.map((x) => <div className="cart-item" key={x.id}><div className="grow"><strong>{x.name}</strong>{x.selectedOptions?.length > 0 && <span>{x.selectedOptions.map((o) => `${o.groupName}: ${o.optionName}`).join(" • ")}</span>}<span>{money(x.price)} each</span></div><div className="qty"><button onClick={() => adjust(x.id, -1)}><Minus size={15} /></button><span>{x.qty}</span><button onClick={() => adjust(x.id, 1)}><Plus size={15} /></button></div><strong>{money(x.price * x.qty)}</strong></div>)}
        </div>
        <div className="bill"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Tax 6%</span><strong>{money(tax)}</strong></div><div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-btn full" disabled={!cart.length} onClick={() => submitOrder("Completed")}>Pay {money(total)}</button><button className="secondary-btn full pay-later-btn" disabled={!cart.length} onClick={() => submitOrder("Pending")}><History size={17} /> Pay Later</button><button className="text-btn full" type="button" onClick={() => onNavigate("orderHistory")}>View Order History <ChevronRight size={16} /></button></div>
      </aside>
      {selectionProduct && <OptionSelectionModal product={selectionProduct} selections={selections} setSelections={setSelections} quantity={selectionQuantity} setQuantity={setSelectionQuantity} onCancel={() => { setSelectionProduct(null); setSelectionQuantity(1); }} onConfirm={(price) => addConfigured(selectionProduct, selections, price, selectionQuantity)} />}
    </div>
  );
}


function OrderHistory({ orders, setOrders, products, setProducts, reloadOrders }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState({ key: "orderDate", dir: "desc" });

  const shown = filterAndSortOrders(orders, {
    query,
    fromDate,
    toDate,
    sortKey: sort.key,
    sortDir: sort.dir,
  });

  function toggleSort(key) {
    setSort((current) => current.key === key
      ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" });
  }

  function SortIcon({ column }) {
    if (sort.key !== column) return <ArrowUpDown size={14} />;
    return sort.dir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  }

  function showDetail(order) {
    setSelected(order);
    setModal("detail");
  }

  function openPayment(order) {
    setSelected(order);
    setModal("payment");
  }

  function openPickup(order) {
    setSelected(order);
    setModal("pickup");
  }

  async function completePayment() {
    try {
      const { error } = await supabase.rpc("complete_sales_order_payment", { p_order_no: selected.id });
      if (error) throw error;
      await reloadOrders();
      setModal(null);
      alert(`${selected.id} payment completed successfully.`);
    } catch (error) { alert(error.message); }
  }

  async function confirmPickup() {
    try {
      const { error } = await supabase.rpc("complete_sales_order_pickup", { p_order_no: selected.id });
      if (error) throw error;
      await reloadOrders();
      setModal(null);
    } catch (error) { alert(error.message); }
  }

  function formatDate(value) {
    return new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
  }

  const columns = [
    ["orderDate", "Order Date"],
    ["customerName", "Customer Name"],
    ["id", "Order ID"],
    [null, "Order Detail"],
    ["subtotal", "Subtotal"],
    ["tax", "Tax"],
    ["grandTotal", "Grand Total"],
    ["paymentStatus", "Payment Status"],
    ["pickupStatus", "Pick Up"],
  ];

  return (
    <>
      <section className="table-card order-history-card">
        <div className="order-history-toolbar">
          <div>
            <p className="eyebrow">ORDER TRANSACTIONS</p>
            <h3>Order History</h3>
          </div>
          <div className="order-history-filters">
            <div className="search-box compact order-search">
              <Search size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customer, order, item or status..." />
            </div>
            <label className="date-filter">From<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
            <label className="date-filter">To<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
            {(fromDate || toDate) && <button className="secondary-btn" onClick={() => { setFromDate(""); setToDate(""); }}>Clear Date</button>}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="order-empty-state">
            <ReceiptText size={34} />
            <strong>No orders found</strong>
            <span>Adjust your search/date filter or create an order from Order Taking.</span>
          </div>
        ) : (
          <div className="order-history-table">
            <div className="order-history-row order-history-head">
              {columns.map(([key, label]) => (
                <span key={label}>
                  {key ? (
                    <button className="order-sort-btn" onClick={() => toggleSort(key)}>{label}<SortIcon column={key} /></button>
                  ) : label}
                </span>
              ))}
            </div>
            {shown.map((order) => (
              <div className="order-history-row" key={order.id}>
                <span data-label="Order Date">{formatDate(order.orderDate)}</span>
                <span data-label="Customer Name"><strong>{order.customerName || "Walk-in"}</strong><small>{order.customerTelephone || "-"}</small></span>
                <span data-label="Order ID"><strong>{order.id}</strong></span>
                <span data-label="Order Detail">
                  <button className="text-btn order-detail-btn" onClick={() => showDetail(order)}>
                    View {order.items.length} item{order.items.length === 1 ? "" : "s"} <Eye size={15} />
                  </button>
                </span>
                <span data-label="Subtotal">{money(order.subtotal)}</span>
                <span data-label="Tax">{money(order.tax)}</span>
                <span data-label="Grand Total"><strong>{money(order.grandTotal)}</strong></span>
                <span data-label="Payment Status">
                  {order.paymentStatus === "Pending" ? (
                    <button className="payment-status pending clickable" onClick={() => openPayment(order)}>Pending <CreditCard size={14} /></button>
                  ) : (
                    <span className="payment-status completed">Completed</span>
                  )}
                </span>
                <span data-label="Pick Up">
                  {(order.pickupStatus || "Pending") === "Pending" ? (
                    <button className="pickup-status pending clickable" onClick={() => openPickup(order)}>Pending</button>
                  ) : (
                    <span className="pickup-status completed">Complete</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && selected && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div className="modal-card order-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button>
            {modal === "detail" ? (
              <>
                <p className="eyebrow">ORDER DETAIL</p>
                <h3>{selected.id}</h3>
                <p className="muted">{formatDate(selected.orderDate)}</p>
                <div className="customer-summary"><strong>{selected.customerName || "Walk-in Customer"}</strong><span>{selected.customerTelephone || "No telephone number"}</span></div>
                <div className="order-detail-list">
                  {selected.items.map((item) => (
                    <div className="order-detail-line" key={`${selected.id}-${item.id}`}>
                      <div><strong>{item.name}</strong><span>{item.sku} · {item.qty} × {money(item.price)}</span>{item.selectedOptions?.length > 0 && <small className="order-option-summary">{item.selectedOptions.map((option) => `${option.groupName}: ${option.optionName}`).join(" • ")}</small>}</div>
                      <strong>{money(item.lineTotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="modal-totals">
                  <div><span>Subtotal</span><strong>{money(selected.subtotal)}</strong></div>
                  <div><span>Tax 6%</span><strong>{money(selected.tax)}</strong></div>
                  <div className="total"><span>Grand Total</span><strong>{money(selected.grandTotal)}</strong></div>
                </div>
              </>
            ) : modal === "payment" ? (
              <>
                <p className="eyebrow">PENDING PAYMENT</p>
                <h3>Complete {selected.id}</h3>
                <p className="muted">Confirm payment for this Pay Later order.</p>
                <div className="payment-summary-box">
                  <span>Amount to Pay</span>
                  <strong>{money(selected.grandTotal)}</strong>
                </div>
                <button className="primary-btn full" onClick={completePayment}><CreditCard size={18} /> Complete Payment</button>
              </>
            ) : (
              <>
                <p className="eyebrow">PICK UP CONFIRMATION</p>
                <h3>Complete Pick Up?</h3>
                <p className="muted">Are you sure you want to change {selected.id} Pick Up status from Pending to Complete?</p>
                <div className="confirmation-actions">
                  <button className="secondary-btn" onClick={() => setModal(null)}>Cancel</button>
                  <button className="primary-btn" onClick={confirmPickup}>Confirm Complete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Inventory({ products, setProducts, configOptions = [] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "sku", direction: "asc" });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [errors, setErrors] = useState([]);
  const [form, setForm] = useState({});
  const [purchase, setPurchase] = useState({ quantity: "", uom: "order", supplier: "", reference: "", date: new Date().toISOString().slice(0, 10) });

const [loadingInventory, setLoadingInventory] = useState(true);

useEffect(() => {
  async function loadInventory() {
    setLoadingInventory(true);

    const { data, error } = await supabase
      .from("inventory_sku")
      .select("*")
      .eq("is_active", true)
      .order("sku_code", { ascending: true });

    if (error) {
      console.error("Failed to load inventory:", error);
      setLoadingInventory(false);
      return;
    }

    const supabaseInventory = data.map((item) => ({
      id: item.id,
      skuType: "inventory",
      sku: item.sku_code,
      name: item.sku_name,
      category: item.category || "",
      price: Number(item.price || 0),

      // DB stores stock in Recipe UOM.
      // Existing UI displays stock in Inventory UOM.
      stock:
        Number(item.inventory_to_recipe || 1) > 0
          ? Number(item.current_stock || 0) /
            Number(item.inventory_to_recipe || 1)
          : 0,

     minimum:
  Number(item.inventory_to_recipe || 1) > 0
    ? Number(
        item.minimum_stock ??
        item.low_stock_level ??
        0
      ) / Number(item.inventory_to_recipe || 1)
    : 0,

      orderUom: item.order_uom || "",
      inventoryUom: item.inventory_uom || "",
      recipeUom: item.recipe_uom || "",

      orderToInventory: Number(item.order_to_inventory || 1),
      inventoryToRecipe: Number(item.inventory_to_recipe || 1),

      produced: 0,
      sold: 0,
      purchaseHistory: [],
    }));

    setProducts((current) => [
      ...current.filter((p) => p.skuType !== "inventory"),
      ...supabaseInventory,
    ]);

    setLoadingInventory(false);
  }

  loadInventory();
}, [setProducts]);

  const inventoryProducts = products.filter((p) => p.skuType === "inventory");
  const shown = sortProducts(
    inventoryProducts.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase())),
    sort.key,
    sort.direction
  );

  function toggleSort(key) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  }

  function SortIcon({ column }) {
    if (sort.key !== column) return <ArrowUpDown size={13} />;
    return sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  }

  function openAdd() {
    setErrors([]);
    setForm({ skuType: "inventory", sku: "", name: "", category: "", price: 0, stock: 0, minimum: "", orderUom: "", inventoryUom: "", recipeUom: "", orderToInventory: "", inventoryToRecipe: "", produced: 0, sold: 0, purchaseHistory: [] });
    setModal("form");
  }

  function openEdit(product) {
    setErrors([]);
    setForm({ ...product });
    setModal("form");
  }
async function saveSku(e) {
  e.preventDefault();

  const validation = validateSku(form, products);

  if (validation.length) {
    setErrors(validation);
    return;
  }

  setErrors([]);

  const payload = {
    sku_code: form.sku.trim(),
    sku_name: form.name.trim(),
    category: form.category.trim(),
    price: Number(form.price || 0),

    // Store minimum stock in Recipe UOM
    minimum_stock:
      Number(form.minimum || 0) *
      Number(form.inventoryToRecipe || 1),

    order_uom: form.orderUom.trim(),
    inventory_uom: form.inventoryUom.trim(),
    recipe_uom: form.recipeUom.trim(),

    order_to_inventory: Number(form.orderToInventory),
    inventory_to_recipe: Number(form.inventoryToRecipe),

    is_active: true,
  };

  try {
    if (form.id) {
      // EDIT EXISTING SKU
      const { error } = await supabase
        .from("inventory_sku")
        .update(payload)
        .eq("id", form.id);

      if (error) throw error;

      setProducts((current) =>
        current.map((p) =>
          p.id === form.id
            ? {
                ...p,
                sku: form.sku.trim(),
                name: form.name.trim(),
                category: form.category.trim(),
                price: Number(form.price || 0),
                minimum: Number(form.minimum || 0),
                orderUom: form.orderUom.trim(),
                inventoryUom: form.inventoryUom.trim(),
                recipeUom: form.recipeUom.trim(),
                orderToInventory: Number(form.orderToInventory),
                inventoryToRecipe: Number(form.inventoryToRecipe),
              }
            : p
        )
      );
    } else {
      // ADD NEW SKU
      const currentStockRecipeUom =
        Number(form.stock || 0) *
        Number(form.inventoryToRecipe || 1);

      const { data, error } = await supabase
        .from("inventory_sku")
        .insert({
          ...payload,
          current_stock: currentStockRecipeUom,
          low_stock_level:
            Number(form.minimum || 0) *
            Number(form.inventoryToRecipe || 1),
        })
        .select()
        .single();

      if (error) throw error;

      const newProduct = {
        id: data.id,
        skuType: "inventory",
        sku: data.sku_code,
        name: data.sku_name,
        category: data.category || "",
        price: Number(data.price || 0),

        stock:
          Number(data.current_stock || 0) /
          Number(data.inventory_to_recipe || 1),

        minimum:
          Number(data.minimum_stock || 0) /
          Number(data.inventory_to_recipe || 1),

        orderUom: data.order_uom || "",
        inventoryUom: data.inventory_uom || "",
        recipeUom: data.recipe_uom || "",

        orderToInventory: Number(data.order_to_inventory || 1),
        inventoryToRecipe: Number(data.inventory_to_recipe || 1),

        produced: 0,
        sold: 0,
        purchaseHistory: [],
      };

      setProducts((current) => [...current, newProduct]);
    }

    setModal(null);
  } catch (error) {
    console.error("Inventory save error:", error);
    setErrors([error.message || "Failed to save Inventory SKU."]);
  }
}

async function viewSku(product) {
  try {
    const { data, error } = await supabase
      .from("inventory_purchase")
      .select("*")
      .eq("inventory_sku_id", product.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const purchaseHistory = (data || []).map((record) => ({
      id: record.id,
      reference: record.reference_no || "-",
      supplier:
        record.remarks?.replace("Supplier: ", "") || "-",

      // Database stores the original quantity in Order UOM
      quantity: Number(record.quantity_order_uom || 0),
      uom: "order",

      // Convert Recipe UOM quantity back to Inventory UOM
      inventoryQuantity:
        Number(record.quantity_recipe_uom || 0) /
        Number(product.inventoryToRecipe || 1),

      date: new Date(record.created_at)
        .toISOString()
        .slice(0, 10),

      unitPrice: Number(record.unit_price || 0),
      totalCost: Number(record.total_cost || 0),
    }));

    setSelected({
      ...product,
      purchaseHistory,
    });

    setModal("detail");

  } catch (error) {
    console.error("Load purchase history error:", error);

    alert(
      error.message ||
      "Failed to load purchase history."
    );
  }
}

  function openPurchase(product) {
    setSelected(product);
    setPurchase({ quantity: "", uom: "order", supplier: "", reference: "", date: new Date().toISOString().slice(0, 10) });
    setErrors([]);
    setModal("purchase");
  }

 async function submitPurchase(e) {
  e.preventDefault();

  try {
    const quantity = Number(purchase.quantity);

    if (!quantity || quantity <= 0) {
      throw new Error("Purchase quantity must be greater than zero.");
    }

    // Database function expects quantity in Order UOM.
    // If user enters Inventory UOM, convert it back to Order UOM.
    const quantityOrderUom =
      purchase.uom === "order"
        ? quantity
        : quantity / Number(selected.orderToInventory || 1);

    const { error } = await supabase.rpc(
      "add_inventory_stock",
      {
        p_inventory_sku_id: selected.id,
        p_quantity_order_uom: quantityOrderUom,
        p_unit_price: 0,
        p_reference_no: purchase.reference || null,
        p_remarks: purchase.supplier
          ? `Supplier: ${purchase.supplier}`
          : null,
      }
    );

    if (error) throw error;

    // Reload the latest stock from Supabase
    const { data, error: loadError } = await supabase
      .from("inventory_sku")
      .select("*")
      .eq("id", selected.id)
      .single();

    if (loadError) throw loadError;

    const updatedStock =
      Number(data.current_stock || 0) /
      Number(data.inventory_to_recipe || 1);

    setProducts((current) =>
      current.map((p) =>
        p.id === selected.id
          ? {
              ...p,
              stock: updatedStock,
            }
          : p
      )
    );

    setModal(null);
    setErrors([]);

  } catch (error) {
    console.error("Add stock error:", error);
    setErrors([
      error.message || "Failed to add inventory stock."
    ]);
  }
}

async function deleteSku(product) {
  const confirmed = window.confirm(
    `Deactivate ${product.sku} - ${product.name}?`
  );

  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from("inventory_sku")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) throw error;

    setProducts((current) =>
      current.filter((p) => p.id !== product.id)
    );

  } catch (error) {
    console.error("Deactivate inventory error:", error);

    alert(
      error.message ||
      "Failed to deactivate Inventory SKU."
    );
  }
}

  const header = (label, key) => (
    <button className="sort-header" onClick={() => toggleSort(key)}>{label}<SortIcon column={key} /></button>
  );

  return (
    <>
      <section className="table-card">
        <div className="section-head table-head">
          <div>
            <p className="eyebrow">STOCK CONTROL</p>
            <h3>Inventory status</h3>
          </div>
          <div className="inventory-actions-top">
            <div className="search-box compact">
              <Search size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory..." />
            </div>
            <button className="primary-btn" onClick={openAdd}><Plus size={17} /> Add SKU</button>
          </div>
        </div>

        <div className="inventory-table">
          <div className="table-row table-title">
            <span>{header("SKU / Product", "sku")}</span><span>{header("Category", "category")}</span><span>{header("Stock", "stock")}</span><span>{header("Minimum", "minimum")}</span><span>{header("Status", "stock")}</span><span>Action</span>
          </div>
          {shown.map((p) => {
            const status = p.stock === 0 ? "Out of stock" : p.stock <= p.minimum ? "Low stock" : "Healthy";
            return (
              <div className="table-row" key={p.id}>
                <span data-label="SKU / Product"><strong>{p.name}</strong><small>{p.sku}</small></span>
                <span data-label="Category">{p.category}</span>
                <span data-label="Stock"><strong>{Number(p.orderToInventory || 1) > 0 ? (Number(p.stock || 0) / Number(p.orderToInventory || 1)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : 0}</strong> <small>{p.orderUom}</small></span>
                <span data-label="Minimum">{p.minimum}</span>
                <span data-label="Status"><em className={`status ${status === "Healthy" ? "healthy" : status === "Low stock" ? "low" : "out"}`}>{status}</em></span>
                <span data-label="Action" className="row-actions">
                  <button title="View SKU" onClick={() => viewSku(p)}><Eye size={16} /></button>
                  <button title="Edit SKU" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                  <button title="Record Purchase" onClick={() => openPurchase(p)}><ReceiptText size={16} /></button>
                  <button className="danger-icon" title="Delete SKU" onClick={() => deleteSku(p)}><Trash2 size={16} /></button>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">INVENTORY</p>
                <h3>{modal === "detail" ? "SKU Detail" : modal === "purchase" ? "Record Purchase / Add Stock" : form.id ? "Edit SKU" : "Add SKU"}</h3>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={19} /></button>
            </div>

            {errors.length > 0 && <div className="form-error">{errors.map((e) => <div key={e}>{e}</div>)}</div>}

            {modal === "form" && (
              <form onSubmit={saveSku} className="sku-form">
                <label>SKU Code<input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
                <label>SKU Name<input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                <label>Category<select value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select category</option>{configOptions.filter((x) => x.option_type === "INVENTORY_CATEGORY").map((x) => <option key={x.id} value={x.option_value}>{x.option_value}</option>)}</select></label>
                <label>Selling Price (RM)<input type="number" step="0.01" min="0" value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
                <label>Minimum Stock<input type="number" min="0" value={form.minimum ?? ""} onChange={(e) => setForm({ ...form, minimum: e.target.value })} /></label>
                <label>Current Stock<input type="number" min="0" value={form.stock ?? 0} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
                <label>Order UOM<select value={form.orderUom ?? ""} onChange={(e) => setForm({ ...form, orderUom: e.target.value })}><option value="">Select UOM</option>{configOptions.filter((x) => x.option_type === "UOM").map((x) => <option key={x.id} value={x.option_value}>{x.option_value}</option>)}</select></label>
                <label>Inventory UOM<select value={form.inventoryUom ?? ""} onChange={(e) => setForm({ ...form, inventoryUom: e.target.value })}><option value="">Select UOM</option>{configOptions.filter((x) => x.option_type === "UOM").map((x) => <option key={x.id} value={x.option_value}>{x.option_value}</option>)}</select></label>
                <label>Recipe UOM<select value={form.recipeUom ?? ""} onChange={(e) => setForm({ ...form, recipeUom: e.target.value })}><option value="">Select UOM</option>{configOptions.filter((x) => x.option_type === "UOM").map((x) => <option key={x.id} value={x.option_value}>{x.option_value}</option>)}</select></label>
                <label>Order → Inventory Qty<input type="number" min="0.0001" step="0.0001" placeholder="e.g. 5 packs per carton" value={form.orderToInventory ?? ""} onChange={(e) => setForm({ ...form, orderToInventory: e.target.value })} /></label>
                <label>Inventory → Recipe Qty<input type="number" min="0.0001" step="0.0001" placeholder="e.g. 500 g per pack" value={form.inventoryToRecipe ?? ""} onChange={(e) => setForm({ ...form, inventoryToRecipe: e.target.value })} /></label>
                <div className="conversion-preview"><span>Order → Recipe</span><strong>{Number(form.orderToInventory || 0) * Number(form.inventoryToRecipe || 0)} {form.recipeUom || "Recipe UOM"}</strong><small>1 {form.orderUom || "Order UOM"} = {form.orderToInventory || 0} {form.inventoryUom || "Inventory UOM"} × {form.inventoryToRecipe || 0} {form.recipeUom || "Recipe UOM"}</small></div>
                <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancel</button><button className="primary-btn" type="submit">Save SKU</button></div>
              </form>
            )}

            {modal === "detail" && selected && (
              <div className="sku-detail">
                <div className="detail-hero"><div><span>{selected.sku}</span><h2>{selected.name}</h2><p>{selected.category}</p></div><strong>{selected.stock} {selected.inventoryUom}</strong></div>
                <div className="detail-grid">
                  <div><span>Order UOM</span><strong>{selected.orderUom || "-"}</strong></div>
                  <div><span>Inventory UOM</span><strong>{selected.inventoryUom || "-"}</strong></div>
                  <div><span>Recipe UOM</span><strong>{selected.recipeUom || "-"}</strong></div>
                  <div><span>Order → Inventory</span><strong>1 {selected.orderUom} = {selected.orderToInventory} {selected.inventoryUom}</strong></div>
                  <div><span>Inventory → Recipe</span><strong>1 {selected.inventoryUom} = {selected.inventoryToRecipe} {selected.recipeUom}</strong></div>
                  <div><span>Order → Recipe</span><strong>1 {selected.orderUom} = {getOrderToRecipeFactor(selected)} {selected.recipeUom}</strong></div>
                  <div><span>Selling Price</span><strong>{money(selected.price)}</strong></div>
                  <div><span>Minimum Stock</span><strong>{selected.minimum}</strong></div>
                  <div><span>Total Sold</span><strong>{selected.sold}</strong></div>
                </div>
                <div className="purchase-history">
                  <h4>Purchase History</h4>
                  {(selected.purchaseHistory || []).length === 0 ? <p className="muted">No purchase records yet.</p> : [...selected.purchaseHistory].reverse().map((r) => <div className="history-row" key={r.id}><div><strong>{r.reference}</strong><span>{r.supplier}</span></div><div><strong>+{r.inventoryQuantity ?? r.quantity} {selected.inventoryUom}</strong><span>{r.quantity} {r.uom === "order" ? selected.orderUom : selected.inventoryUom} • {r.date}</span></div></div>)}
                </div>
              </div>
            )}

            {modal === "purchase" && selected && (
              <form onSubmit={submitPurchase} className="purchase-form">
                <div className="purchase-sku"><span>{selected.sku}</span><strong>{selected.name}</strong><small>Current stock: {selected.stock} {selected.inventoryUom}</small></div>
                <label>Purchase Quantity<input autoFocus type="number" min="0.01" step="0.01" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })} /></label>
                <label>Purchase UOM<select value={purchase.uom} onChange={(e) => setPurchase({ ...purchase, uom: e.target.value })}><option value="order">{selected.orderUom}</option><option value="inventory">{selected.inventoryUom}</option></select></label>
                <div className="purchase-conversion"><strong>{purchase.uom === "order" ? Number(purchase.quantity || 0) * Number(selected.orderToInventory || 1) : Number(purchase.quantity || 0)} {selected.inventoryUom}</strong><span>will be added to inventory</span></div>
                <label>Supplier<input value={purchase.supplier} onChange={(e) => setPurchase({ ...purchase, supplier: e.target.value })} placeholder="Supplier name" /></label>
                <label>Purchase / PO Reference<input value={purchase.reference} onChange={(e) => setPurchase({ ...purchase, reference: e.target.value })} placeholder="e.g. PO-2026-001" /></label>
                <label>Purchase Date<input type="date" value={purchase.date} onChange={(e) => setPurchase({ ...purchase, date: e.target.value })} /></label>
                <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancel</button><button className="primary-btn" type="submit">Record Purchase</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}


function RecipeManagement({ products, recipes, setRecipes }) {
  const productSkus = products.filter((p) => p.skuType !== "inventory");
  const inventorySkus = products.filter((p) => p.skuType === "inventory");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [mode, setMode] = useState("base");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [draft, setDraft] = useState([]);
  const [variantDraft, setVariantDraft] = useState([]);
  const [variantRecipes, setVariantRecipes] = useState({});
  const [message, setMessage] = useState("");
  const selectedProduct = productSkus.find((p) => p.id === Number(selectedProductId));
  const selectedVariant = (selectedProduct?.variants || []).find((v) => v.id === Number(selectedVariantId));

  async function loadRecipes(productId, preferredVariantId = "") {
    if (!productId) return;
    setMessage("");
    const product = productSkus.find((p) => p.id === Number(productId));
    const variantIds = (product?.variants || []).map((v) => v.id);
    const { data: recipeData, error: recipeError } = await supabase.rpc("get_recipe_management", {
      p_production_sku_id: Number(productId),
    });
    if (recipeError) {
      console.error("Load recipe error:", recipeError);
      setMessage(recipeError.message || "Failed to load recipe.");
      return;
    }
    const baseData = recipeData?.base || [];
    const variantData = recipeData?.variants || [];
    const baseLines = baseData.map((line) => ({ inventorySkuId: line.inventory_sku_id, qtyRecipeUom: Number(line.quantity) }));
    setDraft(baseLines);
    setRecipes((current) => ({ ...current, [Number(productId)]: baseLines }));
    const byVariant = {};
    (variantData || []).forEach((line) => {
      (byVariant[line.product_variant_id] ||= []).push({ inventorySkuId: line.inventory_sku_id, qtyRecipeUom: Number(line.quantity) });
    });
    setVariantRecipes(byVariant);
    const nextVariantId = Number(preferredVariantId) || variantIds[0] || "";
    setSelectedVariantId(nextVariantId);
    setVariantDraft((byVariant[nextVariantId] || []).map((x) => ({ ...x })));
  }

  useEffect(() => {
    if (!productSkus.length) return;
    const validId = productSkus.some((p) => p.id === Number(selectedProductId)) ? Number(selectedProductId) : productSkus[0].id;
    if (Number(selectedProductId) !== validId) setSelectedProductId(validId);
    loadRecipes(validId);
  }, [products]);

  function chooseProduct(value) {
    const id = Number(value);
    setSelectedProductId(id);
    setMode("base");
    loadRecipes(id);
  }
  function chooseVariant(value) {
    const id = Number(value);
    setSelectedVariantId(id);
    setVariantDraft((variantRecipes[id] || []).map((x) => ({ ...x })));
    setMessage("");
  }
  function addLine(setter, lines) {
    const firstUnused = inventorySkus.find((inv) => !lines.some((line) => Number(line.inventorySkuId) === inv.id));
    if (firstUnused) setter((current) => [...current, { inventorySkuId: firstUnused.id, qtyRecipeUom: 1 }]);
  }
  function updateLine(setter, index, changes) { setter((current) => current.map((line, i) => i === index ? { ...line, ...changes } : line)); }
  function removeLine(setter, index) { setter((current) => current.filter((_, i) => i !== index)); }
  function validateLines(lines, allowEmpty = false) {
    if (!allowEmpty && !lines.length) return "Add at least one inventory SKU to the recipe.";
    if (lines.some((line) => !line.inventorySkuId || !Number.isFinite(Number(line.qtyRecipeUom)) || Number(line.qtyRecipeUom) <= 0)) return "Every ingredient needs a quantity greater than 0.";
    if (new Set(lines.map((line) => Number(line.inventorySkuId))).size !== lines.length) return "The same inventory SKU cannot be added twice.";
    return "";
  }
  async function saveBaseRecipe() {
    if (!selectedProduct) return;
    const validation = validateLines(draft);
    if (validation) return setMessage(validation);
    const { error } = await supabase.rpc("save_base_recipe", {
      p_production_sku_id: selectedProduct.id,
      p_lines: draft.map((line) => ({ inventory_sku_id: Number(line.inventorySkuId), quantity: Number(line.qtyRecipeUom) })),
    });
    if (error) return setMessage(error.message || "Failed to save base recipe.");
    const clean = draft.map((line) => ({ ...line, qtyRecipeUom: Number(line.qtyRecipeUom) }));
    setRecipes((current) => ({ ...current, [selectedProduct.id]: clean }));
    setDraft(clean);
    setMessage("Base recipe saved successfully.");
  }
  async function saveVariantRecipe() {
    if (!selectedVariant) return;
    const validation = validateLines(variantDraft, true);
    if (validation) return setMessage(validation);
    const { error } = await supabase.rpc("save_variant_recipe", {
      p_product_variant_id: selectedVariant.id,
      p_lines: variantDraft.map((line) => ({ inventory_sku_id: Number(line.inventorySkuId), quantity: Number(line.qtyRecipeUom) })),
    });
    if (error) return setMessage(error.message || "Failed to save variant recipe.");
    const clean = variantDraft.map((line) => ({ ...line, qtyRecipeUom: Number(line.qtyRecipeUom) }));
    setVariantRecipes((current) => ({ ...current, [selectedVariant.id]: clean }));
    setVariantDraft(clean);
    setMessage(clean.length ? "Variant recipe saved successfully." : "Variant recipe cleared. This variant now uses the Base Recipe.");
  }

  function RecipeLines({ lines, setter }) {
    return <div className="recipe-lines">
      {!lines.length && <div className="empty-recipe"><BookOpenText size={30} /><strong>No recipe configured</strong><span>Add an Inventory SKU to start.</span></div>}
      {lines.map((line, index) => {
        const inventory = inventorySkus.find((p) => p.id === Number(line.inventorySkuId));
        return <div className="recipe-line" key={`${line.inventorySkuId}-${index}`}>
          <label>Inventory SKU<select value={line.inventorySkuId} onChange={(e) => updateLine(setter, index, { inventorySkuId: Number(e.target.value) })}>{inventorySkus.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>
          <label>Recipe Quantity<input type="number" min="0.0001" step="0.0001" value={line.qtyRecipeUom} onChange={(e) => updateLine(setter, index, { qtyRecipeUom: e.target.value })} /></label>
          <div className="recipe-uom-display"><span>Recipe UOM</span><strong>{inventory?.recipeUom || "-"}</strong><small>1 {inventory?.inventoryUom || "Inventory UOM"} = {inventory?.inventoryToRecipe || 0} {inventory?.recipeUom || "Recipe UOM"}</small></div>
          <button className="danger-icon recipe-remove" onClick={() => removeLine(setter, index)}><Trash2 size={17} /></button>
        </div>;
      })}
    </div>;
  }

  if (!productSkus.length) return <div className="empty-recipe">No Product SKU available.</div>;
  return (
    <div className="recipe-page">
      <section className="recipe-header-card"><div><p className="eyebrow">RECIPE MANAGEMENT</p><h3>Product recipe setup</h3><p className="muted">Base Recipe is the fallback. An exact Variant Recipe completely replaces the Base Recipe for that variant.</p></div><label className="product-select">Product SKU<select value={selectedProductId} onChange={(e) => chooseProduct(e.target.value)}>{productSkus.map((p) => <option value={p.id} key={p.id}>{p.sku} — {p.name}</option>)}</select></label></section>
      <section className="recipe-card">
        <div className="recipe-tabs"><button className={mode === "base" ? "selected" : ""} onClick={() => setMode("base")}>Base Recipe</button><button className={mode === "variation" ? "selected" : ""} disabled={!(selectedProduct?.variants || []).length} onClick={() => { setMode("variation"); const id = selectedVariantId || selectedProduct?.variants?.[0]?.id || ""; chooseVariant(id); }}>Variant Recipes</button></div>
        {mode === "base" ? <>
          <div className="section-head"><div><p className="eyebrow">{selectedProduct?.sku}</p><h3>{selectedProduct?.name}</h3></div><button className="secondary-btn" onClick={() => addLine(setDraft, draft)}><Plus size={17} /> Add Ingredient</button></div>
          <RecipeLines lines={draft} setter={setDraft} />
          <div className="recipe-footer"><span>{draft.length} base ingredient{draft.length === 1 ? "" : "s"}</span><button className="primary-btn" onClick={saveBaseRecipe}>Save Base Recipe</button></div>
        </> : <>
          <div className="variation-recipe-picker"><label>Exact Product Variant<select value={selectedVariantId} onChange={(e) => chooseVariant(e.target.value)}>{(selectedProduct?.variants || []).map((variant) => <option key={variant.id} value={variant.id}>{variant.code} — {variant.name || "Variant"}</option>)}</select></label></div>
          <div className="variation-recipe-banner"><strong>{selectedVariant?.name || "Select a variant"}</strong><span>{variantDraft.length ? "Variant Recipe active — this complete recipe overrides the Base Recipe." : "Uses Base Recipe — no Variant Recipe is configured."}</span></div>
          <div className="section-head"><div><p className="eyebrow">VARIANT RECIPE</p><h3>{selectedVariant?.code || "Exact Variant"}</h3></div><button className="secondary-btn" onClick={() => addLine(setVariantDraft, variantDraft)} disabled={!selectedVariant}><Plus size={17} /> Add Ingredient</button></div>
          <RecipeLines lines={variantDraft} setter={setVariantDraft} />
          <div className="recipe-footer"><span>{variantDraft.length ? `${variantDraft.length} variant ingredient${variantDraft.length === 1 ? "" : "s"}` : "Fallback to Base Recipe"}</span><button className="primary-btn" disabled={!selectedVariant} onClick={saveVariantRecipe}>{variantDraft.length ? "Save Variant Recipe" : "Use Base Recipe"}</button></div>
        </>}
        {message && <div className={message.includes("successfully") || message.includes("cleared") ? "success-message" : "form-error"}>{message}</div>}
      </section>
    </div>
  );
}

function Production({ products, setProducts, recipes, configOptions = [] }) {
  const [amounts, setAmounts] = useState({});
  const [feedback, setFeedback] = useState({});
  const [viewMode, setViewMode] = useState("tiles");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "name", direction: "asc" });
  const [modal, setModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formError, setFormError] = useState("");
  const [productForm, setProductForm] = useState({ sku: "", name: "", category: "", price: "", minimum: 0, taxApplicable: true, optionGroups: [] });
  const [productionSelectionProduct, setProductionSelectionProduct] = useState(null);
  const [productionSelections, setProductionSelections] = useState({});

  const [loadingProduction, setLoadingProduction] = useState(true);

useEffect(() => {
async function loadProductionSkus() {
  setLoadingProduction(true);

  try {
    // 1. Load Production SKUs
    const { data: productData, error: productError } =
      await supabase
        .from("production_sku")
        .select("*")
        .eq("is_active", true)
        .order("sku_code", { ascending: true });

    if (productError) throw productError;

    // 2. Load variation groups
    const { data: typeData, error: typeError } =
      await supabase
        .from("variation_type")
        .select("*")
        .order("id", { ascending: true });

    if (typeError) throw typeError;

    // 3. Load variation options
    const { data: valueData, error: valueError } =
      await supabase
        .from("variation_value")
        .select("*")
        .order("id", { ascending: true });

    if (valueError) throw valueError;

    // 4. Load actual product variants
const { data: variantData, error: variantError } =
  await supabase
    .from("product_variant")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

if (variantError) throw variantError;

// 5. Load which variation values belong to each variant
const { data: variantValueData, error: variantValueError } =
  await supabase
    .from("product_variant_value")
    .select("*");

if (variantValueError) throw variantValueError;

// 6. Load production history
const { data: productionEntryData, error: productionEntryError } =
  await supabase
    .from("production_entry")
    .select("production_sku_id, product_variant_id, production_quantity");

if (productionEntryError) throw productionEntryError;

// 7. Load current finished-goods stock for each exact variant
const { data: variantStockData, error: variantStockError } =
  await supabase
    .from("product_variant_stock")
    .select("product_variant_id, current_stock, minimum_stock");

if (variantStockError) throw variantStockError;

    // Convert Supabase structure to the structure
    // already expected by the MHA POS frontend.
    const supabaseProducts = (productData || []).map((item) => {
      const productTypes = (typeData || []).filter(
        (type) => type.production_sku_id === item.id && type.type_name === "Size"
      );

      const optionGroups = productTypes.map((type) => ({
        id: `type-${type.id}`,
        databaseId: type.id,

        name: type.type_name,

        required: false,
        priceImpact: true,
        recipeImpact: true,

        options: (valueData || [])
          .filter(
            (value) =>
              value.variation_type_id === type.id
          )
          .map((value) => ({
            id: `value-${value.id}`,
            databaseId: value.id,

            name: value.value_name,

            priceAdjustment: 0,
            recipeChanges: [],
          })),
      }));

      const variants = (variantData || [])
  .filter(
    (variant) =>
      variant.production_sku_id === item.id
  )
  .map((variant) => {
    const linkedValueIds = (variantValueData || [])
      .filter(
        (link) =>
          link.product_variant_id === variant.id
      )
      .map((link) => link.variation_value_id);

    const selections = {};

    productTypes.forEach((type) => {
      const selectedValue = (valueData || []).find(
        (value) =>
          value.variation_type_id === type.id &&
          linkedValueIds.includes(value.id)
      );

      if (selectedValue) {
        selections[`type-${type.id}`] =
          `value-${selectedValue.id}`;
      }
    });

    const stockRow = (variantStockData || []).find(
      (row) => row.product_variant_id === variant.id
    );

    const variantProduced = (productionEntryData || [])
      .filter((entry) => entry.product_variant_id === variant.id)
      .reduce((total, entry) => total + Number(entry.production_quantity || 0), 0);

    return {
      id: variant.id,
      code: variant.variant_code,
      name: variant.variant_name || "",
      price: Number(variant.selling_price || 0),
      produced: variantProduced,
      stock: Number(stockRow?.current_stock || 0),
      minimumStock: Number(stockRow?.minimum_stock || 0),
      selections,
    };
  });

      const totalProduced = (productionEntryData || [])
        .filter(
          (entry) => entry.production_sku_id === item.id
        )
        .reduce(
          (total, entry) =>
            total + Number(entry.production_quantity || 0),
          0
        );

      const totalRemaining = variants.reduce(
        (total, variant) => total + Number(variant.stock || 0),
        0
      );

      return {
        id: item.id,
        skuType: "product",

        sku: item.sku_code,
        name: item.sku_name,
        category: item.category || "",

        price: Number(item.base_price || 0), taxApplicable: item.tax_applicable !== false,

        stock: totalRemaining,
        minimum: 0,
        produced: totalProduced,
        sold: 0,

        optionGroups,
        variants,
      };
    });

    setProducts((current) => [
      ...current.filter(
        (p) => p.skuType === "inventory"
      ),
      ...supabaseProducts,
    ]);

  } catch (error) {
    console.error(
      "Failed to load Production SKU:",
      error
    );
  } finally {
    setLoadingProduction(false);
  }
}

  loadProductionSkus();
}, [setProducts]);

  const productSkus = products.filter((p) => p.skuType !== "inventory");
  const visibleProductSkus = useMemo(() => filterAndSortProductSkus(products, recipes, query, sort), [products, recipes, query, sort]);

  function toggleSort(key) {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: "asc" });
  }

  function SortIcon({ column }) {
    if (sort.key !== column) return <ArrowUpDown size={13} />;
    return sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  }

async function recordProduction(product, selected = {}) {
  const qty = Number(amounts[product.id] || 0);

  if (!qty || qty < 1) return;

  try {
    // Find the exact database variant matching
    // the user's Size / Flavour selections.
    const selectedValueIds = Object.values(selected)
      .filter(Boolean)
      .sort();

    const matchedVariant = (product.variants || []).find(
      (variant) => {
        const variantValueIds = Object.values(
          variant.selections || {}
        )
          .filter(Boolean)
          .sort();

        return (
          JSON.stringify(variantValueIds) ===
          JSON.stringify(selectedValueIds)
        );
      }
    );

    if ((product.optionGroups || []).length && !matchedVariant) {
      throw new Error(
        "No Product Variant matches the selected options."
      );
    }

    const referenceNo =
      `PROD-${Date.now()}`;

    const { error } = await supabase.rpc(
      "process_production",
      {
        p_production_sku_id: product.id,
        p_product_variant_id: matchedVariant?.id ?? null,
        p_quantity: qty,
        p_reference_no: referenceNo,
      }
    );

    if (error) throw error;

    // Reload Inventory because Supabase has deducted
    // the ingredients from current_stock.
    const { data: inventoryData, error: inventoryError } =
      await supabase
        .from("inventory_sku")
        .select("*")
        .eq("is_active", true);

    if (inventoryError) throw inventoryError;

    const { data: variantStockData, error: variantStockError } =
      await supabase
        .from("product_variant_stock")
        .select("product_variant_id, current_stock, minimum_stock");

    if (variantStockError) throw variantStockError;

    setProducts((current) =>
      current.map((item) => {
        if (item.skuType !== "inventory") {
          if (item.id === product.id) {
            const refreshedVariants = (item.variants || []).map((variant) => {
              const stockRow = (variantStockData || []).find(
                (row) => row.product_variant_id === variant.id
              );

              return {
                ...variant,
                produced:
                  variant.id === matchedVariant?.id
                    ? Number(variant.produced || 0) + qty
                    : Number(variant.produced || 0),
                stock: Number(stockRow?.current_stock || 0),
                minimumStock: Number(stockRow?.minimum_stock || 0),
              };
            });

            return {
              ...item,
              produced: Number(item.produced || 0) + qty,
              stock: refreshedVariants.reduce(
                (total, variant) => total + Number(variant.stock || 0),
                0
              ),
              variants: refreshedVariants,
            };
          }

          return item;
        }

        const latest = inventoryData.find(
          (inventory) => inventory.id === item.id
        );

        if (!latest) return item;

        return {
          ...item,

          stock:
            Number(latest.current_stock || 0) /
            Number(latest.inventory_to_recipe || 1),
        };
      })
    );

    const optionText = (product.optionGroups || [])
      .flatMap((group) => {
        const option = group.options?.find(
          (item) => item.id === selected[group.id]
        );

        return option
          ? [`${group.name}: ${option.name}`]
          : [];
      })
      .join(" • ");

    setFeedback((current) => ({
      ...current,
      [product.id]: {
        ok: true,
        text:
          `Produced ${qty}` +
          `${optionText ? ` (${optionText})` : ""}` +
          `${matchedVariant ? ` • ${matchedVariant.code}` : ""}`,
      },
    }));

    setAmounts((current) => ({
      ...current,
      [product.id]: "",
    }));

    setProductionSelectionProduct(null);
    setProductionSelections({});

  } catch (error) {
    console.error("Production error:", error);

    setFeedback((current) => ({
      ...current,
      [product.id]: {
        ok: false,
        text:
          error.message ||
          "Failed to record production.",
      },
    }));
  }
}

  function submit(product) {
    const qty = Number(amounts[product.id] || 0);
    if (!qty || qty < 1) return;
    if ((product.variants || []).length) {
      setProductionSelections({});
      setProductionSelectionProduct(product);
      return;
    }
    recordProduction(product, {});
  }

  function recordProductionVariant(product, variant) {
    recordProduction(product, { ...(variant.selections || {}) });
  }

  function openAdd() {
    setSelectedProduct(null);
    setProductForm({ sku: "", name: "", category: "", price: "", minimum: 0, taxApplicable: true, optionGroups: [] });
    setFormError("");
    setModal("product");
  }

  function openEdit(product) {
  setSelectedProduct(product);

  setProductForm({
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    minimum: product.minimum ?? 0,
    taxApplicable: product.taxApplicable !== false,

    optionGroups: (product.optionGroups || []).map((g) => ({
      ...g,
      options: (g.options || []).map((o) => ({
        ...o,
        recipeChanges: (o.recipeChanges || []).map((c) => ({
          ...c,
        })),
      })),
    })),

    variants: (product.variants || []).map((variant) => ({
      ...variant,
      selections: {
        ...(variant.selections || {}),
      },
    })),
  });

  setFormError("");
  setModal("product");
}

  async function saveProduct(event) {
    event.preventDefault();
    const error = validateProductSku(productForm, products, selectedProduct?.id ?? null);
    const optionError = validateProductOptions(productForm.optionGroups || []);
    if (error || optionError) { setFormError(error || optionError); return; }
    const normalized = {
      sku: productForm.sku.trim(),
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      minimum: Number(productForm.minimum || 0),
      taxApplicable: productForm.taxApplicable !== false,
      optionGroups: productForm.optionGroups || [],
    };
    if (selectedProduct) {
  try {
    // 1. Update main Production SKU
    const { error: productError } = await supabase
      .from("production_sku")
      .update({
        sku_code: normalized.sku,
        sku_name: normalized.name,
        category: normalized.category,
        base_price: normalized.price,
        tax_applicable: normalized.taxApplicable,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedProduct.id);

    if (productError) throw productError;

    // 2. Update each existing variant selling price
    for (const variant of productForm.variants || []) {
      const { error: variantError } = await supabase
        .from("product_variant")
        .update({
          selling_price: Number(variant.price || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", variant.id);

      if (variantError) throw variantError;
    }

    // 3. Update React state
    setProducts((current) =>
      current.map((p) =>
        p.id === selectedProduct.id
          ? {
              ...p,
              ...normalized,

              variants: (productForm.variants || []).map(
                (variant) => ({
                  ...variant,
                  price: Number(variant.price || 0),
                })
              ),
            }
          : p
      )
    );

  } catch (error) {
    console.error("Production SKU update error:", error);

    setFormError(
      error.message ||
      "Failed to update Production SKU."
    );

    return;
  }
} else {
      try {
        const sizeGroup = (normalized.optionGroups || []).find((group) => String(group.name || "").trim().toLowerCase() === "size") || (normalized.optionGroups || [])[0];
        const options = (sizeGroup?.options || []).map((option) => ({
          name: String(option.name || "").trim(),
          price: Number(normalized.price || 0) + Number(option.priceAdjustment || 0),
        })).filter((option) => option.name);

        const { error: createError } = await supabase.rpc("create_production_sku", {
          p_sku_code: normalized.sku,
          p_sku_name: normalized.name,
          p_category: normalized.category || null,
          p_base_price: normalized.price,
          p_tax_applicable: normalized.taxApplicable,
          p_options: options,
        });
        if (createError) throw createError;

        setModal(null);
        window.location.reload();
        return;
      } catch (error) {
        console.error("Production SKU create error:", error);
        setFormError(error.message || "Failed to create Production SKU.");
        return;
      }
    }
    setModal(null);
  }

  function updateOptionGroup(groupIndex, changes) { setProductForm((current) => ({ ...current, optionGroups: current.optionGroups.map((group, index) => index === groupIndex ? { ...group, ...changes } : group) })); }
  function addOptionGroup() {
    const index = (productForm.optionGroups || []).length + 1;
    setProductForm((current) => ({ ...current, optionGroups: [...(current.optionGroups || []), { id: `group-${Date.now()}-${index}`, name: `Option Group ${index}`, required: false, priceImpact: true, recipeImpact: false, options: [{ id: `option-${Date.now()}-${index}`, name: "Option 1", priceAdjustment: 0, recipeChanges: [] }] }] }));
  }
  function removeOptionGroup(groupIndex) { setProductForm((current) => ({ ...current, optionGroups: current.optionGroups.filter((_, index) => index !== groupIndex) })); }
  function addOption(groupIndex) { setProductForm((current) => ({ ...current, optionGroups: current.optionGroups.map((group, index) => index === groupIndex ? { ...group, options: [...group.options, { id: `option-${Date.now()}-${groupIndex}-${group.options.length}`, name: `Option ${group.options.length + 1}`, priceAdjustment: 0, recipeChanges: [] }] } : group) })); }
  function updateOption(groupIndex, optionIndex, changes) { setProductForm((current) => ({ ...current, optionGroups: current.optionGroups.map((group, gi) => gi !== groupIndex ? group : { ...group, options: group.options.map((option, oi) => oi === optionIndex ? { ...option, ...changes } : option) }) })); }
  function removeOption(groupIndex, optionIndex) { setProductForm((current) => ({ ...current, optionGroups: current.optionGroups.map((group, gi) => gi !== groupIndex ? group : { ...group, options: group.options.filter((_, oi) => oi !== optionIndex) }) })); }

  function deleteProduct(product) {
    const blocked = canDeleteProductSku(product, recipes[product.id] || []);
    if (blocked) {
      setFeedback((current) => ({ ...current, [product.id]: { ok: false, text: blocked } }));
      return;
    }
    if (window.confirm(`Delete ${product.sku} - ${product.name}?`)) {
      setProducts((current) => current.filter((p) => p.id !== product.id));
    }
  }

  function openRecipe(product) {
    if (!(recipes[product.id] || []).length) return;
    setSelectedProduct(product);
    setModal("recipe");
  }

  function RecipeStatusButton({ product }) {
    const recipe = recipes[product.id] || [];
    const configured = recipe.length > 0;
    return (
      <button
        type="button"
        className={`recipe-status ${configured ? "configured" : "not-configured"}`}
        onClick={() => openRecipe(product)}
        disabled={!configured}
        title={configured ? "View recipe detail" : "Configure recipe in Recipe Management"}
      >
        {getRecipeStatus(recipe)}
      </button>
    );
  }

  return (
    <div className="production-page">
      <section className="production-summary production-toolbar">
        <div>
          <p className="eyebrow">PRODUCT SKU</p>
          <h3>Production SKU management</h3>
          <p className="muted">Maintain Product SKUs and record production. Recipe ingredients are deducted from Inventory when production is recorded.</p>
        </div>
        <div className="production-toolbar-actions">
          <div className="search-box production-search">
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search SKU, product, category or recipe status..." />
          </div>
          <div className="view-toggle" aria-label="Production view">
            <button className={viewMode === "tiles" ? "selected" : ""} onClick={() => setViewMode("tiles")} title="Tile view"><Grid3X3 size={18} /></button>
            <button className={viewMode === "list" ? "selected" : ""} onClick={() => setViewMode("list")} title="List view"><List size={18} /></button>
          </div>
          <button className="primary-btn" onClick={openAdd}><Plus size={17} /> Add Product SKU</button>
        </div>
      </section>

      <section className="production-summary production-kpis">
        <div className="production-metrics">
          <div><strong>{productSkus.reduce((a, p) => a + Number(p.produced || 0), 0)}</strong><span>Produced</span></div>
          <div><strong>{productSkus.reduce((a, p) => a + Number(p.sold || 0), 0)}</strong><span>Sold</span></div>
          <div><strong>{productSkus.reduce((a, p) => a + Number(p.stock || 0), 0)}</strong><span>Remaining</span></div>
        </div>
      </section>

      {viewMode === "tiles" ? (
        <section className="production-grid">
          {visibleProductSkus.map((p) => (
            <article className="production-card" key={p.id}>
              <div className="section-head product-card-head">
                <div>
                  <span className="product-category">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p className="muted">{p.sku}</p>
                </div>
                <div className="product-crud-actions">
                  <button className="icon-btn" title="Edit Product SKU" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                  <button className="icon-btn danger-icon" title="Delete Product SKU" onClick={() => deleteProduct(p)}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="production-bars">
                {(p.variants || []).length ? (p.variants || []).map((variant) => (
                  <div key={variant.id} style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px", alignItems: "center" }}>
                    <span><strong>{variant.name || variant.code}</strong></span>
                    <span>Produced <strong>{variant.produced || 0}</strong></span>
                    <span>Remaining <strong>{variant.stock || 0}</strong></span>
                  </div>
                )) : <>
                  <div><span>Produced</span><strong>{p.produced}</strong></div>
                  <div><span>Remaining</span><strong>{p.stock}</strong></div>
                </>}
              </div>
              <RecipeStatusButton product={p} />
              {feedback[p.id] && <div className={feedback[p.id].ok ? "production-feedback ok" : "production-feedback error"}>{feedback[p.id].text}</div>}
              <div className="production-entry">
                <input type="number" min="1" value={amounts[p.id] ?? ""} onChange={(e) => setAmounts((current) => ({ ...current, [p.id]: e.target.value }))} placeholder="Qty produced" />
                <button className="primary-btn" onClick={() => submit(p)}>Record</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="production-list-card">
          <div className="production-list-row production-list-head">
            <button onClick={() => toggleSort("sku")}>SKU <SortIcon column="sku" /></button>
            <button onClick={() => toggleSort("name")}>Product Name <SortIcon column="name" /></button>
            <button onClick={() => toggleSort("category")}>Category <SortIcon column="category" /></button>
            <button onClick={() => toggleSort("produced")}>Produced <SortIcon column="produced" /></button>
            <button onClick={() => toggleSort("sold")}>Sold <SortIcon column="sold" /></button>
            <button onClick={() => toggleSort("stock")}>Remaining <SortIcon column="stock" /></button>
            <button onClick={() => toggleSort("recipeStatus")}>Recipe Status <SortIcon column="recipeStatus" /></button>
            <span>Record Production</span><span>Action</span>
          </div>
          {visibleProductSkus.map((p) => (
            <div className="production-list-row" key={p.id}>
              <span data-label="SKU"><strong>{p.sku}</strong></span>
              <span data-label="Product Name"><strong>{p.name}</strong></span>
              <span data-label="Category">{p.category}</span>
              <span data-label="Produced">{(p.variants || []).map((v) => <small key={v.id} style={{ display: "block" }}><strong>{v.name}:</strong> {v.produced || 0}</small>)}</span>
              <span data-label="Sold"><strong>{p.sold}</strong></span>
              <span data-label="Remaining">{(p.variants || []).map((v) => <small key={v.id} style={{ display: "block" }}><strong>{v.name}:</strong> {v.stock || 0}</small>)}</span>
              <span data-label="Recipe Status"><RecipeStatusButton product={p} /></span>
              <span data-label="Record Production" className="list-production-entry">
                <input type="number" min="1" value={amounts[p.id] ?? ""} onChange={(e) => setAmounts((current) => ({ ...current, [p.id]: e.target.value }))} placeholder="Qty" />
                <button className="primary-btn" onClick={() => submit(p)}>Record</button>
                {feedback[p.id] && <small className={feedback[p.id].ok ? "feedback-text ok" : "feedback-text error"}>{feedback[p.id].text}</small>}
              </span>
              <span data-label="Action" className="product-crud-actions">
                <button className="icon-btn" title="Edit Product SKU" onClick={() => openEdit(p)}><Pencil size={16} /></button>
                <button className="icon-btn danger-icon" title="Delete Product SKU" onClick={() => deleteProduct(p)}><Trash2 size={16} /></button>
              </span>
            </div>
          ))}
        </section>
      )}

      {modal && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className={`modal-card ${modal === "recipe" ? "recipe-detail-modal" : ""}`}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{modal === "recipe" ? "RECIPE DETAIL" : selectedProduct ? "EDIT PRODUCT SKU" : "ADD PRODUCT SKU"}</p>
                <h3>{modal === "recipe" ? `${selectedProduct?.sku} — ${selectedProduct?.name}` : selectedProduct ? selectedProduct.name : "New Product SKU"}</h3>
              </div>
              <button className="icon-btn" onClick={() => setModal(null)}><X size={18} /></button>
            </div>

            {modal === "product" && (
              <form className="sku-form" onSubmit={saveProduct}>
                <label>Product SKU Code<input autoFocus value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="e.g. BUR-002" /></label>
                <label>Product Name<input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Product description" /></label>
                <label>Category<select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}><option value="">Select category</option>{configOptions.filter((x) => x.option_type === "PRODUCT_CATEGORY").map((x) => <option key={x.id} value={x.option_value}>{x.option_value}</option>)}</select></label>
                <label>Selling Price (RM)<input type="number" min="0" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label className="inline-check"><input type="checkbox" checked={productForm.taxApplicable !== false} onChange={(e) => setProductForm({ ...productForm, taxApplicable: e.target.checked })} /> Apply 6% Tax</label>
                <label>Minimum Product Stock<input type="number" min="0" step="1" value={productForm.minimum} onChange={(e) => setProductForm({ ...productForm, minimum: e.target.value })} /></label>
                <div className="option-editor">
                  <div className="section-head option-editor-head"><div><p className="eyebrow">SELLING OPTIONS</p><strong>Size / Variant / Flavour</strong><span className="muted">Optional. Recipe-impacting options can define ingredient changes in Recipe Management.</span></div><button type="button" className="secondary-btn" onClick={addOptionGroup}><Plus size={16} /> Add Group</button></div>
                  {!productForm.optionGroups?.length && <div className="empty-recipe">No selling options configured. This SKU will sell at its base price.</div>}
                  {(productForm.optionGroups || []).map((group, gi) => <div className="option-editor-group" key={group.id}>
                    <div className="option-editor-group-head"><input value={group.name} onChange={(e) => updateOptionGroup(gi, { name: e.target.value })} placeholder="Group name" /><label className="inline-check"><input type="checkbox" checked={!!group.required} onChange={(e) => updateOptionGroup(gi, { required: e.target.checked })} /> Required</label><label className="inline-check"><input type="checkbox" checked={!!group.priceImpact} onChange={(e) => updateOptionGroup(gi, { priceImpact: e.target.checked })} /> Price impact</label><label className="inline-check"><input type="checkbox" checked={!!group.recipeImpact} onChange={(e) => updateOptionGroup(gi, { recipeImpact: e.target.checked })} /> Recipe impact</label><button type="button" className="danger-icon" onClick={() => removeOptionGroup(gi)}><Trash2 size={16} /></button></div>
                    <div className="option-editor-options">{group.options.map((option, oi) => <div className="option-editor-row" key={option.id}><input value={option.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} placeholder="Option name" /><label>Adjustment<input type="number" min="0" step="0.01" disabled={!group.priceImpact} value={option.priceAdjustment} onChange={(e) => updateOption(gi, oi, { priceAdjustment: e.target.value })} /></label><button type="button" className="danger-icon" onClick={() => removeOption(gi, oi)}><Trash2 size={15} /></button></div>)}</div>
                    <button type="button" className="text-btn" onClick={() => addOption(gi)}><Plus size={15} /> Add option</button>
                  </div>)}
                </div>
                {selectedProduct && (productForm.variants || []).length > 0 && (
  <div className="option-editor">
    <div className="section-head option-editor-head">
      <div>
        <p className="eyebrow">VARIANT COMBINATIONS</p>
        <strong>Combination Selling Price</strong>
        <span className="muted">
          Each combination can have its own selling price.
        </span>
      </div>
    </div>

    <div className="option-editor-options">
      {(productForm.variants || []).map((variant, variantIndex) => {
        const combinationName = (productForm.optionGroups || [])
          .map((group) => {
            const selectedOptionId =
              variant.selections?.[group.id];

            const option = (group.options || []).find(
              (item) => item.id === selectedOptionId
            );

            return option?.name;
          })
          .filter(Boolean)
          .join(" + ");

        return (
          <div
            className="option-editor-row"
            key={variant.id}
          >
            <div>
              <strong>
                {combinationName ||
                  variant.name ||
                  variant.code}
              </strong>

              <small className="muted">
                {variant.code}
              </small>
            </div>

            <label>
              Selling Price (RM)
              <input
                type="number"
                min="0"
                step="0.01"
                value={variant.price}
                onChange={(e) => {
                  const newPrice = e.target.value;

                  setProductForm((current) => ({
                    ...current,
                    variants: current.variants.map(
                      (item, index) =>
                        index === variantIndex
                          ? {
                              ...item,
                              price: newPrice,
                            }
                          : item
                    ),
                  }));
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  </div>
)}
                {formError && <div className="form-error product-form-error">{formError}</div>}
                <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setModal(null)}>Cancel</button><button className="primary-btn" type="submit">{selectedProduct ? "Save Changes" : "Add Product SKU"}</button></div>
              </form>
            )}

            {modal === "recipe" && selectedProduct && (
              <div className="recipe-detail-list">
                {(recipes[selectedProduct.id] || []).map((line) => {
                  const inv = products.find((x) => x.id === line.inventorySkuId);
                  return (
                    <div className="recipe-detail-row" key={line.inventorySkuId}>
                      <div><strong>{inv?.name || "Inventory SKU"}</strong><span>{inv?.sku || "-"}</span></div>
                      <strong>{line.qtyRecipeUom} {inv?.recipeUom || ""}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {productionSelectionProduct && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setProductionSelectionProduct(null)}>
          <div className="modal-card option-selection-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div><p className="eyebrow">RECORD PRODUCTION</p><h3>{productionSelectionProduct.name}</h3><span className="muted">Select the exact Product Variant to produce.</span></div>
              <button className="icon-btn" onClick={() => setProductionSelectionProduct(null)}><X size={18} /></button>
            </div>
            <div className="option-selection-list">
              <div className="option-group-card">
                <div className="option-group-head"><strong>Product Variant</strong><span>Existing active variants only</span></div>
                <div className="option-choice-grid">
                  {(productionSelectionProduct.variants || []).map((variant) => (
                    <button key={variant.id} className="option-choice" onClick={() => recordProductionVariant(productionSelectionProduct, variant)}>
                      <strong>{variant.name || variant.code}</strong>
                      <span>Produced {variant.produced || 0} • Remaining {variant.stock || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions"><button className="secondary-btn" onClick={() => setProductionSelectionProduct(null)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Config({ options, reloadConfig }) {
  const [values, setValues] = useState({ INVENTORY_CATEGORY: "", UOM: "", PRODUCT_CATEGORY: "" });
  const [message, setMessage] = useState("");
  const groups = [
    ["INVENTORY_CATEGORY", "Inventory Category"],
    ["UOM", "UOM"],
    ["PRODUCT_CATEGORY", "Product SKU Category"],
  ];

  async function add(type) {
    const value = values[type]?.trim();
    if (!value) return;
    const { error } = await supabase.rpc("add_config_option", { p_option_type: type, p_option_value: value });
    if (error) return setMessage(error.message || "Failed to add config.");
    setValues((current) => ({ ...current, [type]: "" }));
    setMessage("");
    await reloadConfig();
  }

  async function remove(id) {
    if (!window.confirm("Remove this config value?")) return;
    const { error } = await supabase.rpc("remove_config_option", { p_id: id });
    if (error) return setMessage(error.message || "Failed to remove config.");
    setMessage("");
    await reloadConfig();
  }

  return (
    <div className="config-page">
      <section className="hero-panel">
        <div><p className="eyebrow">MASTER CONFIGURATION</p><h1>Config</h1><p>Maintain reusable categories and UOM values used by Inventory and Production SKU.</p></div>
      </section>
      <section className="config-grid">
        {groups.map(([type, title]) => (
          <article className="table-card config-card" key={type}>
            <div className="section-head"><div><p className="eyebrow">MASTER LIST</p><h3>{title}</h3></div></div>
            <div className="config-add-row">
              <input value={values[type]} onChange={(e) => setValues((current) => ({ ...current, [type]: e.target.value }))} placeholder={`Add ${title}`} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(type); } }} />
              <button className="primary-btn" onClick={() => add(type)}><Plus size={16} /> Add</button>
            </div>
            <div className="alert-list">
              {options.filter((x) => x.option_type === type).map((item) => (
                <div className="alert-row" key={item.id}>
                  <div className="grow"><strong>{item.option_value}</strong></div>
                  <button className="icon-btn danger-icon" title="Remove" onClick={() => remove(item.id)}><Trash2 size={16} /></button>
                </div>
              ))}
              {!options.some((x) => x.option_type === type) && <div className="dashboard-empty-alert">No values configured.</div>}
            </div>
          </article>
        ))}
      </section>
      {message && <div className="form-error">{message}</div>}
    </div>
  );
}


function PublicOrderPage() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [customerName, setCustomerName] = useState("");
  const [customerTelephone, setCustomerTelephone] = useState("");
  const [selectionProduct, setSelectionProduct] = useState(null);
  const [selections, setSelections] = useState({});
  const [selectionQuantity, setSelectionQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [customerErrors, setCustomerErrors] = useState({});

  async function loadMenu() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_public_order_menu");
    if (error) { setLoading(false); return alert(error.message); }
    const menu = data || {};
    const types = menu.types || [], values = menu.values || [], variants = menu.variants || [];
    setProducts((menu.products || []).map((p) => {
      const productTypes = types.filter((t) => t.production_sku_id === p.id);
      const optionGroups = productTypes.map((t) => ({
        id: `type-${t.id}`, databaseId: t.id, name: t.name, required: true, priceImpact: true, recipeImpact: true,
        options: values.filter((v) => v.variation_type_id === t.id).map((v) => ({ id: `value-${v.id}`, databaseId: v.id, name: v.name, priceAdjustment: 0, recipeChanges: [] })),
      }));
      const productVariants = variants.filter((v) => v.production_sku_id === p.id).map((v) => {
        const selections = {};
        productTypes.forEach((t) => {
          const value = values.find((x) => x.variation_type_id === t.id && (v.value_ids || []).includes(x.id));
          if (value) selections[`type-${t.id}`] = `value-${value.id}`;
        });
        return { id:v.id, code:v.code, name:v.name || "", price:Number(v.price || 0), stock:Number(v.stock || 0), selections };
      });
      return { id:p.id, skuType:"product", sku:p.sku, name:p.name, category:p.category || "", price:Number(p.price || 0), taxApplicable:p.tax_applicable !== false, optionGroups, variants:productVariants, stock:productVariants.reduce((s,v)=>s+v.stock,0) };
    }));
    setLoading(false);
  }

  useEffect(() => { loadMenu(); }, []);

  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const filtered = products.filter((p) => (category === "All" || p.category === category) && (p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase())));

  function openProduct(product) {
    if (product.stock <= 0) return;
    setSelectionProduct(product); setSelectionQuantity(1); setSelections({});
  }
  function addConfigured(product, selected, ignoredPrice, quantity=1) {
    const selectedIds=Object.values(selected||{}).filter(Boolean).sort();
    const variant=(product.variants||[]).find((v)=>JSON.stringify(Object.values(v.selections||{}).filter(Boolean).sort())===JSON.stringify(selectedIds));
    if(!variant) return alert("Please select an available product option.");
    const selectedOptions=(product.optionGroups||[]).flatMap((group)=>{const option=group.options?.find((x)=>x.id===selected[group.id]);return option?[{groupId:group.id,groupName:group.name,optionId:option.id,optionName:option.name}]:[];});
    const key=`${product.id}-${variant.id}`;
    setCart((current)=>{const found=current.find((x)=>x.id===key);const addQty=Math.max(1,Number(quantity||1));if(found)return current.map((x)=>x.id===key?{...x,qty:x.qty+addQty}:x);return [...current,{...product,id:key,productId:product.id,variantId:variant.id,price:variant.price,stock:variant.stock,selectedOptions,qty:addQty}];});
    setSelectionProduct(null); setSelections({});
  }
  function adjust(id,delta){setCart((current)=>current.map((x)=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x).filter((x)=>x.qty>0));}
  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const taxableSubtotal=cart.reduce((s,x)=>s+(x.taxApplicable!==false?x.price*x.qty:0),0);
  const tax=taxableSubtotal*0.06,total=subtotal+tax;

  async function placeOrder(){
    if(!customerName.trim()||!customerTelephone.trim()) return alert("Customer name and telephone number are required.");
    if(!cart.length) return;
    setSubmitting(true);
    const items=cart.map((item)=>({product_variant_id:item.variantId,quantity:item.qty,options:(item.selectedOptions||[]).map((o)=>{const g=item.optionGroups.find((x)=>x.id===o.groupId);const v=g?.options?.find((x)=>x.id===o.optionId);return {variation_type_id:g?.databaseId||null,variation_value_id:v?.databaseId||null,group_name:o.groupName,value_name:o.optionName};})}));
    const {data,error}=await supabase.rpc("create_public_sales_order",{p_customer_name:customerName.trim(),p_customer_telephone:customerTelephone.trim(),p_items:items});
    setSubmitting(false);
    if(error) return alert(error.message);
    setConfirmation({
      ...data,
      customer_name: customerName.trim(),
      customer_telephone: customerTelephone.trim(),
      items: cart.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        lineTotal: item.price * item.qty,
        options: (item.selectedOptions || []).map((o) => `${o.groupName}: ${o.optionName}`),
      })),
      subtotal,
      tax,
      grand_total: Number(data?.grand_total ?? total),
      created_at: new Date().toISOString(),
    });
    setCart([]); setCustomerName(""); setCustomerTelephone(""); await loadMenu();
  }

  function downloadReceipt() {
    if (!confirmation) return;
    const receipt = `<!doctype html><html><head><meta charset="utf-8"><title>${confirmation.order_no}</title><style>
      @page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#222;max-width:700px;margin:auto}h1{text-align:center;margin-bottom:4px}.center{text-align:center}.muted{color:#666}.box{border:1px solid #ddd;border-radius:10px;padding:14px;margin:18px 0}.row{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #eee}.row:last-child{border-bottom:0}.total{font-size:20px;font-weight:700}.item{padding:10px 0;border-bottom:1px solid #eee}.item:last-child{border-bottom:0}.item-head{display:flex;justify-content:space-between;font-weight:700}.options{font-size:12px;color:#666;margin-top:4px}.footer{text-align:center;margin-top:28px;color:#666;font-size:12px}</style></head><body>
      <h1>HanaAzz Enterprise</h1><div class="center muted">Order Receipt</div>
      <div class="box"><div class="row"><span>Order No.</span><strong>${confirmation.order_no}</strong></div><div class="row"><span>Date</span><span>${new Date(confirmation.created_at).toLocaleString()}</span></div><div class="row"><span>Customer</span><span>${confirmation.customer_name}</span></div><div class="row"><span>Telephone</span><span>${confirmation.customer_telephone}</span></div></div>
      <h3>Order Summary</h3><div class="box">${(confirmation.items || []).map((item)=>`<div class="item"><div class="item-head"><span>${item.name} × ${item.qty}</span><span>${money(item.lineTotal)}</span></div>${item.options?.length?`<div class="options">${item.options.join(" • ")}</div>`:""}<div class="options">${money(item.price)} each</div></div>`).join("")}</div>
      <div class="box"><div class="row"><span>Subtotal</span><strong>${money(confirmation.subtotal)}</strong></div><div class="row"><span>Tax</span><strong>${money(confirmation.tax)}</strong></div><div class="row total"><span>Total</span><span>${money(confirmation.grand_total)}</span></div><div class="row"><span>Payment</span><strong>Pay Later</strong></div><div class="row"><span>Status</span><strong>Pending Payment</strong></div></div>
      <div class="footer">Please proceed to the counter for payment.<br>Thank you for your order.</div>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return alert("Please allow pop-ups to save your receipt.");
    win.document.open();
    win.document.write(receipt);
    win.document.close();
    win.focus();
    win.print();
  }

  if(confirmation) return <div className="public-order-page"><div className="public-order-header"><div><strong>HanaAzz Enterprise</strong><span>Customer Order</span></div></div><div className="public-confirmation"><PackageCheck size={48}/><p className="eyebrow">ORDER CONFIRMED</p><h1>Thank you!</h1><p>Your order has been sent to the store.</p><div className="public-order-number"><span>Order No.</span><strong>{confirmation.order_no}</strong></div><div className="confirmation-customer"><div><span>Customer</span><strong>{confirmation.customer_name}</strong></div><div><span>Telephone</span><strong>{confirmation.customer_telephone}</strong></div></div><div className="confirmation-items">{(confirmation.items||[]).map((item,index)=><div className="confirmation-item" key={index}><div><strong>{item.name} × {item.qty}</strong>{item.options?.length>0&&<span>{item.options.join(" • ")}</span>}</div><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="bill"><div><span>Subtotal</span><strong>{money(confirmation.subtotal)}</strong></div><div><span>Tax</span><strong>{money(confirmation.tax)}</strong></div><div className="total"><span>Total</span><strong>{money(confirmation.grand_total)}</strong></div><div><span>Payment</span><strong>Pay Later</strong></div><div><span>Status</span><strong>Pending Payment</strong></div></div><p className="muted">Please proceed to the counter for payment.</p><div className="receipt-save-box"><strong>Would you like to save your order receipt?</strong><span>You can save the receipt as a PDF on your phone or computer.</span><button className="primary-btn full" onClick={downloadReceipt}>Download PDF Receipt</button></div><button className="secondary-btn full" onClick={()=>setConfirmation(null)}>Create Another Order</button></div></div>;

  return <div className="public-order-page">
    <div className="public-order-header"><div><strong>HanaAzz Enterprise</strong><span>Customer Order</span></div><span className="system-status"><span className="status-dot"/> Online</span></div>
    {loading ? <div className="public-loading">Loading menu...</div> : <div className="pos-layout public-pos">
      <section className="product-zone"><div className="toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search product..."/></div><div className="category-strip">{categories.map((x)=><button key={x} className={category===x?"selected":""} onClick={()=>setCategory(x)}>{x}</button>)}</div></div>
      <div className="product-grid">{filtered.map((p)=><button key={p.id} className="product-card" onClick={()=>openProduct(p)}><span className="product-category">{p.category}</span><strong>{p.name}</strong><span className="sku">{p.sku}</span><div className="product-bottom"><b>{money(p.price)}</b></div></button>)}</div></section>
      <aside className="cart-panel"><div className="section-head"><div><p className="eyebrow">YOUR ORDER</p><h3>Order Summary</h3></div><span className="cart-count">{cart.reduce((a,x)=>a+x.qty,0)}</span></div>
      <div className="customer-info-box"><div className="customer-info-title"><strong>Customer Info</strong><span>Required</span></div><div className="customer-info-grid"><label>Name *<input required value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="Your name"/></label><label>Telephone No. *<input required value={customerTelephone} onChange={(e)=>setCustomerTelephone(e.target.value)} placeholder="e.g. 0123456789"/></label></div></div>
      <div className="cart-items">{!cart.length&&<div className="empty-state"><ShoppingCart size={30}/><strong>No items yet</strong><span>Select an item to start your order.</span></div>}{cart.map((x)=><div className="cart-item" key={x.id}><div className="grow"><strong>{x.name}</strong>{x.selectedOptions?.length>0&&<span>{x.selectedOptions.map((o)=>`${o.groupName}: ${o.optionName}`).join(" • ")}</span>}<span>{money(x.price)} each</span></div><div className="qty"><button onClick={()=>adjust(x.id,-1)}><Minus size={15}/></button><span>{x.qty}</span><button onClick={()=>adjust(x.id,1)}><Plus size={15}/></button></div><strong>{money(x.price*x.qty)}</strong></div>)}</div>
      <div className="bill"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Tax 6%</span><strong>{money(tax)}</strong></div><div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary-btn full" disabled={!cart.length||!customerName.trim()||!customerTelephone.trim()||submitting} onClick={placeOrder}>{submitting?"Submitting...":`Place Order • ${money(total)}`}</button><small className="muted">Payment will be made at the counter.</small></div></aside>
      {selectionProduct&&<OptionSelectionModal product={selectionProduct} selections={selections} setSelections={setSelections} quantity={selectionQuantity} setQuantity={setSelectionQuantity} onCancel={()=>setSelectionProduct(null)} onConfirm={(price)=>addConfigured(selectionProduct,selections,price,selectionQuantity)} actionLabel="Add to Order"/>}
    </div>}</div>;
}

function App() {
  const isPublicOrder = window.location.pathname === "/order" || window.location.pathname === "/customer-order";
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventoryUsage, setInventoryUsage] = useState([]);
  const [configOptions, setConfigOptions] = useState([]);
  const [recipes, setRecipes] = useState({
    1: [
      { inventorySkuId: 101, qtyRecipeUom: 200 },
      { inventorySkuId: 102, qtyRecipeUom: 80 },
      { inventorySkuId: 103, qtyRecipeUom: 50 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    2: [
      { inventorySkuId: 101, qtyRecipeUom: 180 },
      { inventorySkuId: 102, qtyRecipeUom: 70 },
      { inventorySkuId: 103, qtyRecipeUom: 60 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    3: [
      { inventorySkuId: 101, qtyRecipeUom: 220 },
      { inventorySkuId: 102, qtyRecipeUom: 50 },
      { inventorySkuId: 103, qtyRecipeUom: 30 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    4: [
      { inventorySkuId: 101, qtyRecipeUom: 180 },
      { inventorySkuId: 102, qtyRecipeUom: 70 },
      { inventorySkuId: 103, qtyRecipeUom: 40 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    5: [
      { inventorySkuId: 101, qtyRecipeUom: 220 },
      { inventorySkuId: 102, qtyRecipeUom: 60 },
      { inventorySkuId: 103, qtyRecipeUom: 30 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    6: [
      { inventorySkuId: 101, qtyRecipeUom: 180 },
      { inventorySkuId: 104, qtyRecipeUom: 5 },
      { inventorySkuId: 105, qtyRecipeUom: 2 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    7: [
      { inventorySkuId: 101, qtyRecipeUom: 150 },
      { inventorySkuId: 104, qtyRecipeUom: 4 },
      { inventorySkuId: 105, qtyRecipeUom: 1 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
    8: [
      { inventorySkuId: 101, qtyRecipeUom: 160 },
      { inventorySkuId: 104, qtyRecipeUom: 4 },
      { inventorySkuId: 106, qtyRecipeUom: 1 },
    ],
  });

  async function loadMasterData() {
    try {
      const [
        { data: inventoryData, error: inventoryError },
        { data: productData, error: productError },
        { data: typeData, error: typeError },
        { data: valueData, error: valueError },
        { data: variantData, error: variantError },
        { data: variantValueData, error: variantValueError },
        { data: productionEntryData, error: productionEntryError },
        { data: variantStockData, error: variantStockError },
      ] = await Promise.all([
        supabase.from("inventory_sku").select("*").eq("is_active", true).order("sku_code"),
        supabase.from("production_sku").select("*").eq("is_active", true).order("sku_code"),
        supabase.from("variation_type").select("*").order("id"),
        supabase.from("variation_value").select("*").order("id"),
        supabase.from("product_variant").select("*").eq("is_active", true).order("id"),
        supabase.from("product_variant_value").select("*"),
        supabase.from("production_entry").select("production_sku_id, product_variant_id, production_quantity"),
        supabase.from("product_variant_stock").select("product_variant_id, current_stock, minimum_stock"),
      ]);
      const error = inventoryError || productError || typeError || valueError || variantError || variantValueError || productionEntryError || variantStockError;
      if (error) throw error;

      const inventory = (inventoryData || []).map((item) => ({
        id: item.id, skuType: "inventory", sku: item.sku_code, name: item.sku_name, category: item.category || "",
        price: Number(item.price || 0),
        stock: Number(item.inventory_to_recipe || 1) > 0 ? Number(item.current_stock || 0) / Number(item.inventory_to_recipe || 1) : 0,
        minimum: Number(item.inventory_to_recipe || 1) > 0 ? Number(item.minimum_stock ?? item.low_stock_level ?? 0) / Number(item.inventory_to_recipe || 1) : 0,
        orderUom: item.order_uom || "", inventoryUom: item.inventory_uom || "", recipeUom: item.recipe_uom || "",
        orderToInventory: Number(item.order_to_inventory || 1), inventoryToRecipe: Number(item.inventory_to_recipe || 1),
        produced: 0, sold: 0, purchaseHistory: [],
      }));

      const production = (productData || []).map((item) => {
        const productTypes = (typeData || []).filter((type) => type.production_sku_id === item.id && type.type_name === "Size");
        const optionGroups = productTypes.map((type) => ({
          id: `type-${type.id}`, databaseId: type.id, name: type.type_name, required: true, priceImpact: true, recipeImpact: true,
          options: (valueData || []).filter((value) => value.variation_type_id === type.id).map((value) => ({
            id: `value-${value.id}`, databaseId: value.id, name: value.value_name, priceAdjustment: 0, recipeChanges: [],
          })),
        }));
        const variants = (variantData || []).filter((variant) => variant.production_sku_id === item.id).map((variant) => {
          const linkedValueIds = (variantValueData || []).filter((link) => link.product_variant_id === variant.id).map((link) => link.variation_value_id);
          const selections = {};
          productTypes.forEach((type) => {
            const selectedValue = (valueData || []).find((value) => value.variation_type_id === type.id && linkedValueIds.includes(value.id));
            if (selectedValue) selections[`type-${type.id}`] = `value-${selectedValue.id}`;
          });
          const stockRow = (variantStockData || []).find((row) => row.product_variant_id === variant.id);
          const produced = (productionEntryData || []).filter((entry) => entry.product_variant_id === variant.id).reduce((sum, entry) => sum + Number(entry.production_quantity || 0), 0);
          return { id: variant.id, code: variant.variant_code, name: variant.variant_name || "", price: Number(variant.selling_price || 0), produced, stock: Number(stockRow?.current_stock || 0), minimumStock: Number(stockRow?.minimum_stock || 0), selections };
        });
        return {
          id: item.id, skuType: "product", sku: item.sku_code, name: item.sku_name, category: item.category || "", price: Number(item.base_price || 0), taxApplicable: item.tax_applicable !== false,
          stock: variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0), minimum: 0,
          produced: variants.reduce((sum, variant) => sum + Number(variant.produced || 0), 0), sold: 0, optionGroups, variants,
        };
      });
      setProducts([...inventory, ...production]);
    } catch (error) {
      console.error("Load master data error:", error);
    }
  }

  async function loadConfig() {
    const { data, error } = await supabase.rpc("get_config_options");
    if (error) { console.error("Load config error:", error); return; }
    setConfigOptions(data || []);
  }

  async function loadOrders() {
    const { data, error } = await supabase.from("sales_order").select("*, sales_order_item(*, sales_order_item_option(*))").order("created_at", { ascending: false });
    if (error) { console.error("Load orders error:", error); return; }
    setOrders((data || []).map((order) => ({
      id: order.order_no, orderDate: order.created_at, customerName: order.customer_name || "", customerTelephone: order.customer_telephone || "",
      subtotal: Number(order.subtotal || 0), tax: Number(order.tax_amount || 0), grandTotal: Number(order.grand_total || 0),
      paymentStatus: order.payment_status, pickupStatus: order.pickup_status,
      items: (order.sales_order_item || []).map((item) => ({
        id: item.id, productId: item.production_sku_id, variantId: item.product_variant_id, sku: item.variant_code || item.sku_code,
        name: item.sku_name, price: Number(item.unit_price || 0), qty: Number(item.quantity || 0), lineTotal: Number(item.line_total || 0),
        selectedOptions: (item.sales_order_item_option || []).map((option) => ({ groupName: option.option_group_name, optionName: option.option_value_name })),
      })),
    })));
  }

  async function loadInventoryUsage() {
    const { data, error } = await supabase.rpc("get_inventory_production_usage");
    if (error) {
      console.error("Load inventory usage error:", error);
      setInventoryUsage([]);
      return;
    }
    setInventoryUsage((data || []).map((row) => ({
      id: row.inventory_sku_id,
      sku: row.sku_code || "",
      name: row.sku_name || "Inventory SKU",
      usage: Number(row.usage || 0),
      uom: row.recipe_uom || "",
    })));
  }

  useEffect(() => { if (user) { loadMasterData(); loadOrders(); loadInventoryUsage(); loadConfig(); } }, [user]);

  useEffect(() => {
    if (!user || isPublicOrder) return;

    const channel = supabase
      .channel("staff-sales-order-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_order" },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isPublicOrder]);


  if (isPublicOrder) return <PublicOrderPage />;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <AppShell user={user} page={page} setPage={setPage} onLogout={() => { setUser(null); setPage("dashboard"); }}>
      {page === "dashboard" && <Dashboard products={products} orders={orders} recipes={recipes} inventoryUsage={inventoryUsage} onNavigate={setPage} />}
      {page === "order" && <OrderTaking products={products} setProducts={setProducts} orders={orders} setOrders={setOrders} onNavigate={setPage} reloadOrders={loadOrders} />}
      {page === "orderHistory" && <OrderHistory orders={orders} setOrders={setOrders} products={products} setProducts={setProducts} reloadOrders={loadOrders} />}
      {page === "inventory" && <Inventory products={products} setProducts={setProducts} configOptions={configOptions} />}
      {page === "recipe" && <RecipeManagement products={products} recipes={recipes} setRecipes={setRecipes} setProducts={setProducts} />}
      {page === "production" && <Production products={products} setProducts={setProducts} recipes={recipes} configOptions={configOptions} />}
      {page === "config" && <Config options={configOptions} reloadConfig={loadConfig} />}
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
