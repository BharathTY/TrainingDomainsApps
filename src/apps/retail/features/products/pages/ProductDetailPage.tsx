import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/retail/components/PageHeader"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type ProductDetail = {
  product: Record<string, unknown>
  stock: { store: string; quantity: number }[]
}

function field(row: Record<string, unknown>, camel: string, snake: string) {
  return String(row[camel] ?? row[snake] ?? "")
}

export function ProductDetailPage() {
  const { productId = "" } = useParams()
  const query = useQuery({
    queryKey: ["retail", "product", productId],
    queryFn: () => api<ProductDetail>(`/api/products/${productId}`),
    enabled: Boolean(productId),
  })
  const product = query.data?.product

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={product ? String(product.name ?? "Product") : "Product detail"}
        description="Catalog profile with per-store stock. Synthetic data only."
        actions={
          <>
            <Link className="text-sm underline" to={appPath("products")}>
              Back to products
            </Link>
            <a
              className="text-sm underline"
              href={appPath(`products/${productId}`)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-product-new-tab"
            >
              Open in new tab
            </a>
          </>
        }
      />
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading product…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Product not found.
        </p>
      ) : null}
      {product ? (
        <Tabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <dl className="grid gap-2 sm:grid-cols-2" data-testid="product-overview">
                  <div>
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd>{field(product, "sku", "sku")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Barcode</dt>
                    <dd>{field(product, "barcode", "barcode")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{field(product, "category", "category")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>{field(product, "status", "status")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Selling price</dt>
                    <dd>{field(product, "sellingPrice", "selling_price")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Reorder level</dt>
                    <dd>{field(product, "reorderLevel", "reorder_level")}</dd>
                  </div>
                </dl>
              ),
            },
            {
              id: "pricing",
              label: "Pricing & tax",
              content: (
                <dl className="grid gap-2 sm:grid-cols-2" data-testid="product-pricing">
                  <div>
                    <dt className="text-muted-foreground">Cost price</dt>
                    <dd>{field(product, "costPrice", "cost_price")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tax rate</dt>
                    <dd>{field(product, "taxRate", "tax_rate")}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Unit</dt>
                    <dd>{field(product, "unit", "unit")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Discount eligible</dt>
                    <dd>{String(product.discountEligible ?? product.discount_eligible ?? "")}</dd>
                  </div>
                </dl>
              ),
            },
            {
              id: "stock",
              label: "Stock by store",
              content: (
                <table className="w-full text-sm" data-testid="product-stock">
                  <caption className="sr-only">Store stock levels</caption>
                  <thead>
                    <tr>
                      <th scope="col">Store</th>
                      <th scope="col">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data?.stock ?? []).map((row) => (
                      <tr key={row.store}>
                        <td>{row.store}</td>
                        <td>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            },
            {
              id: "batch",
              label: "Batch / expiry",
              content: (
                <dl className="grid gap-2 sm:grid-cols-2" data-testid="product-batch">
                  <div>
                    <dt className="text-muted-foreground">Batch no.</dt>
                    <dd>{field(product, "batchNo", "batch_no") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Expiry</dt>
                    <dd>{String(field(product, "expiryDate", "expiry_date")).slice(0, 10) || "—"}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-muted-foreground">Description</dt>
                    <dd>{field(product, "description", "description") || "—"}</dd>
                  </div>
                </dl>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  )
}
