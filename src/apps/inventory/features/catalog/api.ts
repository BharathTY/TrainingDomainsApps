import { api } from "@/shared/lib/api-client"

export type ItemRow = {
  id: string
  sku: string
  name: string
  barcode: string
  categoryName: string
  supplierName: string
  uom: string
  reorderLevel: number
  unitCost: number
  onHand: number
}

export type Named = { id: string; name: string }

export function listItems() {
  return api<ItemRow[]>("/api/items")
}

export function listCategories() {
  return api<{ id: string; name: string; parent_id: string | null }[]>("/api/categories")
}

export function listSuppliers() {
  return api<{ id: string; name: string; city: string; phone: string; email: string }[]>("/api/suppliers")
}

export function listWarehouses() {
  return api<{ id: string; name: string; city: string; value: number }[]>("/api/warehouses")
}

export function listReasonCodes() {
  return api<{ code: string; label: string }[]>("/api/reason-codes")
}
