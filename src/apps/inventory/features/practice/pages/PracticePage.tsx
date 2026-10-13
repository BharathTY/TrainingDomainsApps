import { PracticePage as PracticeSheet, type PracticeRow } from "@/shared/PracticePage"

const rows: PracticeRow[] = [
  { feature: "Login", screen: "login", level: 1, exercise: "Sign in as Admin, Warehouse Manager, Store Keeper, or Purchase Officer." },
  { feature: "Dashboard", screen: "dashboard", level: 1, exercise: "Read stock value, low-stock count, near-expiry count, and the warehouse table." },
  { feature: "Items", screen: "items", level: 2, exercise: "Search an SKU, scan a barcode, and open the item." },
  { feature: "Item tabs", screen: "items", level: 3, exercise: "Open Details, Stock by warehouse, Batches, Movements, and Suppliers." },
  { feature: "Barcode label", screen: "items", level: 4, exercise: "Print a label from the popup and the label frame." },
  { feature: "Categories", screen: "categories", level: 2, exercise: "Expand the category tree and add a child category." },
  { feature: "Suppliers", screen: "suppliers", level: 3, exercise: "Wait for the delayed supplier catalogue frame." },
  { feature: "Warehouses", screen: "warehouses", level: 4, exercise: "Click a rack on the map and wait for the bin list." },
  { feature: "Stock in", screen: "grn", level: 4, exercise: "Choose an item from the child window and reject an expiry on or before manufacture." },
  { feature: "Stock out", screen: "issues", level: 2, exercise: "Issue stock and read the reorder alert when quantity falls to the reorder level." },
  { feature: "Transfers", screen: "transfers", level: 3, exercise: "Walk the transfer wizard between two warehouses." },
  { feature: "Adjustments", screen: "adjustments", level: 3, exercise: "Confirm a count, re-enter the password for a write-off, and use code 123456 for a bulk adjustment." },
  { feature: "Purchase orders", screen: "orders", level: 2, exercise: "Create an order from a reorder suggestion with an expected date." },
  { feature: "Cycle count", screen: "counts", level: 2, exercise: "Schedule a count on the calendar." },
  { feature: "Calendar", screen: "calendar", level: 2, exercise: "Read cycle counts, expiries, and expected deliveries for the month." },
  { feature: "Reports", screen: "reports", level: 3, exercise: "Filter the ledger as-on date, compare FIFO and weighted average, and export CSV." },
  { feature: "Secure valuation", screen: "secure/stock-valuation", level: 3, exercise: "Open the valuation page and sign in with admin / admin@123." },
  { feature: "Reset demo data", screen: "settings", level: 1, exercise: "Reset StockWise data and confirm the dashboard counts return." },
]

export function PracticePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PracticeSheet title="Practice" rows={rows} />
    </div>
  )
}
