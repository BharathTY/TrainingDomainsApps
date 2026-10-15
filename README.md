# Practice apps

One Vite + React codebase hosts several automation-practice apps. Each app has its own base path, login, and session cookie.

```bash
npm install
npx playwright install chromium
npm run dev
```

The UI is at http://localhost:5173/. The API listens on port 3000 and Vite proxies `/api`, `/*/secure`, and `/*/frames` to it.

`npm run build` then `npm start` serves the built UI and the API on port 3000.

## Docker

The image serves the built UI and the API on port 3000. Postgres is a separate container. The app creates one schema per app on first start. The database `trainingDomainApps` must already exist.

```bash
docker compose up --build -d
```

Open http://localhost:3000/. `GET /health` returns `{ "ok": true }` after the process is listening.

To point the app at a Postgres instance you already run:

```bash
docker build -t domain-apps .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/trainingDomainApps \
  domain-apps
```

`HOST` must be reachable from the container. On Docker Desktop, a database on the host machine is `host.docker.internal`, not `127.0.0.1`.

Stop the stack with `docker compose down`. Add `-v` only when you want to delete the Postgres volume and reseed on the next start.

## URLs

| Path | App |
|---|---|
| `/` | Launcher |
| `/schoolmanagement` | School Management (login). After sign-in, `/schoolmanagement/dashboard`. |
| `/inventory` | StockWise IMS (login). After sign-in, `/inventory/dashboard`. |
| `/erp` | ERP (login). After sign-in, `/erp/dashboard`. Finance, HR, operations, and cross-module workflows. |
| `/hospital` | MediCare HMS (login). After sign-in, `/hospital/dashboard`. Doctors, patients, wards, appointments, admissions, billing, Training Lab. |
| `/assets` | Asset EAM (login). After sign-in, `/assets/dashboard`. Register, assignments, maintenance, vendors, Practice Lab. |
| `/retail` | Retail RMS (login). After sign-in, `/retail/dashboard`. POS, products, inventory, suppliers, POs, sales, promotions, Practice Lab. |
| `/banking` | Demo National Bank (login). After sign-in, `/banking/dashboard`. Accounts, transfers, statements, beneficiaries, scheduled payments, Practice Lab. |
| `/crm` | Pulse CRM (login). After sign-in, `/crm/dashboard`. Leads, contacts, follow-ups, calendar, pipeline, reports, Practice Lab. |
| Ecommerce card | Opens https://www.shoppersstack.com/. `/ecommerce` is still the local login stub. |

`/<app>/login` is the same login page. A protected URL without a session redirects to `/<app>/login?returnUrl=<path>`.

Old School Management bookmarks redirect to the new paths. The list is `src/shell/legacy-redirects.ts`.

## Demo sign-in

School Management:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `teacher` | `teacher123` | Teacher |
| `parent` | `parent123` | Parent |
| `student` | `student123` | Student |

StockWise IMS (`/inventory`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `manager` | `manager123` | Warehouse Manager |
| `keeper` | `keeper123` | Store Keeper |
| `purchase` | `purchase123` | Purchase Officer |

ERP (`/erp`):

| Username | Password | Role |
|---|---|---|
| `sysadmin` | `admin123` | System Administrator |
| `orgadmin` | `orgadmin123` | Organization Administrator |
| `finmgr` | `finmgr123` | Finance Manager |
| `accountant` | `accountant123` | Accountant |
| `hrmgr` | `hrmgr123` | HR Manager |
| `hrexec` | `hrexec123` | HR Executive |
| `deptmgr` | `deptmgr123` | Department Manager |
| `procmgr` | `procmgr123` | Procurement Manager |
| `whmgr` | `whmgr123` | Warehouse Manager |
| `salesmgr` | `salesmgr123` | Sales Manager |
| `employee` | `employee123` | Employee |
| `auditor` | `auditor123` | Auditor / Read-Only |

MediCare HMS (`/hospital`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `doctor` | `doctor123` | Doctor |
| `receptionist` | `reception123` | Receptionist |
| `wardmgr` | `ward123` | Ward Manager |
| `billing` | `billing123` | Billing Staff |
| `student` | `student123` | Training Student |

Asset EAM (`/assets`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `assetmgr` | `assetmgr123` | Asset Manager |
| `tech` | `tech123` | Maintenance Technician |
| `deptmgr` | `deptmgr123` | Department Manager |
| `employee` | `employee123` | Employee |

Retail RMS (`/retail`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `storemgr` | `storemgr123` | Store Manager |
| `cashier` | `cashier123` | Cashier |
| `inventory` | `inventory123` | Inventory Clerk |
| `purchaser` | `purchaser123` | Purchaser |

Demo National Bank (`/banking`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `priya` | `priya123` | Customer |
| `arjun` | `arjun123` | Customer |
| `teller` | `teller123` | Teller |
| `manager` | `manager123` | Branch Manager |

Pulse CRM (`/crm`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `salesmgr` | `salesmgr123` | Sales Manager |
| `rep1` | `rep1123` | Sales Representative |
| `rep2` | `rep2123` | Sales Representative |
| `viewer` | `viewer123` | Read-Only User |

Each remaining stub app shows `admin` / `admin123` on its login page.

Basic Auth for `/<app>/secure/*` is `admin` / `admin@123` (the browser popup, separate from the login form).

## Data

Sign-in, logout, reset, Basic Auth, and frames are handled by Express. Users and sessions are stored in Postgres database `trainingDomainApps`, one schema per app. `POST /api/<appId>/reset` re-seeds only that app's users.

School Management screens still read and write the in-browser mock store. Reloading the page restores the school seed. The session cookie survives a reload.

StockWise items, warehouses, batches, and the stock ledger are tables in the `inventory` schema of `trainingDomainApps`. `POST /api/inventory/reset` restores that seed and the four demo users.

ERP finance, HR, procurement, inventory, sales, and workflow tables live in the `erp` schema. `POST /api/erp/reset` restores that seed and the twelve demo users.

MediCare HMS doctors, patients, wards, beds, appointments, admissions, and invoices live in the `hospital` schema. `POST /api/hospital/reset` restores that seed and the six demo users. OpenAPI sketch: `GET /api/hospital/v1/openapi.json`. See `docs/HOSPITAL.md` for automation scenarios.

Asset EAM assets, categories, assignments, work orders, and vendors live in the `assets` schema. `POST /api/assets/reset` restores that seed and the five demo users. OpenAPI sketch: `GET /api/assets/v1/openapi.json`. See `docs/ASSETS.md`.

Retail RMS products, store stock, POS sales, POs, promotions, and customers live in the `retail` schema. `POST /api/retail/reset` restores that seed and the five demo users. OpenAPI sketch: `GET /api/retail/v1/openapi.json`. See `docs/RETAIL.md`.

Demo National Bank accounts, transfers, statements, beneficiaries, and scheduled payments live in the `banking` schema. `POST /api/banking/reset` restores that seed and the five demo users. OpenAPI sketch: `GET /api/banking/v1/openapi.json`. See `docs/BANKING.md`.

Pulse CRM leads, contacts, opportunities, and activities live in the `crm` schema. `POST /api/crm/reset` restores that seed and the five demo users. OpenAPI sketch: `GET /api/crm/v1/openapi.json`. See `docs/CRM.md`.

## Checks

```bash
npm run typecheck
npm run eslint
npm run html
npm run test:e2e
```
