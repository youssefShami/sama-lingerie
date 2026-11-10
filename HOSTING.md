# Sama Lingerie — hosting, domain and go-live guide

Everything below is what you need to take the site from "demo link" to a professional, branded address
(for example `samalingerie.com`) with HTTPS, the admin dashboard, and backups. Costs are indicative (Nov 2026).

---

## 1. The stack

| Piece | Where | Cost |
|---|---|---|
| Website + admin pages (static files on a global CDN) | **Cloudflare Pages** | Free |
| API (catalogue, orders, uploads, login) | Cloudflare Pages Functions, folder `functions/api` | Free: 100k requests / day |
| Database + photo storage | **Supabase** (Postgres + Storage), project `sama` | Free tier |
| Code | GitHub `youssefShami/sama-lingerie` | Free |
| Domain | Cloudflare Registrar (at-cost pricing) | about $10 / year for .com |

(The `netlify/` folder is the previous host's version of the same API; delete it once Cloudflare is live.)

### Database: Supabase (Postgres + Storage)
The API reads and writes **Supabase** through the secret key, which lives only in Cloudflare's encrypted variables (never in the browser).

| Table | Holds |
|---|---|
| `categories`, `products`, `deals`, `colors` | the catalogue the dashboard edits |
| `settings` | About texts, dashboard password hash |
| `orders` | every order placed on the site (name, phone, address, items, total, status) |
| Storage bucket `images` | compressed product / about photos, served from Supabase's CDN |

`supabase/schema.sql` has already been run on the project (tables, functions, `images` bucket, row-level security). The public key has no access to anything; only the API's secret key does. Catalogue reads are cached at Cloudflare's edge for 60 s and dropped on every Save.

---

## 2. Put the site on Cloudflare Pages (free, about 10 minutes)

1. Push the code to GitHub once, from the project folder (a Git login window opens the first time):
   ```
   git push -u origin main
   ```
2. https://dash.cloudflare.com -> sign up or log in -> **Workers & Pages -> Create -> Pages -> Connect to Git** -> authorise GitHub -> pick `youssefShami/sama-lingerie`.
3. Build settings: Framework preset **None**, Build command `node deploy-stage.mjs`, Build output directory `dist-site`, Root directory `/`.
4. **Environment variables** (Production; repeat for Preview if you want preview deploys to work):
   - `SUPABASE_URL` = `https://fjxywdmrqnlydusaoywj.supabase.co`
   - `SUPABASE_SERVICE_KEY` = the **secret** key from Supabase -> Project settings -> API Keys (starts with `sb_secret_`). Tick *Encrypt*.
   - `SAMA_ADMIN_PASSWORD` = the dashboard password (see `ADMIN-ACCESS.md`; change it later from the dashboard).
   - `NODE_VERSION` = `20`
5. **Save and Deploy**. The first build takes about a minute; the site appears at `https://sama-lingerie.pages.dev`. The functions in `functions/api` deploy with it.
6. Open `https://sama-lingerie.pages.dev/admin/`, log in, press **Save** once: the catalogue is written into Supabase and the site starts reading from it.
7. Every later `git push` to `main` redeploys automatically; pull requests get preview URLs.

## 3. Buy the domain and connect it (about $10 / year)

Because the site is on Cloudflare, buying at **Cloudflare Registrar** is simplest: at-cost price, free WHOIS privacy, DNS already in place.

1. Cloudflare dashboard -> **Domain Registration -> Register Domains** -> search `samalingerie.com` (or `sama-lingerie.com`, `samalingerie.shop`) -> buy, auto-renew on.
2. **Workers & Pages -> sama-lingerie -> Custom domains -> Set up a custom domain** -> enter the domain -> Cloudflare adds the DNS record itself -> **Activate**. Repeat for `www.samalingerie.com`. HTTPS is automatic.
3. Optional: a Redirect Rule sending `www` to the bare domain.
4. After it is live, replace `sama-lingerie.netlify.app` with your domain in `index.html`, `about.html` (canonical, og:url, og:image), `sitemap.xml`, `robots.txt`, `ADMIN-ACCESS.md`, then push.

If you buy the domain elsewhere (Namecheap, Porkbun): either switch its nameservers to the two Cloudflare shows when you **Add a domain** (recommended), or add a `CNAME` for `@` and `www` pointing to `sama-lingerie.pages.dev`.

## 4. Professional email (optional)

- **Free forwarding**: Cloudflare **Email Routing** forwards `hello@samalingerie.com` to the shop's Gmail at no cost (domain -> Email -> Email Routing).
- **Real mailbox** (send *from* the domain): Zoho Mail Free (1 user) or Google Workspace (≈ $7 / user / month).

---

## 5. Orders

Customers check out on the site: bag → **Place order** → name, phone, address → **I'm not a robot** → **Confirm order**. The order is saved in the database with a number like `SM-2511-7F3K`, prices are recomputed server-side, and sold-out items are refused.

In the dashboard → **Orders**: every order with its items, a **Send confirmation on WhatsApp** button (opens WhatsApp to the customer's number with a ready message in their language and marks the order confirmed), Mark delivered / Cancel, copy summary, search and filters. New orders show as a badge in the sidebar.

The "I'm not a robot" check is a signed proof-of-work challenge plus a honeypot field and a minimum fill time: no third-party keys needed. If you ever want Cloudflare Turnstile or Google reCAPTCHA instead, both can be dropped into `netlify/functions/orders.mjs` in a few lines.

## 6. Day-to-day: the dashboard

- URL: `https://<your-domain>/admin/` (or `https://sama-lingerie.pages.dev/admin/`), password in `ADMIN-ACCESS.md` (private). Change it in **Settings** on first login.
- Products, categories, offers, about text and photos are all live the moment you press **Save**; the edge cache is purged automatically.
- **Backups**: Settings → **Export backup** downloads one JSON file with everything. Do it after big changes; **Import backup** restores it.
- **Photos**: upload straight from the phone. Each photo is compressed in the browser (1200 px WebP + 480 px thumbnail), so the site stays fast with hundreds of items.
- **Forgot the password**: Supabase -> Table editor -> `settings` -> delete the row `password-hash`; the password then falls back to `SAMA_ADMIN_PASSWORD` in Cloudflare's variables (change that value there if needed).

---

## 7. Deploying changes to the code

Push to GitHub; Cloudflare builds and deploys automatically:
```bash
git add -A && git commit -m "describe the change" && git push
```
Local development with the real database (Node 18+): create `.dev.vars` in the project folder with the three variables from section 2 step 4, then
```bash
npm run dev
```
-> http://localhost:8788 (site + API). `.dev.vars` is git-ignored; never commit it.

## 8. Limits and when to upgrade

Cloudflare Pages Free: unlimited bandwidth and requests for static files, 100,000 function requests per day, 500 builds per month, no badge. Supabase Free: 500 MB database, 1 GB file storage, 5 GB egress per month; projects pause after a week with no traffic (visitors keep it awake). Upgrade Supabase to Pro ($25 / month) only if storage or traffic outgrows that; Cloudflare Workers Paid ($5 / month) only above 100k API calls a day.

---

## 9. Go-live checklist

- [ ] Replace the placeholder products and stock photos in the dashboard with the real shoot (names EN/AR, prices, sizes, stock).
- [ ] Rewrite the About text and story in the dashboard; upload the shop's own photos.
- [ ] Push to GitHub, connect Cloudflare Pages, add the variables, deploy, press Save in the dashboard.
- [ ] Buy the domain, add it as a custom domain, wait for HTTPS.
- [ ] Update canonical / OG / sitemap URLs to the domain and redeploy.
- [ ] Share `https://<domain>/` on Instagram bio (`@sama_lingerie.lb`) and WhatsApp Business profile.
- [ ] Create a free **Google Business Profile** with the address (Ghassan Hammoud St, Saida), hours (10:00–17:00) and the website link.
- [ ] Add the site to **Google Search Console** (verify with a DNS TXT record in Cloudflare) and submit `sitemap.xml`.
- [ ] Change the admin password; store it in a password manager; export a first backup.

Developed by **Arzware** — https://arzware.net
