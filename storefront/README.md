# Chala Mobile storefront

The public web store: customers browse the products the owner manages in the CRM app and send order
requests that appear in the CRM. React 19 + TypeScript + Vite + Tailwind. It is a static frontend: the
backend (`../crm_backend`) is hosted separately and this folder is all that needs publishing.

## Run it

```sh
cd storefront
npm install
npm run dev                   # http://localhost:5173, talks to the live shop API
```

By default it uses the live API (`.env.production` / the built-in default). To point it at your own
backend while developing, create `.env.local` with `VITE_API_URL=http://localhost:3001/api`.

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build` | type-check, then build the site into `dist/` |
| `npm run preview` | serve the built site locally, to try it before publishing |
| `npm run typecheck` / `npm run lint` | checks |

## Settings

All public (they end up in the website, so never put a secret here).

| Name | What | Where it is set |
|---|---|---|
| `VITE_API_URL` | the shop API, ending in `/api` | `.env.production` (committed); override on the host |
| `VITE_SHOP_PHONE` | the shop's number in the header, footer and "call" buttons | `.env.production` |
| `VITE_SITE_URL` | the store's own address, once it has one, e.g. `https://chalamobile.com` | host setting; fills in the canonical link and the picture shown when the site is shared |

## Publish it (frontend only)

Any static host works. The three below are ready: the repository already holds their settings
(`netlify.toml`, `vercel.json`, `public/_headers`, `public/_redirects`).

**Netlify**
1. *Add new site → Import from Git*, pick this repository.
2. It reads `netlify.toml` (base `storefront`, build `npm run build`, publish `dist`). Nothing to type.
3. Optional: *Site settings → Environment variables* → `VITE_SITE_URL`.
4. *Deploy*. Add your domain under *Domain management* when you have one.

**Vercel**
1. *Add New → Project*, import the repository, set **Root Directory** to `storefront`.
2. Framework: Vite (detected). Build `npm run build`, output `dist`.
3. *Deploy*.

**Cloudflare Pages**
1. *Create → Pages → Connect to Git*, pick the repository.
2. Root directory `storefront`, build command `npm run build`, output `dist`.
3. *Save and Deploy*.

### After it is published (do these once)

1. **Allow the store to call the API.** On the backend host (Render → *Environment*) set
   `STOREFRONT_ORIGIN` to the store's address, for example `https://chala-mobile.netlify.app`
   (several addresses can be separated by commas, no trailing `/`). Save; the backend restarts.
   Until it is set the API accepts calls from any website.
2. If you add a domain later, add it to `STOREFRONT_ORIGIN` too and set `VITE_SITE_URL`, then redeploy.
3. Open the live site on a phone: browse, add to cart, create an account, place a test order, and
   see it arrive in the CRM app.

## What shows where

- Only products with **Show on web store** switched on (CRM app, Stock) and not removed are listed.
- Photos come from the CRM app (up to 4 per product, the first is the cover). Without one, a neutral placeholder shows.
- **Trending** = most sold in the last 90 days. **Featured** = highest price in stock. **Top selling** tab = same as trending.
- Cost price and private notes are never sent to the site. Stock is shown as In stock / Few left / Sold out.
- Every list shows all its products (the next batch loads by itself).
- Orders are requests: no payment is taken online. The shop confirms by phone; confirming in the CRM app turns it into a sale and takes the stock.
- The notification bell checks for updates every 45 seconds while signed in.

## Languages

English (default), Afaan Oromoo and Amharic. The toggle (`EN ▾`) is next to the cart, and in the phone menu. The choice is
remembered on the device. Every text lives in `src/i18n/`: `en.ts` is the source, `om.ts` and `am.ts` must have the same keys
(the build fails if one is missing). To fix a translation, edit that one line. Product names, specs and brands are shown as
the owner typed them in the CRM; the four shop categories are translated, others are shown as typed.

## Built for production

- Pages are loaded as needed and the rest is fetched quietly afterwards, so moving around is instant.
- Photos are resized and converted by the image host to fit the screen.
- Built files are named by content and cached for a year; `index.html` is always re-checked, so a new version appears at once.
- Security headers (no framing, no sniffing, strict referrer, no camera/microphone/location).
- A calm error screen replaces a blank page if something unexpected breaks.
- Share picture, icons, web manifest (add to home screen), robots rules and basic business data for search engines.
- No source maps and no debugging output in the published site.

## Design

Colours, radius and shadow are tokens at the top of `src/styles/index.css`. White page, one amber action colour with
dark text on it, near-black hero and footer, teal text links. The logo is `src/components/layout/Logo.tsx`; the browser
icon `public/favicon.svg` is the same drawing.
