# Pulse CRM

Synthetic CRM training app at `/crm`. Not for production sales operations.

## Start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173/crm
- API: http://localhost:3000/api/crm
- OpenAPI: http://localhost:3000/api/crm/v1/openapi.json
- Reset: Settings → Reset training data or `POST /api/crm/reset`

## Demo users

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `salesmgr` | `salesmgr123` | Sales Manager |
| `rep1` | `rep1123` | Sales Representative |
| `rep2` | `rep2123` | Sales Representative |
| `viewer` | `viewer123` | Read-Only User |

Basic Auth (`admin` / `admin@123`):

- `/crm/secure/account-vault`
- `/crm/secure/export-room`

## Modules

Dashboard, leads (CRUD, bulk delete, convert), contacts (duplicate warning), follow-ups/activities (conflict detection), calendar (month/week/day/agenda), sales pipeline, reports, Practice Lab, settings.

Seed: 36 leads, 24 contacts, 14 opportunities, 28 activities.

## Frames

`/crm/frames/*` — help guide, sales process, support, activity summary, nested host.

## Automation notes

Practice Lab lists E2E scenarios from login through pipeline close and Basic Auth. Sales reps only see their own records.
