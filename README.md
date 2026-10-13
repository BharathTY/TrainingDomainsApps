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
| Ecommerce card | Opens https://www.shoppersstack.com/. `/ecommerce` is still the local login stub. |
| `/crm`, `/erp`, `/retail`, `/assets`, `/hospital`, `/banking` | Stub apps. The launcher shows Coming soon until `enabled` is true. The login page is still reachable. |

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

Each remaining stub app shows `admin` / `admin123` on its login page.

Basic Auth for `/<app>/secure/*` is `admin` / `admin@123` (the browser popup, separate from the login form).

## Data

Sign-in, logout, reset, Basic Auth, and frames are handled by Express. Users and sessions are stored in Postgres database `trainingDomainApps`, one schema per app. `POST /api/<appId>/reset` re-seeds only that app's users.

School Management screens still read and write the in-browser mock store. Reloading the page restores the school seed. The session cookie survives a reload.

StockWise items, warehouses, batches, and the stock ledger are tables in the `inventory` schema of `trainingDomainApps`. `POST /api/inventory/reset` restores that seed and the four demo users.

## Checks

```bash
npm run typecheck
npm run eslint
npm run html
npm run test:e2e
```
