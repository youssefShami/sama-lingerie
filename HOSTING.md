# Sama Lingerie — hosting, domain and go-live guide

Everything below is what you need to take the site from "demo link" to a professional, branded address
(for example `samalingerie.com`) with HTTPS, the admin dashboard, and backups. Costs are indicative (Nov 2026).

---

## 1. What is already in place

| Piece | Where | Cost |
|---|---|---|
| Website (HTML/CSS/JS, served from a global CDN) | Netlify site `sama-lingerie` | Free |
| API (catalogue, uploads, images, login) | Netlify Functions, folder `netlify/functions` | Free tier: 125k calls / month |
| Data store (catalogue JSON, photos, password hash) | Netlify Blobs, stores `sama`, `images`, `auth` | Free tier |
| Edge cache | Netlify Durable Cache, purged on every Save | Free |
| Admin dashboard | `/admin/` | — |

Why this stack and not a classic database server: the whole shop is one small JSON document plus images.
Serving it from the CDN edge (≈10–30 ms anywhere in the world) is faster than any Postgres/MySQL query behind a
server, and there is nothing to patch, scale or pay for. If the shop later needs orders, customers and reports,
add Netlify DB (Neon Postgres, `npx netlify db init`) next to it; the dashboard code is organised so that only
`netlify/functions/*.mjs` would change.

---

## 2. Buy the domain (≈ $10–15 / year)

Recommended registrars (cheap, no upsell, easy DNS): **Porkbun**, **Namecheap**, or **Cloudflare Registrar**.
Suggested names, in order: `samalingerie.com`, `sama-lingerie.com`, `samalingerie.shop`, `sama.lb`
(`.lb` domains are registered through LBDR / Lebanese registrars and cost more; `.com` is the safe choice).

1. Search the name, add to cart for 1 year (turn on auto-renew so the site never goes dark).
2. Keep **WHOIS privacy** on (free at Porkbun/Namecheap/Cloudflare).
3. Pay. You now own the domain; nothing else to buy.

---

## 3. Connect the domain to Netlify (free, ~10 minutes, HTTPS automatic)

1. Netlify dashboard → site **sama-lingerie** → **Domain management** → **Add a domain** → type `samalingerie.com` → **Verify** → **Add domain**.
2. Choose how to point DNS. Two options:

   **Option A — Netlify DNS (simplest).** Netlify shows 4 name servers (like `dns1.p01.nsone.net`).
   At your registrar open the domain → **Nameservers** → "Custom" → paste the 4 servers → save.
   Netlify then manages all records, including `www`.

   **Option B — keep your registrar's DNS.** Add these records at the registrar:
   - `A` record, host `@`, value `75.2.60.5` (Netlify load balancer)
   - `CNAME` record, host `www`, value `sama-lingerie.netlify.app`
3. Back in Netlify → **Domain management**: set `samalingerie.com` as **primary domain** (the `www` version redirects to it automatically).
4. **HTTPS**: Netlify issues a free Let's Encrypt certificate itself once DNS propagates (5 minutes to a few hours). Nothing to buy or renew.
5. After it is live, update three things in the project and redeploy (see §6):
   - `index.html`, `about.html`: the `canonical`, `og:url` and `og:image` URLs
   - `sitemap.xml`, `robots.txt`: replace `sama-lingerie.netlify.app` with the new domain
   - `ADMIN-ACCESS.md`: the dashboard address becomes `https://samalingerie.com/admin/`

---

## 4. Professional email (optional)

- **Free forwarding**: Porkbun and Cloudflare forward `hello@samalingerie.com` to the shop's Gmail at no cost (Registrar → Email forwarding).
- **Real mailbox** (send *from* the domain): Zoho Mail Free (1 user) or Google Workspace (≈ $7 / user / month).

---

## 5. Day-to-day: the dashboard

- URL: `https://<your-domain>/admin/` — password in `ADMIN-ACCESS.md` (private). Change it in **Settings** on first login.
- Products, categories, offers, about text and photos are all live the moment you press **Save**; the edge cache is purged automatically.
- **Backups**: Settings → **Export backup** downloads one JSON file with everything. Do it after big changes; **Import backup** restores it.
- **Photos**: upload straight from the phone. Each photo is compressed in the browser (1200 px WebP + 480 px thumbnail), so the site stays fast with hundreds of items.
- **Forgot the password**: Netlify → Site configuration → Environment variables → `SAMA_ADMIN_PASSWORD` → set a new value, then ask the developer to clear the stored hash (store `auth`, key `password-hash`) or run `npx netlify-cli blobs:delete auth password-hash` from the project folder.

---

## 6. Deploying changes to the code

From the project folder (Node 18+ installed):

```bash
npx -y netlify-cli@17.38.1 login
```
```bash
node deploy-stage.mjs
```
```bash
npx -y netlify-cli@17.38.1 deploy --prod --dir dist-site
```

`deploy-stage.mjs` copies only the public files into `dist-site/` (no `node_modules`, notes or scripts);
functions are picked up from `netlify.toml`. Test locally first with `npx -y netlify-cli@17.38.1 dev` → http://localhost:8888.

Optional: connect the folder to a GitHub repository and link it in Netlify (**Site configuration → Build & deploy → Link repository**);
every push then deploys automatically with a preview URL per branch.

---

## 7. Limits and when to upgrade

Netlify Free covers a boutique comfortably: 100 GB bandwidth, 125k function calls and 300 build minutes per month, Blobs and Durable Cache included.
Reasons to move to **Netlify Pro** (≈ $19–20 / month): remove the "Powered by Netlify" badge on free sites, more bandwidth, password-protected previews, more team members.

---

## 8. Go-live checklist

- [ ] Replace the placeholder products and stock photos in the dashboard with the real shoot (names EN/AR, prices, sizes, stock).
- [ ] Rewrite the About text and story in the dashboard; upload the shop's own photos.
- [ ] Buy the domain, connect it, set it as primary, wait for HTTPS.
- [ ] Update canonical / OG / sitemap URLs to the domain and redeploy.
- [ ] Share `https://<domain>/` on Instagram bio (`@sama_lingerie.lb`) and WhatsApp Business profile.
- [ ] Create a free **Google Business Profile** with the address (Ghassan Hammoud St, Saida), hours (10:00–17:00) and the website link.
- [ ] Add the site to **Google Search Console** (verify via Netlify DNS TXT record) and submit `sitemap.xml`.
- [ ] Change the admin password; store it in a password manager; export a first backup.

Developed by **Arzware** — https://arzware.net
