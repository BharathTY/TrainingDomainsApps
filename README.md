# Practice apps

One Vite + React codebase hosts several automation-practice apps. Each app has its own base path, login, and session cookie.

```bash
npm install
npx playwright install chromium
npm run dev
```

The UI is at http://localhost:5173/. The API listens on port 3000 and Vite proxies `/api`, `/*/secure`, and `/*/frames` to it.

`npm run build` then `npm start` serves the built UI and the API on port 3000.

## URLs

| Path | App |
|---|---|
| `/` | Launcher |
| `/schoolmanagement` | School Management (login). After sign-in, `/schoolmanagement/dashboard`. |
| `/crm`, `/erp`, `/retail`, `/ecommerce`, `/assets`, `/hospital`, `/banking`, `/inventory` | Stub apps. The launcher shows Coming soon until `enabled` is true. The login page is still reachable. |

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

Each other app shows `admin` / `admin123` on its login page.

Basic Auth for `/<app>/secure/*` is `admin` / `admin@123` (the browser popup, separate from the login form).

## Data

Sign-in, logout, reset, Basic Auth, and frames are handled by Express. Users and sessions are stored in Postgres database `trainingDomainApps`, one schema per app. `POST /api/<appId>/reset` re-seeds only that app's users.

School Management screens still read and write the in-browser mock store. Reloading the page restores the school seed. The session cookie survives a reload.

## Checks

```bash
npm run typecheck
npm run eslint
npm run html
npm run test:e2e
```
