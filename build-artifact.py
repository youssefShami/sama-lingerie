"""
Build a claude.ai-artifact friendly copy of the site into ./dist

The artifact viewer wraps the page in its own <html>/<head>/<body>, blocks
third-party images and iframes, so this script:
  1. downloads every Unsplash / Pexels photo into dist/img and rewrites the URLs,
  2. strips the document skeleton (doctype/html/head/body) from index.html,
  3. swaps the Google Maps iframe for a static map card with an "open in Maps" link.
Run:  python build-artifact.py
"""
import io, os, re, hashlib, subprocess, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, 'dist')
IMG = os.path.join(DIST, 'img')
os.makedirs(IMG, exist_ok=True)

html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
products = io.open(os.path.join(ROOT, 'products.js'), encoding='utf-8').read()

URL_RE = re.compile(r'https://images\.(unsplash|pexels)\.com/[^"\'\s)]+')

def key_for(url):
    m = re.search(r'photo-([0-9a-f-]+)', url) or re.search(r'/photos/(\d+)/', url)
    return m.group(1) if m else hashlib.md5(url.encode()).hexdigest()[:12]

def source_url(url):
    """Normalise to one download per photo (largest size used on the site)."""
    if 'unsplash' in url:
        return re.sub(r'\?.*$', '?auto=format&fit=crop&w=1600&q=80', url)
    return re.sub(r'\?.*$', '?auto=compress&cs=tinysrgb&w=1600', url)

urls = set(m.group(0) for m in URL_RE.finditer(html) if '${' not in m.group(0))
# products.js builds URLs from ids via U('...') / P(123): resolve those too
for pid in re.findall(r"U\('([0-9a-f-]+)'\)", products):
    urls.add(f'https://images.unsplash.com/photo-{pid}?auto=format&fit=crop&w=1200&q=80')
for pid in re.findall(r"P\((\d+)\)", products):
    urls.add(f'https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w=1200')
mapping = {}
for u in sorted(urls):
    k = key_for(u)
    fname = f'{k}.jpg'
    dest = os.path.join(IMG, fname)
    if not os.path.exists(dest) or os.path.getsize(dest) < 10000:
        src = source_url(u)
        print('downloading', src)
        subprocess.run(['curl', '-sL', '-o', dest, src], check=True)
        assert os.path.getsize(dest) > 10000, f'download failed: {src}'
    mapping[u] = f'img/{fname}'

for u, rel in mapping.items():
    html = html.replace(u, rel)
# point the id helpers in products.js at the local copies
products = re.sub(r"const U = id => `[^`]*`;", "const U = id => `img/${id}.jpg`;", products)
products = re.sub(r"const P = id => `[^`]*`;", "const P = id => `img/${id}.jpg`;", products)

# ---- strip skeleton: keep head children except charset/viewport ----
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
head_keep = [re.search(r'<title>.*?</title>', head, re.S).group(0)]
for tag in re.findall(r'<(?:meta|link)[^>]*>', head, re.S):
    if 'charset' in tag or 'name="viewport"' in tag:
        continue
    head_keep.append(tag.strip())
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)

# ---- replace map iframe with a static card ----
body = re.sub(
    r'<iframe title="Sama Lingerie on Google Maps".*?</iframe>',
    '''<a class="map-static" href="https://www.google.com/maps/search/?api=1&query=33.561752,35.373573" target="_blank" rel="noopener">
        <span class="map-static__grid"></span>
        <span class="map-static__street map-static__street--a"></span>
        <span class="map-static__street map-static__street--b"></span>
        <span class="map-static__label">Ghassan Hammoud St · Saida</span>
        <span class="map-static__cta" data-i18n="ct.map">Open in Google Maps</span>
      </a>''', body, flags=re.S)

extra_css = '''<style>
/* artifact-only: static map card in place of the embedded Google Map */
.map-static{position:absolute;inset:0;display:block;background:#F3EBDD;overflow:hidden}
.map-static__grid{position:absolute;inset:0;background-image:linear-gradient(rgba(43,43,43,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(43,43,43,.06) 1px,transparent 1px);background-size:44px 44px}
.map-static__street{position:absolute;background:#fff;border-radius:999px;box-shadow:0 0 0 1px rgba(43,43,43,.05)}
.map-static__street--a{left:-10%;right:-10%;top:52%;height:34px;transform:rotate(-12deg)}
.map-static__street--b{top:-10%;bottom:-10%;left:38%;width:26px;transform:rotate(14deg)}
.map-static__label{position:absolute;left:18px;top:18px;background:rgba(255,248,238,.92);padding:.6em 1em;border-radius:999px;font-size:.78rem;font-weight:600;letter-spacing:.08em}
.map-static__cta{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);background:#2B2B2B;color:#FFF8EE;padding:.8em 1.3em;border-radius:999px;font-weight:600;font-size:.88rem;white-space:nowrap}
.contact__map .map__pin{transform:translate(-50%,-60%)}
@keyframes bob{0%,100%{transform:translate(-50%,-60%)}50%{transform:translate(-50%,-80%)}}
</style>'''

out = '\n'.join(head_keep) + '\n' + extra_css + '\n' + body
io.open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8', newline='\n').write(out)
io.open(os.path.join(DIST, 'products.js'), 'w', encoding='utf-8', newline='\n').write(products)
for f in ('styles.css', 'shop.css', 'main.js', 'shop.js'):
    shutil.copy(os.path.join(ROOT, f), os.path.join(DIST, f))

total = sum(os.path.getsize(os.path.join(IMG, f)) for f in os.listdir(IMG))
print(f'images: {len(mapping)} ({total/1e6:.1f} MB) -> dist/')
print('leftover external image URLs:', len(URL_RE.findall(out + products)))
