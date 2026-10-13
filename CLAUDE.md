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
