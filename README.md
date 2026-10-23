# ChalaMob CRM

Business management for a phone and repair shop, as an Android app and a small server.
Sell products, track stock, run repair tickets, keep customers, and see the day's
money in one place. It keeps working when the internet doesn't.

```
chalamobile/
├── crm_backend/   REST API  (Node.js, Express, PostgreSQL)
├── crm_mobile/    Android app (React Native, TypeScript)
└── storefront/    Public web store (React, TypeScript): browse and order, see storefront/README.md
```

| | |
|---|---|
| **Sell** | Point of sale with cash / Telebirr / CBE, optional customer link, receipt |
| **Stock** | Products with cost and selling price, low-stock alerts, restocking |
| **Repairs** | Tickets with a promised day, reminders the day before, hand-over with payment |
| **Clients** | Customers with purchase and repair history, VIP flag |
| **Reports** | Daily report: what was sold, repaired and bought, revenue and profit, export to PDF or image |
| **Team** | The owner adds admins, sales staff and technicians with an email and password |
| **Offline** | Everything made without a connection is saved on the phone and sent automatically |

## Who sees what

| Role | Sees |
|---|---|
| **Admin** (owner) | Everything: revenue split, profit, reports, team, cost prices |
| **Sales** | Home (own sales), Stock (read only, no costs), Sell, Clients |
| **Technician** | Home and Repairs: their own jobs plus the unassigned queue |

Roles are enforced by the server, not just hidden in the app.

## Quick start (development)

You need Node 20+, PostgreSQL, and for the app the
[React Native Android setup](https://reactnative.dev/docs/set-up-your-environment).

**1. Backend**
```sh
cd crm_backend
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npm install
npm run migrate               # create the tables
npm run seed                  # optional: demo data and the three demo accounts
npm run dev                   # http://localhost:3001  (health check: /health)
```

**2. Mobile app**
```sh
cd crm_mobile
npm install
npm start                     # Metro, in one terminal
npm run android               # build and launch, in another
```
A debug build points at the live server by default. To use your local backend, tap **Change**
on the login screen and pick an emulator / USB preset (see
[crm_mobile/README.md](crm_mobile/README.md)).

Demo accounts created by `npm run seed` (**change or remove them before real use**):

| Role | Email | Password |
|---|---|---|
| Admin | admin@chalamobile.com | admin123 |
| Technician | tech@chalamobile.com | tech123 |
| Sales | sales@chalamobile.com | sales123 |

## How offline works

Every change (a sale, a new product, a repair step...) is written to a queue on the
phone first, then sent to the server. If the server cannot be reached, the change
stays in the queue and the app carries on using it. As soon as the server answers
again the queue is sent automatically, oldest first.

- "Online" means *the server answers*, so a shop Wi-Fi without internet still works.
- Each request carries a retry key, so a lost reply can never record a sale twice.
- Each request carries the time it really happened, so a sale made at 10am offline
  is reported under 10am.
- If the server refuses a queued change (for example, not enough stock any more),
  it is kept in a list to retry or discard, never silently dropped.

## Deploying

**Backend** runs anywhere Node and PostgreSQL do (a VPS, Render, Railway, Fly...).

1. Create a PostgreSQL database and note its connection string.
2. Set the environment variables from `crm_backend/.env.example` on the host
   (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `TZ`, `NODE_ENV=production`).
   `PORT` is usually provided by the host.
3. Build command `npm install`, start command `npm run start:prod`. That applies any new
   database migrations, adds the demo data **only if the tables are empty**, and starts the
   server. Seeding never changes existing data, so redeploys are safe.
4. To start with no demo accounts, use the start command `npm run migrate && npm start`
   instead and create the first admin yourself.
5. Put it behind HTTPS (most hosts do this for you).
6. The PNG export draws text with fonts installed on the server. On a minimal Linux
   image install some, e.g. `apt-get install -y fonts-liberation`.

**App**: the live server address is built in (`PRODUCTION_URL` in
`crm_mobile/src/api/axios.ts`; change it and rebuild to point elsewhere). Build a release
APK and share it (details in `crm_mobile/README.md`). Release builds use HTTPS only.

On a free host the server sleeps when idle and the first request can take up to a minute.
The app waits for it and starts waking it as soon as it opens. Set `TZ` on the host so
"today" in reports matches the shop, not UTC.

**Web store**: see [storefront/README.md](storefront/README.md). Deploy only that folder as a static site. On the
backend host also set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (product photos)
and `STOREFRONT_ORIGIN` (the store address); the next deploy creates the new tables.

## Tests

```sh
cd crm_mobile && npm test      # offline engine, formatting, date logic
```

## Security notes

- Never commit `crm_backend/.env`. It is git-ignored; use `.env.example` as the template.
- Use a long random `JWT_SECRET` and a strong database password in production.
- If a `.env` was ever pushed to a public repository, treat those secrets as leaked
  and replace them.
- The server accepts requests from any origin (`cors: *`). Restrict it to your own
  domain in `crm_backend/src/index.js` if you host a web client.
