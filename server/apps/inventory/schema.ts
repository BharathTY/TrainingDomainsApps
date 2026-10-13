export const INVENTORY_TABLES = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS racks (
    id TEXT PRIMARY KEY,
    zone_id TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bins (
    id TEXT PRIMARY KEY,
    rack_id TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    barcode TEXT NOT NULL,
    category_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    uom TEXT NOT NULL,
    reorder_level INTEGER NOT NULL,
    unit_cost NUMERIC NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    batch_no TEXT NOT NULL,
    manufactured_on DATE NOT NULL,
    expires_on DATE NOT NULL,
    qty INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS stock_balances (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    UNIQUE (item_id, warehouse_id)
  )`,
  `CREATE TABLE IF NOT EXISTS stock_ledger (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    qty INTEGER NOT NULL,
    occurred_on DATE NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reason_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    supplier_id TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    status TEXT NOT NULL,
    expected_on DATE,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS po_lines (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS grns (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT,
    warehouse_id TEXT NOT NULL,
    received_on DATE NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS grn_lines (
    id TEXT PRIMARY KEY,
    grn_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    batch_id TEXT,
    qty INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    issued_on DATE NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    from_warehouse_id TEXT NOT NULL,
    to_warehouse_id TEXT NOT NULL,
    status TEXT NOT NULL,
    moved_on DATE,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS transfer_lines (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS adjustments (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    qty INTEGER NOT NULL,
    reason_code TEXT NOT NULL,
    adjusted_on DATE NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cycle_counts (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    scheduled_on DATE NOT NULL,
    status TEXT NOT NULL,
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cycle_lines (
    id TEXT PRIMARY KEY,
    cycle_count_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    expected_qty INTEGER NOT NULL,
    counted_qty INTEGER
  )`,
]

export const INVENTORY_CLEAR = [
  "cycle_lines",
  "cycle_counts",
  "adjustments",
  "transfer_lines",
  "transfers",
  "issues",
  "grn_lines",
  "grns",
  "po_lines",
  "purchase_orders",
  "reason_codes",
  "stock_ledger",
  "stock_balances",
  "batches",
  "bins",
  "racks",
  "zones",
  "items",
  "suppliers",
  "categories",
  "warehouses",
]
