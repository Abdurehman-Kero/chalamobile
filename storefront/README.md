# Chala Mobile storefront

The public web store: customers browse the products the owner manages in the CRM app, and send order
requests that appear in the CRM. React 19 + TypeScript + Vite + Tailwind. It is a static frontend: the
backend (`../crm_backend`) is hosted separately.

## Run it

```sh
cd storefront
cp .env.example .env.local    # VITE_API_URL = your backend address, ending in /api
npm install
npm run dev                   # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | type-check and build to `dist/` |
| `npm run typecheck` / `npm run lint` | checks |

## What shows where

- Only products with **Show on web store** switched on (CRM app, Stock) and not removed are listed.
- Photos come from the CRM app (up to 4 per product, the first is the cover). Without one, a neutral placeholder shows.
- **Trending** = most sold in the last 90 days. **Featured** = highest price in stock. **Top selling** tab = same as trending.
- Cost price and private notes are never sent to the site. Stock is shown as In stock / Few left / Sold out.
- Orders are requests: no payment is taken online. The shop confirms by phone; confirming in the CRM app turns it into a sale and takes the stock.
- The notification bell checks for updates every 45 seconds while signed in.

## Languages

English (default), Afaan Oromoo and Amharic. The toggle (`EN ▾`) is next to the cart, and in the phone menu. The choice is
remembered on the device. Every text lives in `src/i18n/`: `en.ts` is the source, `om.ts` and `am.ts` must have the same keys
(the build fails if one is missing). To fix a translation, edit that one line. Product names, specs and brands are shown as
the owner typed them in the CRM; the four shop categories are translated, others are shown as typed.

## Deploy (frontend only)

1. Build command `npm run build`, output folder `dist`.
2. Environment variable `VITE_API_URL` = `https://<your-backend>/api` (and optionally `VITE_SHOP_PHONE`).
3. Single-page-app rewrite is already included for Netlify / Cloudflare Pages (`public/_redirects`) and Vercel (`vercel.json`).
4. On the backend host, set `STOREFRONT_ORIGIN` to the store's address (for example `https://chalamobile.com`) so only your site can call the public API from a browser. Set the three `CLOUDINARY_*` values for photo uploads and redeploy: the new database tables are created by the usual migration step.

## Design

Colours, radius and shadow are tokens at the top of `src/styles/index.css`. Change the brand colour in
one line (`--color-brand`). No gradients; the clay accent is only used on small badges.
