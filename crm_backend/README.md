# ChalaMob CRM: backend

REST API for the ChalaMob app. Node.js, Express 5, PostgreSQL (via Knex).

## Setup

```sh
cp .env.example .env     # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate          # create / update the tables
npm run seed             # demo products, customers, repairs and 3 demo accounts (only fills empty tables)
npm run dev              # auto-reload; use `npm start` in production
```

Health check: `GET /health` → `{ "status": "ok" }`.

## Environment

All settings live in `.env` (see [.env.example](.env.example)).

| Variable | Meaning |
|---|---|
| `PORT` | Port to listen on (default 3001) |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret that signs login tokens. Long and random |
| `JWT_EXPIRES_IN` | Login lifetime, e.g. `30d` |
| `TZ` | The shop's time zone. "Today", daily totals and reminders follow it |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start with nodemon (restarts on changes) |
| `npm start` | Start normally |
| `npm run migrate` | Apply new database migrations |
| `npm run rollback` | Undo the last batch of migrations |
| `npm run seed` | Add demo data to **empty** tables only. Safe to run on every deploy: it never changes existing data |
| `npm run start:prod` | Production start: `migrate`, then `seed` (a no-op once there is data), then the server |

## Roles

`owner` (admin), `sales`, `technician`. Every route checks the role; a user disabled by
the owner is locked out on their next request.

| Area | owner | sales | technician |
|---|:-:|:-:|:-:|
| Products: read | ✓ | ✓ (no cost price) | |
| Products: add / edit / remove / restock | ✓ | | |
| Sales: create | ✓ | ✓ | |
| Sales: list | all | own | |
| Customers: read / add | ✓ | ✓ | |
| Customers: edit | ✓ | | |
| Repairs | all | | own + unassigned |
| Dashboard | whole business | own sales | own jobs |
| Alerts | stock + repairs due | stock | repairs due |
| Daily report and export | ✓ | | |
| Team management | ✓ | | |

## API overview

All routes are under `/api` and need `Authorization: Bearer <token>` unless noted.

| Route | Purpose |
|---|---|
| `POST /auth/login`, `GET /auth/me` | Sign in (public), current user |
| `GET/POST/PUT/DELETE /products`, `POST /products/:id/restock` | Stock |
| `POST /sales`, `GET /sales`, `GET /sales/:id` | Selling |
| `GET/POST/PUT /customers`, `GET /customers/:id` | Clients and their history |
| `GET/POST /repairs`, `PATCH /repairs/:id`, `/status`, `/assign` | Repair tickets |
| `GET /dashboard/metrics`, `/weekly`, `/activity` | Home screen, per role |
| `GET /alerts` | Low stock and repairs due soon |
| `GET /reports/daily?date=`, `POST /reports/export-links` | Daily report (owner) |
| `GET /reports/daily.pdf`, `/daily.png` | Exports, opened with a 10-minute link token |
| `GET/POST/PATCH /users` | Team (owner) |

## Built for offline phones

The app queues changes while offline and sends them later, so the server supports it:

- **`Idempotency-Key` header**: a repeated write with the same key returns the first
  answer instead of running again (stored in `idempotency_keys`, kept 30 days).
- **`X-Occurred-At` header**: when the change really happened. Used for the time of a
  sale, a ticket's received/completed/delivered time and a purchase. Future times and
  times older than 90 days are ignored.

## Database

Migrations in `migrations/` build up the schema: users, products, customers, sales,
repairs, then purchases / promised dates / cost per sale line (`006`) and the
idempotency table (`007`). Profit uses the cost frozen on each sale line, so changing a
product's cost later never rewrites old profit.

## Seeds are safe

`npm run seed` only inserts into a table that is empty, and prints "already has data, left
untouched" otherwise. It never deletes, so it is safe in a host's start command. Real users,
edits and switched-off demo accounts always survive a redeploy.

To wipe and reload the demo data on a **development** database on purpose:

```sh
SEED_RESET=true npm run seed          # Windows PowerShell:  $env:SEED_RESET="true"; npm run seed
```

A reset is refused when `NODE_ENV=production`.

## Deploying

Build command: `npm install`   ·   Start command: `npm run start:prod`

(`start:prod` = apply new migrations, add demo data only if the tables are empty, start the
server.) To start with no demo accounts at all, use `npm run migrate && npm start` instead and
create the first admin yourself.

- Set the variables above on the host. Set `NODE_ENV=production`.
- Use HTTPS in front of it.
- The PNG report export needs system fonts. On a minimal Linux image:
  `apt-get install -y fonts-liberation`.
- `src/uploads/` stores product photos. Mount persistent storage there if the host's
  disk is temporary.
