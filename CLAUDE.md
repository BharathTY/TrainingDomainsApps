# Practice apps

Every app must follow docs/AUTOMATION_KIT.md. /schoolmanagement is the reference implementation.

React 18, TypeScript strict, Vite, Tailwind CSS, and shadcn/ui. Several practice apps live in one repo. The launcher is `/`. Each app is a code-split route under its base path.

## How to add a new app

1. Add a folder `src/apps/<id>/` with `routes.tsx`, `theme.ts`, and `demo-users.ts`.
2. Add a folder `server/apps/<id>/` with `routes.ts` and `seed.ts`.
3. Add `public/frames/<id>/index.html` and `public/favicons/<id>.svg`.
4. Add one entry to `src/apps/meta.ts` and one `loadRoutes` line in `src/apps/registry.ts`.
5. Import `register` from `server/apps/<id>/routes.ts` in `server/index.ts`.

`enabled: false` keeps the launcher card disabled ("Coming soon"). The route and the API still exist so the app can be opened directly.

Do not hardcode `/students` or `/api/students`. Use `appPath("students")` or a relative `Link`. `api()` prefixes `/api/<appId>` from the active app. That includes navigations, redirects, new-tab URLs, downloads, and iframes.

## School Management

Feature code lives under `src/apps/schoolmanagement/features/<module>/{api,components,pages,schemas,types}`. The shell is `src/apps/schoolmanagement/shell`. Shared kit components live in `src/shared`. Primitives live in `src/components/ui`.

- Screen data goes through `src/shared/lib/api-client.ts`. In the browser, MSW (`src/apps/schoolmanagement/mocks`) answers `/api/schoolmanagement/...` except login, session, logout, and reset, which Express owns.
- Roles are `admin`, `teacher`, `parent`, and `student`. The permission matrix is only in `src/apps/schoolmanagement/config/permissions.ts`.
- UI state (sidebar, theme) is Zustand in `src/apps/schoolmanagement/stores/ui-store.ts` (`sms-ui`). The signed-in role comes from the session cookie `sid_schoolmanagement`.
- List screens use `DataTable`. Short forms use `FormDrawer`. Deletes use `ConfirmDialog` and set `deletedAt`.
- Required fields are marked with `*` and rejected by Zod. Search boxes stay optional.
- Module paths in the permission table are segments (`students`), not absolute URLs.

## StockWise IMS (`/inventory`)

The launcher card is enabled. Screens live under `src/apps/inventory` and use the same plum shell as School Management.

- Items, categories, suppliers, warehouses, stock documents, purchase orders, cycle counts, calendar, and reports are backed by Postgres schema `inventory` in database `trainingDomainApps`.
- `/inventory/secure/stock-valuation` is Basic Auth (`admin` / `admin@123`) and lists warehouse value.
- Demo users: `admin` / `admin123`, `manager` / `manager123`, `keeper` / `keeper123`, `purchase` / `purchase123`.

## ERP (`/erp`)

The launcher card is enabled. Finance, HR, and operations with connected workflows.

- Schema `erp` in `trainingDomainApps`: chart of accounts, journals (balanced double-entry, post/reverse), AP/AR, payroll, employees, procurement, inventory ledger, sales, expenses, assets, approvals, audit logs.
- Workflows: procure-to-pay, hire-to-retire, order-to-cash, record-to-report, expense-to-reimbursement.
- RBAC with 12 roles; permissions enforced on the Express API.
- `/erp/secure/trial-balance` is Basic Auth (`admin` / `admin@123`).
- Demo users include `sysadmin` / `admin123`, `finmgr` / `finmgr123`, `hrmgr` / `hrmgr123`, `employee` / `employee123`, `auditor` / `auditor123` (full list on the login page).
- Tax and statutory payroll figures are demo-configurable only — not claimed as jurisdiction-compliant.

## Pulse CRM (`/crm`)

The launcher card is enabled. Sales CRM for automation training (synthetic data only).

- Schema `crm` in `trainingDomainApps`: leads, contacts, opportunities, activities, interaction notes, notifications, activity logs.
- Modules: dashboard, leads, contacts, follow-ups, calendar, pipeline, reports, Practice Lab, settings.
- RBAC: `admin`, `salesmgr`, `salesrep`, `readonly` — enforced on the Express API; sales reps are scoped to their own records.
- `/crm/secure/account-vault`, `/crm/secure/export-room` are Basic Auth (`admin` / `admin@123`).
- Frames under `/crm/frames/*` (help guide, sales process, support, activity summary, nested host).
- Demo users: `admin` / `admin123`, `salesmgr` / `salesmgr123`, `rep1` / `rep1123`, `rep2` / `rep2123`, `viewer` / `viewer123`.
- Scenario notes: `docs/CRM.md`.

## Retail RMS (`/retail`)

The launcher card is enabled. Point of sale and store operations for automation training (synthetic data only).

