# MHA Web POS v11 — Futuristic React Prototype

## Run in VS Code

1. Extract/open this folder in VS Code.
2. Open the integrated terminal.
3. Run:
   npm install
4. Start the development server:
   npm run dev
5. Open the localhost URL shown by Vite.

## Demo login
- Username: manager
- Password: 1234

The prototype uses only frontend mock data. Any non-empty username/password can log in.

## Included modules
- Login
- Dashboard
  - Sold SKU / Remaining SKU
  - Total Sale / Gross Sale
  - Low/out-of-stock inventory alert
  - 1 week / 1 month sold SKU chart
- Order Taking
  - Product/category filtering
  - Search
  - Cart quantity controls
  - Demo tax/payment
  - Payment reduces inventory and updates sold quantity
- Inventory
  - Add / edit / delete SKU
  - SKU detail with Order UOM / Inventory UOM / Recipe UOM
  - Record Purchase / Add Stock with purchase history
  - Sortable table headers (ascending / descending)
  - SKU stock status and low/out-of-stock indicators
- Production SKU
  - Produced / sold / remaining metrics
  - Record additional production quantity

## Notes
This is a frontend prototype intended for UI/flow demonstration. For production, connect login, orders, products, inventory and production to real APIs/database services.

## Verify inventory logic
Run `npm test` to check sorting, SKU validation, and purchase stock recording.


## Recipe Management and UOM Conversion
- Inventory SKU setup is separate from Product SKU production.
- Inventory SKU conversion fields: Order UOM, Inventory UOM, Recipe UOM, Order-to-Inventory quantity, Inventory-to-Recipe quantity.
- Direct Order-to-Recipe factor is calculated automatically. Example: 1 carton = 5 packs and 1 pack = 500 g, therefore 1 carton = 2,500 g.
- Record Purchase can be entered using Order UOM or Inventory UOM and updates inventory stock in Inventory UOM.
- Recipe Management links Product SKUs to one or more Inventory SKUs with usage quantity in Recipe UOM.
- Production SKU uses the saved recipe and automatically deducts Inventory stock.
- Production is blocked when a recipe is missing or ingredient stock is insufficient.

## v4 Production SKU Management
- Add, edit and delete Product SKU
- Tile/List view toggle
- Compact recipe status on each product
- Click Recipe Configured to view ingredient detail in a small modal
- Newly created Product SKUs automatically appear in Recipe Management Product Recipe Setup
- Product deletion is blocked when a recipe or production history exists

## Order Taking / Pay Later / Order History
- Direct Pay creates a Completed order and updates sold/remaining Product SKU quantities.
- Pay Later creates a Pending order without updating sold/remaining Product SKU quantities.
- Order History shows Order Date, Order ID, clickable Order Detail, Subtotal, Tax, Grand Total and Payment Status.
- Pending status is clickable and opens a payment confirmation modal.
- Completing a pending payment updates the order to Completed and applies the product sale once.
- Payment completion is blocked if current Product SKU stock is insufficient.


## Dashboard v9
- Sold SKU
- Daily Net Sales (completed payments today)
- Monthly Net Sales (day 1 through today)
- Top 5 Product SKU Sold
- Top 5 Inventory SKU Usage based on production recipe consumption
- Inventory SKU low/out-of-stock alert
- Product SKU low/out-of-stock alert


## v11 Futuristic UI Refresh
- Aurora purple/blue design system with a dark navigation shell.
- Glass-style dashboard, POS, cart, table, and modal surfaces.
- HanaAzz Enterprise brand treatment and System Online indicator.
- Existing POS, inventory, recipe, production, Pay Later, Order History and dashboard business logic remains unchanged.


## v1.2.0 — SKU Variations & Recipe Impact

- Production SKUs support optional Size / Variant / Flavour option groups.
- Each option can have a price adjustment.
- Option groups can be marked as required and/or recipe-impacting.
- Recipe Management supports Base Recipe plus variation Add/Replace ingredient changes.
- Production records use the selected variation recipe to deduct inventory.
- Order Taking saves selected options and calculates the final unit price.
