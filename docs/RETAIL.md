# Retail Management System (Retail RMS)

Synthetic retail training app at `/retail`. Not for production commerce.

## Start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173/retail
- API: http://localhost:3000/api/retail
- OpenAPI: http://localhost:3000/api/retail/v1/openapi.json
- Reset: Settings → Reset training data or `POST /api/retail/reset`

## Demo users

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `storemgr` | `storemgr123` | Store Manager |
| `cashier` | `cashier123` | Cashier |
| `inventory` | `inventory123` | Inventory Clerk |
| `purchaser` | `purchaser123` | Purchaser |

Basic Auth (`admin` / `admin@123`):

- `/retail/secure/cash-drawer`
- `/retail/secure/supplier-contracts`

## Modules

Dashboard, POS checkout, products, inventory (adjust/transfer), suppliers, purchase orders (receive), sales & returns, promotions/coupons, customers/loyalty, reports, Practice Lab.

Seed: ~80 products across 3 stores, suppliers, POs, sales, promotions, customers.

## Automation notes

Practice Lab includes HTML element lab, iframes (`/retail/frames/*`), side panels, and a collapsible native `alert`/`confirm`/`prompt` section for Selenium/Playwright. Product business flows use side panels; inventory has one labeled training prompt path.