- Schema `retail` in `trainingDomainApps`: stores, categories, products, store_stock, stock_movements, suppliers, purchase orders, sales/returns, promotions, customers, activity logs.
- Modules: dashboard, POS, products, inventory, suppliers, purchase orders, sales/returns, promotions, customers, reports, Practice Lab, settings.
- RBAC: `admin`, `storemgr`, `cashier`, `inventory`, `purchaser` — enforced on the Express API.
- `/retail/secure/cash-drawer`, `/retail/secure/supplier-contracts` are Basic Auth (`admin` / `admin@123`).
- Frames under `/retail/frames/*` (supplier portal, inventory preview, support widget, nested host).
- Demo users: `admin` / `admin123`, `storemgr` / `storemgr123`, `cashier` / `cashier123`, `inventory` / `inventory123`, `purchaser` / `purchaser123`.
- Scenario notes: `docs/RETAIL.md`.

## Demo National Bank (`/banking`)

The launcher card is enabled. Internet banking for automation training (synthetic data only).

- Schema `banking` in `trainingDomainApps`: customers, accounts, beneficiaries, transactions, transfers, scheduled payments, announcements, notifications, login activity, profile settings, activity logs.
- Modules: dashboard, accounts, transfers, statements, beneficiaries, scheduled payments, profile, Practice Lab, settings.
- RBAC: `admin`, `customer`, `teller`, `manager` — enforced on the Express API.
- `/banking/secure/vault-statements`, `/banking/secure/wire-room` are Basic Auth (`admin` / `admin@123`).
- Frames under `/banking/frames/*` (help center, txn summary, education, account panel, nested host).
- Demo users: `admin` / `admin123`, `priya` / `priya123`, `arjun` / `arjun123`, `teller` / `teller123`, `manager` / `manager123`.
- Scenario notes: `docs/BANKING.md`.

## Asset EAM (`/assets`)

The launcher card is enabled. Enterprise asset register and maintenance for automation training (synthetic data only).

- Schema `assets` in `trainingDomainApps`: departments, locations, employees, categories, vendors, assets, assignments, work orders, work order history, activity logs.
- Modules: dashboard, asset register, categories, assignments/transfers, maintenance work orders, calendar, vendors, reports, Practice Lab, settings.
- RBAC: `admin`, `assetmgr`, `technician`, `deptmgr`, `employee` — enforced on the Express API.
- `/assets/secure/asset-register`, `/assets/secure/maintenance-docs`, `/assets/secure/audit-vault` are Basic Auth (`admin` / `admin@123`).
- Frames under `/assets/frames/*` (embedded asset info + nested parts catalogue).
- Demo users: `admin` / `admin123`, `assetmgr` / `assetmgr123`, `tech` / `tech123`, `deptmgr` / `deptmgr123`, `employee` / `employee123`.
- Scenario notes: `docs/ASSETS.md`. Uses Express (repo standard), not Spring Boot.

## MediCare HMS (`/hospital`)

The launcher card is enabled. Hospital operations for automation training (synthetic data only).

- Schema `hospital` in `trainingDomainApps`: departments, doctors, patients, wards, beds, appointments, admissions, staff, invoices, activity logs.
- Modules: dashboard, doctors, patients, wards/beds, appointments, calendar, admissions/discharges, staff, billing, reports, Automation Training Lab, settings.
- RBAC: `admin`, `doctor`, `receptionist`, `wardmgr`, `billing`, `student` — enforced on the Express API.
- `/hospital/secure/medical-records`, `/hospital/secure/billing-vault`, `/hospital/secure/reports-vault` are Basic Auth (`admin` / `admin@123`).
- Frames under `/hospital/frames/*` (patient summary, nested doctor/appointment iframes, billing form, unavailable).
- Demo users: `admin` / `admin123`, `doctor` / `doctor123`, `receptionist` / `reception123`, `wardmgr` / `ward123`, `billing` / `billing123`, `student` / `student123`.
- Scenario catalogue and E2E workflow notes: `docs/HOSPITAL.md`.

## Sessions and server

- Cookie name `sid_<appId>`, HTTP-only, `SameSite=Lax`, set for both `/<appId>` and `/api/<appId>`.
- `POST /api/<appId>/reset` re-seeds that app's users in Postgres database `trainingDomainApps`, schema `<appId>`.
- Basic Auth: `/<appId>/secure/*` with the registry credentials (default `admin` / `admin@123`).
- Frames: `/<appId>/frames/*` from `public/frames/<id>`.
- `npm run dev` runs Express on 3000 and Vite on 5173. `npm start` serves `dist` from Express.

## Shared locator markup

Kit components in `src/shared` keep stable `data-testid` values (`login-form`, `data-table`, `form-drawer`, `confirm-dialog`, `modal`, `native-dialog`, `tabs`, `date-picker`, `calendar-view`, `toast`, `otp-modal`, `reauth-modal`, `session-timeout`, `cookie-banner`, `file-upload`, `app-frame`, `child-window-picker`, `practice-table`). `AppFrame`, `openPopup` / `openAppPopup`, `ChildWindowPicker`, and `PracticePage` take labels, paths, and rows as props. Domain pages can differ. Level 4 ids that include a record id stay dynamic.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run eslint
npm run html
npm run test:e2e
```
