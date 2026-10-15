# Asset Register & Maintenance (Asset EAM)

Synthetic enterprise asset management training app at `/assets`. Not for production EAM.

**Stack note:** This repo uses React + Express + PostgreSQL (same as Hospital/ERP). Functional requirements from the Spring Boot brief are preserved.

## Start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173/assets
- API: http://localhost:3000/api/assets
- OpenAPI: http://localhost:3000/api/assets/v1/openapi.json
- Reset: `POST /api/assets/reset` or Settings → Reset training data

## Demo users

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `assetmgr` | `assetmgr123` | Asset Manager |
| `tech` | `tech123` | Maintenance Technician |
| `deptmgr` | `deptmgr123` | Department Manager |
| `employee` | `employee123` | Employee |

Basic Auth vaults (`admin` / `admin@123`):

- `/assets/secure/asset-register`
- `/assets/secure/maintenance-docs`
- `/assets/secure/audit-vault`

## Seed volume

≈60 assets, 12 vendors, 18 work orders, departments, locations, employees, categories.

## Functional scenarios (30+)

| ID | Title |
|---|---|
| F01–F05 | Login RBAC per role; dashboard KPIs |
| F06–F10 | Register/edit/search/retire asset; duplicate serial |
| F11–F14 | Categories create/deactivate; asset counts |
| F15–F18 | Assign, transfer (prompt), return; conflict on double assign |
| F19–F24 | Create WO; transitions; complete dialog; invalid transition rejected |
| F25–F27 | Vendor CRUD; duplicate email; contract dates |
| F28–F30 | Reports (inventory/warranty/depreciation); reset seed |

## Integration scenarios (20+)

`GET /dashboard`, `POST /register`, duplicate serial 400, assign conflict, WO status transitions, vendor duplicate email, permissions 403 for employee create, session cookie, reset baseline.

## E2E browser scenarios (20+)

Register→assign→maintain workflow; calendar month nav; new tabs; iframe parts form; JS alert/confirm/prompt; HTML dialog; Basic Auth vault; retire confirm cancel leaves data unchanged.

See Practice Lab at `/assets/practice` for the live catalogue.
