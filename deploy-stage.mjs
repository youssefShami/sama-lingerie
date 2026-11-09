// Copies only the public files into ./dist-site for `netlify deploy --dir dist-site`
import { cpSync, rmSync, mkdirSync } from 'node:fs';
const out = 'dist-site';
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
for (const f of ['index.html', 'about.html', '404.html', 'styles.css', 'shop.css', 'main.js', 'shop.js', 'products.js', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.ico']) cpSync(f, `${out}/${f}`);
cpSync('img', `${out}/img`, { recursive: true, filter: (p) => !/preview-/.test(p) });
cpSync('admin', `${out}/admin`, { recursive: true });
console.log('staged ->', out);
