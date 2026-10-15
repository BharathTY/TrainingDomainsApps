import { useMutation, useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { asRows, loadLookups, loadPaged } from "@/apps/retail/features/catalog/api"
import { lookupOptions } from "@/apps/retail/features/shared/CrudResourcePage"
import { useUiStore } from "@/apps/retail/stores/ui-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmSheet } from "@/shared/ConfirmSheet"
import { ApiError, api } from "@/shared/lib/api-client"

type ProductRow = {
  id: string
  sku: string
  name: string
  sellingPrice: number
  quantity: number
  status: string
}

type CartLine = {
  productId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  available: number
}

type Receipt = {
  saleNo: string
  subtotal: number
  discount: number
  tax: number
  total: number
  change: number
  suspended?: boolean
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })

export function PosPage() {
  const storeId = useUiStore((state) => state.storeId)
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [couponCode, setCouponCode] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi" | "split">("cash")
  const [cashTendered, setCashTendered] = useState("")
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const lookups = useQuery({ queryKey: ["retail", "lookups"], queryFn: loadLookups, staleTime: 60_000 })
  const products = useQuery({
    queryKey: ["retail", "pos-products", storeId, search],
    queryFn: () =>
      loadPaged<ProductRow>("/api/products", {
        storeId: storeId || "store-1",
        page: 1,
        pageSize: 50,
        ...(search.trim() ? { q: search.trim() } : {}),
      }),
  })

  const productRows = useMemo(() => asRows(products.data ?? []), [products.data])

  const subtotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const stockWarnings = cart.filter((line) => line.quantity > line.available)

  const checkout = useMutation({
    mutationFn: (suspended: boolean) =>
      api<Receipt>("/api/pos/checkout", {
        method: "POST",
        body: JSON.stringify({
          storeId: storeId || "store-1",
          customerId: customerId || null,
          couponCode: couponCode.trim() || null,
          paymentMethod,
          cashTendered: paymentMethod === "cash" ? Number(cashTendered || 0) : undefined,
          suspended,
          lines: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        }),
      }),
    onSuccess: (data, suspended) => {
      toast.success(suspended ? "Sale suspended" : "Checkout complete")
      setReceipt({ ...data, suspended })
      if (!suspended) {
        setCart([])
        setCouponCode("")
        setCashTendered("")
      }
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Checkout failed"),
  })

  function addToCart(product: ProductRow) {
    if (product.status !== "active") {
      toast.error("Product is not active")
      return
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === product.id)
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.sellingPrice,
          quantity: 1,
          available: product.quantity,
        },
      ]
    })
  }

  function updateQty(productId: string, quantity: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    )
  }

  function runCheckout(suspended: boolean) {
    if (cart.length === 0) {
      toast.error("Cart is empty — add products before checkout")
      return
    }
    if (!suspended && stockWarnings.length > 0) {
      toast.error(`Insufficient stock for ${stockWarnings.map((l) => l.name).join(", ")}`)
      return
    }
    void checkout.mutate(suspended)
  }

  const customerOptions = lookupOptions(lookups.data?.customers)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Point of Sale"
        description={`Scan-style checkout with coupons, customers, and suspend. Active store: ${storeId || "store-1"}.`}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="pos-catalog-heading">
          <h2 id="pos-catalog-heading" className="text-sm font-semibold">
            Product search
          </h2>
          <div className="mt-2 grid gap-2">
            <Label htmlFor="pos-search">Search SKU, name, or barcode</Label>
            <Input
              id="pos-search"
              data-testid="pos-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter…"
              autoComplete="off"
            />
          </div>
          <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto text-sm" data-testid="pos-product-list">
            {productRows.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5">
                <div>
                  <p className="font-medium">
                    {product.sku} · {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inr.format(product.sellingPrice)} · Stock {product.quantity}
                  </p>
                </div>
                <Button type="button" size="sm" data-testid={`pos-add-${product.id}`} onClick={() => addToCart(product)}>
                  Add
                </Button>
              </li>
            ))}
            {productRows.length === 0 ? <li className="text-muted-foreground">No products match.</li> : null}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="pos-cart-heading">
          <h2 id="pos-cart-heading" className="text-sm font-semibold">
            Cart
          </h2>
          {stockWarnings.length > 0 ? (
            <p className="mt-2 text-sm text-amber-700" role="alert" data-testid="pos-stock-warning">
              Low stock: {stockWarnings.map((l) => `${l.name} (${l.available} available)`).join("; ")}
            </p>
          ) : null}
          <table className="mt-2 w-full text-sm" data-testid="pos-cart-table">
            <caption className="sr-only">Current cart lines</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Item
                </th>
                <th scope="col" className="text-right">
                  Qty
                </th>
                <th scope="col" className="text-right">
                  Line
                </th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.productId}>
                  <td className="py-1">{line.name}</td>
                  <td className="py-1 text-right">
                    <Input
                      className="ml-auto h-8 w-16 text-right"
                      type="number"
                      min={1}
                      value={line.quantity}
                      data-testid={`pos-qty-${line.productId}`}
                      onChange={(e) => updateQty(line.productId, Number(e.target.value))}
                    />
                  </td>
                  <td className="py-1 text-right">{inr.format(line.unitPrice * line.quantity)}</td>
                </tr>
              ))}
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-3 text-muted-foreground">
                    Cart is empty.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="mt-2 text-right font-medium">Subtotal: {inr.format(subtotal)}</p>

          <div className="mt-4 grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pos-coupon">Coupon code</Label>
              <Input id="pos-coupon" data-testid="pos-coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pos-customer">Customer</Label>
              <Select value={customerId || "__none"} onValueChange={(v) => setCustomerId(v === "__none" ? "" : v)}>
                <SelectTrigger id="pos-customer" data-testid="pos-customer">
                  <SelectValue placeholder="Walk-in customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Walk-in customer</SelectItem>
                  {customerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pos-payment">Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger id="pos-payment" data-testid="pos-payment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {paymentMethod === "cash" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="pos-cash">Cash tendered</Label>
                <Input
                  id="pos-cash"
                  type="number"
                  min={0}
                  data-testid="pos-cash-tendered"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" data-testid="pos-checkout" disabled={checkout.isPending} onClick={() => runCheckout(false)}>
              Checkout
            </Button>
            <Button type="button" variant="outline" data-testid="pos-suspend" disabled={checkout.isPending} onClick={() => runCheckout(true)}>
              Suspend sale
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCart([])}>
              Clear cart
            </Button>
          </div>
        </section>
      </div>

      <ConfirmSheet
        open={Boolean(receipt)}
        onOpenChange={(next) => {
          if (!next) setReceipt(null)
        }}
        title={receipt?.suspended ? "Sale suspended" : "Receipt summary"}
        description={
          receipt
            ? `${receipt.saleNo} · Subtotal ${inr.format(receipt.subtotal)} · Discount ${inr.format(receipt.discount)} · Tax ${inr.format(receipt.tax)} · Total ${inr.format(receipt.total)}${receipt.change ? ` · Change ${inr.format(receipt.change)}` : ""}`
            : ""
        }
        confirmLabel="Close receipt"
        onConfirm={async () => {
          setReceipt(null)
        }}
      />
    </div>
  )
}
