# Sama Lingerie — website

Single-page, bilingual (EN / AR, RTL) site for Sama Lingerie, Saida, Lebanon.
No build step: plain HTML + CSS + JS. GSAP 3 (ScrollTrigger) and Lenis are loaded from CDNs.

## Files
- `index.html` — all sections (hero, marquee, intro, pinned horizontal collections, product showcase placeholder, bridal trousseau, about, Instagram strip, contact + map, footer, floating WhatsApp).
- `styles.css` — brand tokens (`--yellow #FFC466`, `--gold #C9A24A`, `--blush #F6D6DC`, `--cream #FFF8EE`, `--ink #2B2B2B`), layout, responsive + reduced-motion rules.
- `products.js` — catalogue data. `shop.js` / `shop.css` — shop grid, offers, quick view, cart drawer, WhatsApp checkout.
- `main.js` — Lenis smooth scroll, GSAP scroll system (progress bar, parallax, clip-path image reveals, scroll-linked word scrub, pinned horizontal scroll, marquees with scroll velocity, magnetic buttons, tilt cards, custom cursor), and the EN/AR dictionary + toggle.
- `RESEARCH.md` — template/reference survey and the verified photo list used for placeholders.
- `HOSTING.md` — how to buy the domain, connect it to Netlify, deploy, back up, and the go-live checklist.

## Run locally
Any static server works, e.g.:

    python -m http.server 8765

then open http://localhost:8765 (opening the file directly also works, but a server mirrors production).

## Editing copy
All text lives in the `T` dictionary at the top of `main.js` (keys like `hero.tag`, `br.s1d`). Edit both `en` and `ar`. Elements are wired with `data-i18n="key"`.

## Shop, offers and cart
- `products.js` holds the catalogue: `CATS` (categories), `PRODUCTS` (id, cat, EN/AR name + description, price, optional `old` price, image, sizes, colours, optional `tag`: new / bestseller / bundle) and `DEALS` (static offer cards). Edit this file to change what the shop sells; everything else renders from it.
- A product with an `old` price automatically shows a strike-through, a -% badge, and appears in the Offers row.
- `shop.js` renders the category chips, product grid, offers row, quick view modal, the bag drawer and the WhatsApp checkout message. The bag is saved in `localStorage` (`sama-cart`).
- Checkout: the bag opens a short form (name, phone, address, notes) with an "I'm not a robot" check; the order is saved via `/api/orders` and the shop confirms it from the dashboard's Orders page on WhatsApp. No payment is taken online; payment is on delivery.
- `shop.css` styles these components.

## Photography
Images are free-license Unsplash / Pexels photos hot-linked for the demo. Before launch, download the ones you keep into `/img`, or replace them with the boutique's own shoot. Credits are listed in `RESEARCH.md`.

## Contact details (already wired)
WhatsApp / phone +961 76 910 051 → https://wa.me/96176910051 · Instagram @sama_lingerie.lb · Ghassan Hammoud Street, opposite Al-Amir wal Amira Bookstore, Saida · map pin 33.561752, 35.373573 · 10:00 AM – 5:00 PM · delivery all over Lebanon.

## Admin dashboard (`/admin/`)
- Live at `https://sama-lingerie.netlify.app/admin/` (locally `http://localhost:8888/admin/` with `npx netlify-cli dev`). Password: see `ADMIN-ACCESS.md` (private, not deployed); change it from Settings.
- Products: add / edit / duplicate / delete, reorder, **In stock** switch (Sold out badge on the site, cannot be added to the bag), hide/show, tags, sizes, colours (+ new colours), EN/AR names and descriptions.
- Discount: switch **On sale** and set an old price or a % off. Anything on sale automatically appears in the Offers section with a -% badge.
- Categories: add / rename / reorder / delete (products get moved to another category first).
- Offers: list of everything on sale + the static offer cards.
- About: all text of the About section and the About page (`about.html`), both photos, four pillars.
- Settings: change password, export / import a JSON backup, reset to the seed data.
- Photos are compressed in the browser before upload (max 1200 px WebP + a 480 px thumbnail used in grids), so phone photos end up at ~100–300 KB instead of several MB.

## Backend (Cloudflare Pages Functions + Supabase)
- `functions/api/*.js` is the live API on Cloudflare Pages: `catalog`, `orders`, `upload`, `auth`, shared helpers in `_lib.js` (Web Crypto, Supabase client). `supabase/schema.sql` has the tables, SQL functions and storage bucket. `wrangler.toml`, `_headers`, `_redirects` are the Cloudflare config.
- `netlify/` is the previous host's version of the same API (Netlify Functions + Blobs fallback), kept for reference and safe to delete once Cloudflare is live.

## Backend details (Netlify version)
- `netlify/functions/orders.mjs` — `GET /api/orders?challenge=1` (captcha), `POST /api/orders` (place order), `GET/PATCH /api/orders` (admin). `netlify/lib/db.mjs` — data layer: Supabase when `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` are set, Netlify Blobs otherwise. `supabase/schema.sql` — tables, functions, storage bucket.
- `netlify/functions/catalog.mjs` — `GET /api/catalog` (public, CDN-cached 20 s) / `PUT /api/catalog` (admin). The live catalogue lives in the `sama` blob store; `products.js` is only the seed / fallback.
- `netlify/functions/upload.mjs` — `POST /api/upload` (admin) stores images in the `images` blob store; `netlify/functions/img.mjs` serves them at `/api/img/<key>` with a one-year cache.
- `netlify/functions/auth.mjs` — login check, change password. The first password comes from the `SAMA_ADMIN_PASSWORD` environment variable; a password set from the dashboard is stored hashed in the `auth` store and takes precedence.
- `netlify/lib/api.mjs` — shared helpers.

## Deploy
Cloudflare Pages builds from GitHub on every push (build `node deploy-stage.mjs`, output `dist-site`). See `HOSTING.md` for the one-time setup, variables and the custom domain. Local dev: `npm run dev` (needs `.dev.vars`).
