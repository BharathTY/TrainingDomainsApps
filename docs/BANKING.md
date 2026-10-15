# Demo National Bank

Synthetic internet-banking training app at `/banking`. Not a real financial institution.

## Start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173/banking
- API: http://localhost:3000/api/banking
- OpenAPI: http://localhost:3000/api/banking/v1/openapi.json
- Reset: Settings → Reset training data or `POST /api/banking/reset`

## Demo users

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `priya` | `priya123` | Customer (CIF10001) |
| `arjun` | `arjun123` | Customer (CIF10002) |
| `teller` | `teller123` | Teller |
| `manager` | `manager123` | Branch Manager |

Basic Auth (`admin` / `admin@123`):

- `/banking/secure/vault-statements`
- `/banking/secure/wire-room`

## Modules

Dashboard, accounts (mask/show numbers, nicknames, favorites), fund transfers (own/internal/external, schedule, re-auth ≥ ₹50,000, failure/timeout simulation, receipts), statements (period filters, CSV, print tab), beneficiaries, scheduled payments, profile/settings, Practice Lab.

## Business rules (demo)

- Daily transfer limit: ₹1,00,000
- Re-authentication required at or above ₹50,000
- Transfers update balances and write debit/credit ledger rows
- Idempotency via `X-Idempotency-Key` / `idempotencyKey`
- Customers only see their own accounts; admin/teller/manager can see broader data

## Frames

`/banking/frames/*` — help center, transaction summary, education, account panel, nested host, filter frame.

## Automation notes

Practice Lab lists E2E scenarios (login → transfer → statement → frames → Basic Auth). Session timeout warning appears after 10 minutes of idle time in the shell.
