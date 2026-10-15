# MediCare HMS — setup and automation scenarios

Synthetic hospital training app. Not for clinical use.

## Start

```bash
npm install
npm run dev
```

- UI: http://localhost:5173/hospital
- API: http://localhost:3000/api/hospital
- OpenAPI sketch: http://localhost:3000/api/hospital/v1/openapi.json
- Reset seed: `POST /api/hospital/reset` (Settings → Reset training data)

Basic Auth vaults (`admin` / `admin@123`):

- `/hospital/secure/medical-records`
- `/hospital/secure/billing-vault`
- `/hospital/secure/reports-vault`

## Functional scenarios (15+)

| ID | Title | Level | Objective |
|---|---|---|---|
| F01 | Login RBAC | Beginner | Sign in as each role; sidebar modules change |
| F02 | Dashboard KPIs | Beginner | Read beds, appointments, admissions from live API |
| F03 | Register patient | Intermediate | Create patient; duplicate phone rejected |
| F04 | Edit doctor | Intermediate | Update specialization and fee |
| F05 | Deactivate doctor | Intermediate | Set employment status inactive |
| F06 | Schedule appointment | Intermediate | Book slot; conflict on overlap |
| F07 | Confirm appointment | Intermediate | Status → Confirmed |
| F08 | Cancel via prompt | Advanced | confirm + prompt reason |
| F09 | Admit patient | Advanced | Assign free bed; bed becomes occupied |
| F10 | Discharge patient | Advanced | Bed returns to available |
| F11 | Transfer bed | Advanced | Confirm dialog; occupancy updates |
| F12 | Calendar views | Intermediate | Month/week/day navigation |
| F13 | Billing invoice | Intermediate | Create/pay synthetic invoice |
| F14 | CSV export | Beginner | Export doctors or patients |
| F15 | Reset training data | Beginner | Settings reset restores seed |

## Integration scenarios (15+)

| ID | Title | Checks |
|---|---|---|
| I01 | `GET /dashboard` | KPI counts after seed |
| I02 | `POST /patients` | 201 + patientNo |
| I03 | Duplicate patient phone | 400 |
| I04 | `POST /appointments` | Creates scheduled row |
| I05 | Overlapping appointment | 409/400 conflict |
| I06 | `POST /admissions` | Occupies bed |
| I07 | Double-book bed | Rejected |
| I08 | Discharge | Bed available |
| I09 | Doctors list pagination | page/pageSize |
| I10 | Patients search `q` | Filters by name/id |
| I11 | Appointment status transition | confirm/check-in/complete |
| I12 | Soft delete doctor | deletedAt set; list excludes |
| I13 | Permissions: student cannot create patient | 403 |
| I14 | Session cookie | `/session` after login |
| I15 | Reset | Counts return to seed baseline |

## E2E workflows (15+)

| ID | Title | Level |
|---|---|---|
| E01 | Workflow A — register + schedule + confirm | Advanced |
| E02 | Workflow B — admit + discharge | Advanced |
| E03 | Workflow C — cancel with prompt | Advanced |
| E04 | Workflow D — Basic Auth medical records | Advanced |
| E05 | Workflow E — new tab + nested frames | Advanced |
| E06 | In-app profile tabs | Intermediate |
| E07 | HTML dialog schedule demo | Intermediate |
| E08 | JS alert/confirm/prompt lab | Intermediate |
| E09 | Billing form inside iframe | Intermediate |
| E10 | Unavailable frame toggle | Intermediate |
| E11 | Delayed popup | Intermediate |
| E12 | Unauthorized role navigation | Intermediate |
| E13 | Calendar slot create | Advanced |
| E14 | Bulk delete training rows | Intermediate |
| E15 | Secure reports vault Basic Auth | Advanced |

Suggested locators: `data-testid` on nav/actions, label/role for forms, stable row `data-testid` like `view-<id>`, table caption + headers for column axes.

Browser notes: native Basic Auth and `window.prompt` behavior differ by browser/driver; cancel-prompt and blocked-popup cases are environment-specific.
