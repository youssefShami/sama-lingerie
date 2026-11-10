/* =========================================================
   SAMA — dashboard logic (plain JS, no build step)
   Talks to /api/auth, /api/catalog, /api/upload (Netlify Functions)
   ========================================================= */
(() => {
  'use strict';

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,40}$/i;
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'item';
  const rnd = (n = 4) => Math.random().toString(36).slice(2, 2 + n);
  const money = (n) => `$${Number(n || 0).toFixed(Number(n) % 1 ? 2 : 0)}`;
  const fmtBytes = (b) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`;
  const pct = (p) => p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  const onSale = (p) => p.old != null && p.old !== '' && Number(p.old) > Number(p.price);
  const deepClone = (o) => JSON.parse(JSON.stringify(o));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const thumbOf = (p) => p.thumb || p.img || '';

  let toastT;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg; el.className = 'toast is-on' + (kind ? ` is-${kind}` : '');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), kind === 'bad' ? 4200 : 2400);
  }

  /* ---------------- auth ---------------- */
  const TOKEN_KEY = 'sama-admin-token';
  let token = '';
  try { token = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  async function api(path, opts = {}) {
    const res = await fetch(path, { ...opts, headers: { ...(opts.headers || {}), ...(opts.auth === false ? {} : authHeaders()) } });
    if (res.status === 401 && opts.auth !== false) { onUnauthorized(); throw new Error('unauthorized'); }
    return res;
  }
  function onUnauthorized() {
    token = ''; try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    stopOrdersPolling(); showLogin(); toast('Session expired. Please log in again.', 'bad');
  }

  const loginEl = $('#login'), appEl = $('#app');
  function showLogin() { appEl.hidden = true; loginEl.hidden = false; setTimeout(() => $('#loginPw').focus(), 50); }
  async function showApp() { loginEl.hidden = true; appEl.hidden = false; await loadCatalog(); setView(view); startOrdersPolling(); }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('#loginPw').value;
    const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Checking…';
    $('#loginErr').hidden = true;
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (!res.ok) throw new Error('bad');
      token = pw; try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {}
      $('#loginPw').value = '';
      await showApp();
    } catch (err) {
      $('#loginErr').hidden = false;
      const card = $('.login__card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    } finally { btn.disabled = false; btn.textContent = 'Log in'; }
  });
  $('#logoutBtn').addEventListener('click', () => { token = ''; try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} stopOrdersPolling(); showLogin(); });

  fetch('/api/auth').then((r) => r.json()).then((d) => { if (d && d.configured === false) $('#loginNote').hidden = false; }).catch(() => {});

  /* ---------------- catalog state ---------------- */
  let catalog = null;        // single source of truth
  let saveState = 'idle';    // idle | dirty | saving | error
  let updatedAt = null;

  function seedCatalog() {
    const D = window.SAMA_DATA || {};
    const now = Date.now();
    return {
      cats: (D.CATS || []).filter((c) => c.id !== 'all').map((c) => ({ id: c.id, en: c.en, ar: c.ar })),
      products: (D.PRODUCTS || []).map((p, i) => ({
        id: p.id, cat: p.cat, en: p.en, ar: p.ar, price: Number(p.price), old: p.old != null ? Number(p.old) : null,
        img: p.img, thumb: p.thumb || '', imgs: p.imgs || [], sizes: [...(p.sizes || [])], colors: [...(p.colors || [])],
        tag: p.tag || '', den: p.den || '', dar: p.dar || '', stock: p.stock !== false, hidden: !!p.hidden, created: now - (1000 - i)
      })),
      deals: deepClone(D.DEALS || []),
      colors: deepClone(D.COLORS || {}),
      about: deepClone(D.ABOUT || {})
    };
  }
  function normalize(c) {
    c.cats = c.cats || []; c.products = c.products || []; c.deals = c.deals || []; c.colors = c.colors || {};
    c.about = c.about || seedCatalog().about;
    c.products.forEach((p) => { p.stock = p.stock !== false; p.hidden = !!p.hidden; p.imgs = p.imgs || []; p.sizes = p.sizes || []; p.colors = p.colors || []; p.tag = p.tag || ''; if (p.old === '' || p.old === undefined) p.old = null; });
    c.about.pillars = c.about.pillars || [];
    while (c.about.pillars.length < 4) c.about.pillars.push({ en: '', ar: '', den: '', dar: '' });
    ['title', 'body', 'cap', 'story'].forEach((k) => { c.about[k] = c.about[k] || { en: '', ar: '' }; });
    return c;
  }

  async function loadCatalog() {
    try {
      const res = await fetch(`/api/catalog?t=${Date.now()}`, { cache: 'no-store' });
      if (res.status === 404) { catalog = normalize(seedCatalog()); setSaveState('dirty'); toast('First time here: catalogue loaded from the seed. Press Save to publish it.'); return; }
      if (!res.ok) throw new Error('load failed');
      catalog = normalize(await res.json()); updatedAt = catalog.updatedAt || null; setSaveState('idle');
    } catch (err) {
      catalog = normalize(seedCatalog()); setSaveState('error'); toast('Could not load the live catalogue, showing seed data.', 'bad');
    }
  }

  function setSaveState(s) {
    saveState = s;
    const el = $('#saveState'); el.dataset.state = s;
    el.querySelector('span').textContent = { idle: 'All changes saved', dirty: 'Unsaved changes', saving: 'Saving…', error: 'Save failed – click to retry' }[s];
  }
  $('#saveState').addEventListener('click', () => { if (saveState === 'error' || saveState === 'dirty') saveNow(); });
  $('#saveBtn').addEventListener('click', saveNow);

  function validateLocal(c) {
    const catIds = new Set();
    for (const k of c.cats) {
      if (!ID_RE.test(k.id) || k.id === 'all') return `Category id "${k.id}" is not valid`;
      if (catIds.has(k.id)) return `Duplicate category id ${k.id}`; catIds.add(k.id);
      if (!k.en.trim() || !k.ar.trim()) return `Category "${k.id}" needs EN and AR names`;
    }
    const ids = new Set();
    for (const p of c.products) {
      if (!ID_RE.test(p.id)) return `Product id "${p.id}" is not valid`;
      if (ids.has(p.id)) return `Duplicate product id ${p.id}`; ids.add(p.id);
      if (!catIds.has(p.cat)) return `"${p.en}" has no valid category`;
      if (!String(p.en).trim() || !String(p.ar).trim()) return `"${p.en || p.id}" needs EN and AR names`;
      if (!(Number(p.price) >= 0)) return `"${p.en}" has an invalid price`;
      if (p.old != null && !(Number(p.old) > Number(p.price))) return `"${p.en}": old price must be higher than the price`;
      if (!p.img) return `"${p.en}" needs a photo`;
      for (const col of p.colors) if (!c.colors[col]) return `"${p.en}" uses an unknown colour`;
    }
    return null;
  }

  let saving = false, pendingSave = false;
  async function saveNow() {
    if (!catalog) return;
    if (saving) { pendingSave = true; return; }
    const err = validateLocal(catalog);
    if (err) { setSaveState('error'); toast(err, 'bad'); return; }
    saving = true; setSaveState('saving');
    try {
      const body = { cats: catalog.cats, products: catalog.products, deals: catalog.deals, colors: catalog.colors, about: catalog.about };
      const res = await api('/api/catalog', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      updatedAt = data.updatedAt; setSaveState('idle'); renderInfo();
    } catch (e) {
      if (e.message !== 'unauthorized') { setSaveState('error'); toast(e.message, 'bad'); }
    } finally {
      saving = false;
      if (pendingSave) { pendingSave = false; saveNow(); }
    }
  }
  const scheduleSave = debounce(saveNow, 600);
  function changed() { setSaveState('dirty'); scheduleSave(); }

  /* ---------------- views ---------------- */
  let view = 'products';
  const TITLES = { products: 'Products', orders: 'Orders', categories: 'Categories', offers: 'Offers', about: 'About', settings: 'Settings' };
  function setView(v) {
    view = v;
    $$('#sideNav button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === v));
    $$('.view').forEach((s) => { s.hidden = s.id !== `view-${v}`; });
    $('#pageTitle').textContent = TITLES[v];
    render();
    window.scrollTo({ top: 0 });
  }
  $('#sideNav').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });

  function render() {
    if (!catalog) return;
    ({ products: renderProducts, orders: renderOrdersView, categories: renderCategories, offers: renderOffers, about: renderAbout, settings: renderInfo })[view]();
  }

  /* ================= PRODUCTS ================= */
  const F = { q: '', cat: 'all', sort: 'order' };
  $('#prodSearch').addEventListener('input', (e) => { F.q = e.target.value.trim().toLowerCase(); renderProducts(); });
  $('#prodSort').addEventListener('change', (e) => { F.sort = e.target.value; renderProducts(); });
  $('#addProduct').addEventListener('click', () => openEditor(null));

  const catName = (id) => { const c = catalog.cats.find((x) => x.id === id); return c ? c.en : id; };
  const TAGS = { new: 'New', bestseller: 'Bestseller', bundle: 'Bundle' };

  function renderProducts() {
    // chips
    const counts = {}; catalog.products.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    $('#prodChips').innerHTML = [{ id: 'all', en: 'All' }, ...catalog.cats].map((c) =>
      `<button type="button" class="chip ${F.cat === c.id ? 'is-on' : ''}" data-chip="${esc(c.id)}">${esc(c.en)}<b>${c.id === 'all' ? catalog.products.length : (counts[c.id] || 0)}</b></button>`).join('');

    let list = catalog.products.map((p, i) => ({ p, i }));
    if (F.cat !== 'all') list = list.filter(({ p }) => p.cat === F.cat);
    if (F.q) list = list.filter(({ p }) => (p.en + ' ' + p.ar + ' ' + p.id).toLowerCase().includes(F.q));
    if (F.sort === 'newest') list.sort((a, b) => (b.p.created || 0) - (a.p.created || 0) || b.i - a.i);
    if (F.sort === 'price-asc') list.sort((a, b) => a.p.price - b.p.price);
    if (F.sort === 'price-desc') list.sort((a, b) => b.p.price - a.p.price);

    const wrap = $('#prodList');
    if (!list.length) { wrap.innerHTML = `<div class="empty"><svg><use href="#i-daisy"/></svg><b>No products here yet</b><span>Add one with the yellow button.</span></div>`; return; }
    const canMove = F.sort === 'order';
    wrap.innerHTML = list.map(({ p, i }) => `
      <article class="prow ${p.hidden ? 'is-hidden' : ''}" data-id="${esc(p.id)}">
        <div class="prow__thumb">${thumbOf(p) ? `<img src="${esc(thumbOf(p))}" alt="" loading="lazy" />` : ''}</div>
        <div class="prow__info">
          <div class="prow__names"><b>${esc(p.en)}</b><span dir="rtl">${esc(p.ar)}</span></div>
          <div class="prow__meta">
            <span class="prow__price"><b>${money(p.price)}</b>${onSale(p) ? `<s>${money(p.old)}</s><em>−${pct(p)}%</em>` : ''}</span>
            <span>·</span><span>${esc(catName(p.cat))}</span>
            <span class="prow__badges">
              ${onSale(p) ? '<span class="badge badge--sale">Sale</span>' : ''}
              ${!p.stock ? '<span class="badge badge--out">Sold out</span>' : ''}
              ${p.hidden ? '<span class="badge badge--hidden">Hidden</span>' : ''}
              ${p.tag ? `<span class="badge badge--tag">${esc(TAGS[p.tag] || p.tag)}</span>` : ''}
            </span>
          </div>
        </div>
        <div class="prow__side">
          <div class="prow__toggles">
            <label class="switch"><input type="checkbox" data-stock="${esc(p.id)}" ${p.stock ? 'checked' : ''}><i></i><span>In stock</span></label>
            <button class="ibtn" type="button" data-hide="${esc(p.id)}" title="${p.hidden ? 'Show on site' : 'Hide from site'}" aria-label="Toggle visibility"><svg><use href="#${p.hidden ? 'i-eye-off' : 'i-eye'}"/></svg></button>
          </div>
          <div class="prow__actions" data-actions>
            <button class="ibtn" type="button" data-move="${esc(p.id)}:-1" title="Move up" ${!canMove || i === 0 ? 'disabled' : ''}><svg><use href="#i-up"/></svg></button>
            <button class="ibtn" type="button" data-move="${esc(p.id)}:1" title="Move down" ${!canMove || i === catalog.products.length - 1 ? 'disabled' : ''}><svg><use href="#i-down"/></svg></button>
            <button class="ibtn" type="button" data-edit="${esc(p.id)}" title="Edit"><svg><use href="#i-edit"/></svg></button>
            <button class="ibtn" type="button" data-dup="${esc(p.id)}" title="Duplicate"><svg><use href="#i-copy"/></svg></button>
            <button class="ibtn ibtn--danger" type="button" data-del="${esc(p.id)}" title="Delete"><svg><use href="#i-trash"/></svg></button>
          </div>
        </div>
      </article>`).join('');
  }

  $('#prodChips').addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) { F.cat = b.dataset.chip; renderProducts(); } });
  $('#prodList').addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.stock) { const p = byId(t.dataset.stock); if (p) { p.stock = t.checked; changed(); renderProducts(); toast(p.stock ? `${p.en} is back in stock` : `${p.en} marked sold out`); } }
  });
  $('#prodList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.hide) { const p = byId(d.hide); p.hidden = !p.hidden; changed(); renderProducts(); }
    else if (d.edit) openEditor(d.edit);
    else if (d.dup) duplicate(d.dup);
    else if (d.move) { const [id, dir] = d.move.split(':'); move(catalog.products, catalog.products.findIndex((p) => p.id === id), Number(dir)); changed(); renderProducts(); }
    else if (d.del) confirmInline(b.closest('[data-actions]'), `Delete “${byId(d.del).en}”?`, () => { catalog.products = catalog.products.filter((p) => p.id !== d.del); changed(); renderProducts(); toast('Product deleted'); }, renderProducts);
    else if (d.confirmNo !== undefined || d.confirmYes !== undefined) { /* handled by confirmInline */ }
  });

  const byId = (id) => catalog.products.find((p) => p.id === id);
  function move(arr, i, dir) { const j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  function confirmInline(host, text, yes, no) {
    const old = host.innerHTML;
    host.innerHTML = `<span class="prow__confirm">${esc(text)} <button class="btn btn--danger btn--xs" type="button" data-yes>Yes, delete</button><button class="btn btn--soft btn--xs" type="button" data-no>No</button></span>`;
    host.querySelector('[data-yes]').addEventListener('click', (e) => { e.stopPropagation(); yes(); });
    host.querySelector('[data-no]').addEventListener('click', (e) => { e.stopPropagation(); host.innerHTML = old; if (no) no(); });
  }
  function uniqueId(base) { let id = base; while (byId(id)) id = `${base}-${rnd(3)}`; return id; }
  function duplicate(id) {
    const src = byId(id); if (!src) return;
    const copy = deepClone(src); copy.id = uniqueId(`${slugify(src.en)}-${rnd(3)}`); copy.en = `${src.en} (copy)`; copy.created = Date.now();
    const i = catalog.products.indexOf(src); catalog.products.splice(i + 1, 0, copy);
    changed(); renderProducts(); toast('Duplicated – edit the copy'); openEditor(copy.id);
  }

  /* ================= PRODUCT EDITOR ================= */
  const panel = $('#panel'), panelBg = $('#panelBg');
  let draft = null, draftIsNew = false;
  const PRESETS = [['S', 'M', 'L', 'XL'], ['S/M', 'L/XL'], ['One size'], ['36–37', '38–39', '40–41']];

  function openEditor(id) {
    const src = id ? byId(id) : null;
    draftIsNew = !src;
    draft = src ? deepClone(src) : { id: `p-${rnd(5)}`, cat: (catalog.cats[0] || {}).id || '', en: '', ar: '', price: 0, old: null, img: '', thumb: '', imgs: [], sizes: ['S', 'M', 'L', 'XL'], colors: [], tag: '', den: '', dar: '', stock: true, hidden: false, created: Date.now() };
    panel.innerHTML = editorHTML(draft);
    panel.hidden = false; panelBg.hidden = false; document.body.style.overflow = 'hidden';
    bindEditor();
    setTimeout(() => { const f = $('[name="en"]', panel); if (f && draftIsNew) f.focus(); }, 60);
  }
  function closeEditor() { panel.hidden = true; panelBg.hidden = true; panel.innerHTML = ''; draft = null; document.body.style.overflow = ''; }
  panelBg.addEventListener('click', closeEditor);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closeEditor(); });

  function editorHTML(p) {
    const sale = onSale(p);
    return `
      <header class="panel__head">
        <div><h2>${draftIsNew ? 'New product' : 'Edit product'}</h2><span class="id">${esc(p.id)}</span></div>
        <button class="ibtn" type="button" data-close aria-label="Close"><svg><use href="#i-x"/></svg></button>
      </header>
      <div class="panel__body">
        <section class="sect">
          <h3 class="sect__title">Photos</h3>
          <div class="photos">
            <div>
              ${dropHTML('main', p.img, 'Main photo')}
              <p class="drop__status" data-status="main"></p>
            </div>
            <div>
              <p class="hint" style="margin-bottom:.6rem">Extra photos (up to 4) shown in the quick view. Phone photos are fine: every photo is compressed in your browser before upload.</p>
              <div class="extras" data-extras>${extrasHTML(p)}</div>
              <p class="drop__status" data-status="extra"></p>
            </div>
          </div>
        </section>

        <section class="sect">
          <h3 class="sect__title">Names</h3>
          <div class="grid2">
            <label class="field"><span>Name (English)</span><input name="en" value="${esc(p.en)}" placeholder="Cloud cotton pajama set" /></label>
            <label class="field"><span>Name (Arabic)</span><input name="ar" dir="rtl" value="${esc(p.ar)}" placeholder="طقم بيجاما قطن" /></label>
          </div>
          <div class="grid2">
            <label class="field"><span>Category</span><select class="select" name="cat">${catalog.cats.map((c) => `<option value="${esc(c.id)}" ${c.id === p.cat ? 'selected' : ''}>${esc(c.en)} · ${esc(c.ar)}</option>`).join('')}</select></label>
            <label class="field"><span>Tag</span><select class="select" name="tag"><option value="">None</option>${Object.entries(TAGS).map(([k, v]) => `<option value="${k}" ${p.tag === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          </div>
        </section>

        <section class="sect">
          <h3 class="sect__title">Price & discount <label class="switch switch--yellow"><input type="checkbox" name="sale" ${sale ? 'checked' : ''}><i></i><span>On sale</span></label></h3>
          <div class="discount">
            <label class="field"><span>Price (USD)</span><input name="price" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(p.price)}" /></label>
            <div class="grid2" data-salefields ${sale ? '' : 'hidden'}>
              <label class="field"><span>Old price</span><input name="old" type="number" min="0" step="0.5" inputmode="decimal" value="${sale ? esc(p.old) : ''}" /></label>
              <label class="field"><span>% off</span><input name="pct" type="number" min="1" max="90" step="1" inputmode="numeric" value="${sale ? pct(p) : ''}" /></label>
            </div>
            <p class="discount__sum" data-salesum ${sale ? '' : 'hidden'}></p>
          </div>
          <p class="field__hint" data-salehint hidden>The old price must be higher than the price.</p>
        </section>

        <section class="sect">
          <h3 class="sect__title">Sizes</h3>
          <div class="sizes" data-sizes></div>
          <div class="presets">${PRESETS.map((s, i) => `<button type="button" data-preset="${i}">${s.join(' · ')}</button>`).join('')}</div>
        </section>

        <section class="sect">
          <h3 class="sect__title">Colours <button class="btn btn--soft btn--xs" type="button" data-newcolor-toggle>+ New colour</button></h3>
          <div class="colors" data-colors></div>
          <div class="newcolor" data-newcolor hidden>
            <label class="field"><span>Name (EN)</span><input data-nc="en" placeholder="Lilac" /></label>
            <label class="field"><span>Name (AR)</span><input data-nc="ar" dir="rtl" placeholder="ليلكي" /></label>
            <label class="field"><span>Colour</span><input data-nc="hex" type="color" value="#D9C6E6" /></label>
            <button class="btn btn--dark btn--sm" type="button" data-nc-add>Add</button>
          </div>
        </section>

        <section class="sect">
          <h3 class="sect__title">Description</h3>
          <label class="field"><span>English</span><textarea name="den" placeholder="Soft brushed cotton, long sleeve + trousers.">${esc(p.den)}</textarea></label>
          <label class="field"><span>Arabic</span><textarea name="dar" dir="rtl" placeholder="قطن ناعم مفرّش، كم طويل وبنطلون.">${esc(p.dar)}</textarea></label>
        </section>

        <section class="sect">
          <h3 class="sect__title">Availability</h3>
          <div class="row" style="gap:1.6rem">
            <label class="switch"><input type="checkbox" name="stock" ${p.stock ? 'checked' : ''}><i></i><span>In stock</span></label>
            <label class="switch"><input type="checkbox" name="visible" ${p.hidden ? '' : 'checked'}><i></i><span>Visible on site</span></label>
          </div>
          <p class="hint">Sold-out items stay visible with a “Sold out” badge and can’t be added to the bag. Hidden items don’t appear at all.</p>
        </section>
      </div>
      <footer class="panel__foot">
        ${draftIsNew ? '<span></span>' : '<button class="btn btn--ghost btn--sm" type="button" data-delete style="color:var(--bad)"><svg><use href="#i-trash"/></svg><span>Delete</span></button>'}
        <div class="row">
          <button class="btn btn--ghost" type="button" data-close>Cancel</button>
          <button class="btn btn--primary" type="button" data-save>${draftIsNew ? 'Add product' : 'Save changes'}</button>
        </div>
      </footer>`;
  }
  function dropHTML(kind, url, label, wide = false) {
    return `<div class="drop ${wide ? 'drop--wide' : ''} ${url ? 'has-img' : ''}" data-drop="${kind}">
      <input type="file" accept="image/*" data-file="${kind}" />
      ${url ? `<img src="${esc(url)}" alt="" /><div class="drop__over"><span class="btn btn--sm" style="background:#fff">Replace</span></div>`
            : `<svg><use href="#i-image"/></svg><p><b>${esc(label)}</b><br>Click, drop or paste a photo</p>`}
    </div>`;
  }
  function extrasHTML(p) {
    const tiles = (p.imgs || []).map((u, i) => `<div class="extra"><img src="${esc(u)}" alt="" /><button class="ibtn ibtn--danger" type="button" data-rm-extra="${i}" aria-label="Remove"><svg><use href="#i-x"/></svg></button></div>`);
    if ((p.imgs || []).length < 4) tiles.push(`<label class="extra extra--add"><input type="file" accept="image/*" multiple data-file="extra" /><svg><use href="#i-plus"/></svg>Add</label>`);
    return tiles.join('');
  }
  function sizesHTML(p) {
    return p.sizes.map((s, i) => `<span class="size">${esc(s)}<button type="button" data-rm-size="${i}" aria-label="Remove"><svg><use href="#i-x"/></svg></button></span>`).join('') +
      `<input type="text" data-add-size placeholder="Type a size, press Enter" />`;
  }
  function colorsHTML(p) {
    return Object.entries(catalog.colors).map(([k, c]) => `<label class="color ${p.colors.includes(k) ? 'is-on' : ''}"><input type="checkbox" data-color="${esc(k)}" ${p.colors.includes(k) ? 'checked' : ''}><i style="background:${esc(c.hex)}"></i><span>${esc(c.en)} <small dir="rtl">${esc(c.ar)}</small></span></label>`).join('');
  }

  function bindEditor() {
    const P = panel;
    $('[data-sizes]', P).innerHTML = sizesHTML(draft);
    $('[data-colors]', P).innerHTML = colorsHTML(draft);
    updateSaleSummary();

    $$('[data-close]', P).forEach((b) => b.addEventListener('click', closeEditor));
    const del = $('[data-delete]', P);
    if (del) del.addEventListener('click', () => confirmInline(del.parentElement, `Delete “${draft.en}”?`, () => { catalog.products = catalog.products.filter((p) => p.id !== draft.id); changed(); closeEditor(); renderProducts(); toast('Product deleted'); }));
    $('[data-save]', P).addEventListener('click', saveDraft);

    // text fields
    P.addEventListener('input', (e) => {
      const t = e.target, n = t.name;
      if (!n) return;
      if (['en', 'ar', 'den', 'dar', 'cat', 'tag'].includes(n)) draft[n] = t.value;
      if (n === 'price') { draft.price = Number(t.value) || 0; if (onSaleUI()) syncFromPct(); updateSaleSummary(); }
      if (n === 'old') { draft.old = t.value === '' ? null : Number(t.value); const pf = $('[name="pct"]', P); pf.value = draft.old > draft.price ? Math.round((1 - draft.price / draft.old) * 100) : ''; updateSaleSummary(); }
      if (n === 'pct') syncFromPct();
    });
    P.addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'sale') { $('[data-salefields]', P).hidden = !t.checked; $('[data-salesum]', P).hidden = !t.checked; if (!t.checked) { draft.old = null; } else if (!draft.old) { $('[name="pct"]', P).value = 20; syncFromPct(); } updateSaleSummary(); }
      if (t.name === 'stock') draft.stock = t.checked;
      if (t.name === 'visible') draft.hidden = !t.checked;
      if (t.name === 'cat' || t.name === 'tag') draft[t.name] = t.value;
      if (t.dataset.color !== undefined) { const k = t.dataset.color; draft.colors = t.checked ? [...new Set([...draft.colors, k])] : draft.colors.filter((c) => c !== k); t.closest('.color').classList.toggle('is-on', t.checked); }
      if (t.dataset.file === 'main') handleMainFile(t.files[0]);
      if (t.dataset.file === 'extra') handleExtraFiles([...t.files]);
    });
    P.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.rmSize !== undefined) { draft.sizes.splice(Number(d.rmSize), 1); $('[data-sizes]', P).innerHTML = sizesHTML(draft); }
      if (d.preset !== undefined) { draft.sizes = [...PRESETS[Number(d.preset)]]; $('[data-sizes]', P).innerHTML = sizesHTML(draft); }
      if (d.rmExtra !== undefined) { draft.imgs.splice(Number(d.rmExtra), 1); $('[data-extras]', P).innerHTML = extrasHTML(draft); }
      if (d.newcolorToggle !== undefined) { const nc = $('[data-newcolor]', P); nc.hidden = !nc.hidden; if (!nc.hidden) $('[data-nc="en"]', P).focus(); }
      if (d.ncAdd !== undefined) addColor();
    });
    P.addEventListener('keydown', (e) => {
      if (e.target.dataset.addSize !== undefined && e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v && !draft.sizes.includes(v)) { draft.sizes.push(v); $('[data-sizes]', P).innerHTML = sizesHTML(draft); $('[data-add-size]', P).focus(); } }
      if (e.target.dataset.nc !== undefined && e.key === 'Enter') { e.preventDefault(); addColor(); }
    });
    // drag & drop + paste
    const drop = $('[data-drop="main"]', P);
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleMainFile(f); });
    P.addEventListener('paste', (e) => { const f = [...(e.clipboardData.files || [])].find((x) => x.type.startsWith('image/')); if (f) { e.preventDefault(); handleMainFile(f); } });

    function onSaleUI() { return $('[name="sale"]', P).checked; }
    function syncFromPct() {
      const pf = $('[name="pct"]', P), of = $('[name="old"]', P);
      const v = Number(pf.value);
      if (v >= 1 && v <= 90 && draft.price > 0) { draft.old = Math.round(draft.price / (1 - v / 100)); of.value = draft.old; }
      updateSaleSummary();
    }
    function updateSaleSummary() {
      const sum = $('[data-salesum]', P), hint = $('[data-salehint]', P);
      if (!onSaleUI()) { hint.hidden = true; return; }
      const bad = !(draft.old > draft.price);
      hint.hidden = !bad;
      sum.innerHTML = bad ? 'Enter an old price higher than the current price.' : `Customers see <b>${money(draft.price)}</b> <s>${money(draft.old)}</s> · <b>−${pct(draft)}%</b> badge · listed in Offers automatically.`;
    }
    function addColor() {
      const en = $('[data-nc="en"]', P).value.trim(), ar = $('[data-nc="ar"]', P).value.trim(), hex = $('[data-nc="hex"]', P).value;
      if (!en) { toast('Give the colour an English name', 'bad'); return; }
      let key = slugify(en).replace(/-/g, ''); while (catalog.colors[key]) key = `${key}${rnd(2)}`;
      catalog.colors[key] = { en, ar: ar || en, hex };
      draft.colors.push(key);
      $('[data-colors]', P).innerHTML = colorsHTML(draft);
      $('[data-newcolor]', P).hidden = true; $('[data-nc="en"]', P).value = ''; $('[data-nc="ar"]', P).value = '';
      changed(); toast(`Colour “${en}” added`);
    }
  }

  async function handleMainFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const st = $('[data-status="main"]', panel); const drop = $('[data-drop="main"]', panel);
    try {
      st.className = 'drop__status is-busy'; st.textContent = 'Compressing…';
      const big = await compressImage(file, 1200, 0.82);
      const small = await compressImage(file, 480, 0.78);
      st.textContent = `Uploading… (${fmtBytes(file.size)} → ${fmtBytes(big.size)})`;
      const base = `${draft.id}-${Date.now()}`;
      const r1 = await uploadBlob(big, `${base}.${ext(big)}`);
      const r2 = await uploadBlob(small, `${base}_s.${ext(small)}`);
      draft.img = r1.url; draft.thumb = r2.url;
      drop.outerHTML = dropHTML('main', draft.img, 'Main photo');
      const nd = $('[data-drop="main"]', panel);
      ['dragenter', 'dragover'].forEach((ev) => nd.addEventListener(ev, (e) => { e.preventDefault(); nd.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((ev) => nd.addEventListener(ev, (e) => { e.preventDefault(); nd.classList.remove('is-over'); }));
      nd.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleMainFile(f); });
      st.className = 'drop__status is-ok'; st.textContent = `Done · ${fmtBytes(file.size)} → ${fmtBytes(big.size)} (+ ${fmtBytes(small.size)} thumbnail)`;
    } catch (e) {
      st.className = 'drop__status is-bad'; st.textContent = e.message === 'unauthorized' ? 'Session expired' : `Upload failed: ${e.message}`;
    }
  }
  async function handleExtraFiles(files) {
    const st = $('[data-status="extra"]', panel);
    const room = 4 - (draft.imgs || []).length;
    files = files.filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (!files.length) { if (room <= 0) toast('Maximum 4 extra photos', 'bad'); return; }
    let n = 0;
    for (const f of files) {
      n++;
      try {
        st.className = 'drop__status is-busy'; st.textContent = `Photo ${n}/${files.length}: compressing…`;
        const b = await compressImage(f, 1200, 0.82);
        st.textContent = `Photo ${n}/${files.length}: uploading (${fmtBytes(f.size)} → ${fmtBytes(b.size)})…`;
        const r = await uploadBlob(b, `${draft.id}-${Date.now()}-${n}.${ext(b)}`);
        draft.imgs.push(r.url);
        $('[data-extras]', panel).innerHTML = extrasHTML(draft);
      } catch (e) { st.className = 'drop__status is-bad'; st.textContent = `Upload failed: ${e.message}`; return; }
    }
    st.className = 'drop__status is-ok'; st.textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added`;
  }
  const ext = (blob) => blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';

  async function uploadBlob(blob, key) {
    const res = await api('/api/upload', { method: 'POST', headers: { 'x-key': key, 'content-type': blob.type }, body: blob });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
    return data;
  }

  /** Resize + re-encode a photo in the browser. Long edge ≤ maxEdge, WebP (JPEG fallback). */
  async function compressImage(file, maxEdge, quality) {
    const bmp = await loadBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    let blob = await toBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
    if (!blob) throw new Error('could not encode image');
    return blob;
  }
  const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));
  async function loadBitmap(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fall through */ }
    }
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); }; img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('cannot read image')); };
      img.src = url;
    });
  }

  function saveDraft() {
    const p = draft;
    const problems = [];
    if (!p.en.trim()) problems.push('English name');
    if (!p.ar.trim()) problems.push('Arabic name');
    if (!p.cat) problems.push('category');
    if (!p.img) problems.push('main photo');
    if (!(Number(p.price) >= 0)) problems.push('price');
    if ($('[name="sale"]', panel).checked && !(p.old > p.price)) problems.push('old price (must be higher than price)');
    if (!$('[name="sale"]', panel).checked) p.old = null;
    if (!p.sizes.length) problems.push('at least one size');
    if (!p.colors.length) problems.push('at least one colour');
    if (problems.length) { toast(`Missing: ${problems.join(', ')}`, 'bad'); return; }
    if (draftIsNew) {
      p.id = uniqueId(`${slugify(p.en)}-${rnd(3)}`);
      catalog.products.unshift(p);
    } else {
      const i = catalog.products.findIndex((x) => x.id === p.id);
      if (i >= 0) catalog.products[i] = p; else catalog.products.unshift(p);
    }
    changed(); closeEditor(); renderProducts(); if (view === 'offers') renderOffers();
    toast(draftIsNew ? 'Product added' : 'Product saved', 'ok');
  }

  /* ================= CATEGORIES ================= */
  $('#addCat').addEventListener('click', () => {
    const host = $('#catNew'); host.hidden = false;
    host.innerHTML = `
      <h2 class="h2">New category</h2>
      <div class="grid2">
        <label class="field"><span>Name (English)</span><input data-cn="en" placeholder="Sleep masks" /></label>
        <label class="field"><span>Name (Arabic)</span><input data-cn="ar" dir="rtl" placeholder="أقنعة نوم" /></label>
      </div>
      <label class="field"><span>Id <small>(letters, numbers, dashes · used in links · cannot be changed later)</small></span><input data-cn="id" placeholder="sleep-masks" /></label>
      <div class="row" style="justify-content:flex-end"><button class="btn btn--ghost" type="button" data-cn-cancel>Cancel</button><button class="btn btn--primary" type="button" data-cn-save>Add category</button></div>`;
    const idF = $('[data-cn="id"]', host), enF = $('[data-cn="en"]', host);
    let idTouched = false;
    enF.addEventListener('input', () => { if (!idTouched) idF.value = slugify(enF.value); });
    idF.addEventListener('input', () => { idTouched = true; });
    $('[data-cn-cancel]', host).addEventListener('click', () => { host.hidden = true; host.innerHTML = ''; });
    $('[data-cn-save]', host).addEventListener('click', () => {
      const en = enF.value.trim(), ar = $('[data-cn="ar"]', host).value.trim(), id = idF.value.trim().toLowerCase();
      if (!en || !ar) { toast('Both names are required', 'bad'); return; }
      if (!ID_RE.test(id) || id === 'all') { toast('Id must be letters/numbers/dashes and not "all"', 'bad'); return; }
      if (catalog.cats.some((c) => c.id === id)) { toast('That id already exists', 'bad'); return; }
      catalog.cats.push({ id, en, ar }); changed(); host.hidden = true; host.innerHTML = ''; renderCategories(); toast(`Category “${en}” added`, 'ok');
    });
    enF.focus();
  });

  function renderCategories() {
    const counts = {}; catalog.products.forEach((p) => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    const wrap = $('#catList');
    if (!catalog.cats.length) { wrap.innerHTML = `<div class="empty"><svg><use href="#i-daisy"/></svg><b>No categories</b><span>Add at least one before adding products.</span></div>`; return; }
    wrap.innerHTML = catalog.cats.map((c, i) => `
      <div class="crow" data-cat="${esc(c.id)}">
        <div class="crow__order">
          <button class="ibtn" type="button" data-cmove="${i}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up"><svg><use href="#i-up"/></svg></button>
          <button class="ibtn" type="button" data-cmove="${i}:1" ${i === catalog.cats.length - 1 ? 'disabled' : ''} aria-label="Move down"><svg><use href="#i-down"/></svg></button>
        </div>
        <label class="field"><span>EN</span><input data-cf="en" value="${esc(c.en)}" placeholder="English name" /></label>
        <label class="field"><span>AR</span><input data-cf="ar" dir="rtl" value="${esc(c.ar)}" placeholder="الاسم بالعربية" /></label>
        <div><div class="crow__count">${counts[c.id] || 0} product${counts[c.id] === 1 ? '' : 's'}</div><div class="crow__id">${esc(c.id)}</div></div>
        <button class="ibtn ibtn--danger" type="button" data-cdel="${esc(c.id)}" aria-label="Delete"><svg><use href="#i-trash"/></svg></button>
        <div class="confirm" data-cconfirm hidden style="grid-column:1/-1"></div>
      </div>`).join('');
  }
  $('#catList').addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset.cf) return;
    const c = catalog.cats.find((x) => x.id === t.closest('[data-cat]').dataset.cat); if (c) { c[t.dataset.cf] = t.value; changed(); }
  });
  $('#catList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.cmove) { const [i, dir] = d.cmove.split(':').map(Number); move(catalog.cats, i, dir); changed(); renderCategories(); }
    if (d.cdel) {
      const id = d.cdel, c = catalog.cats.find((x) => x.id === id);
      const n = catalog.products.filter((p) => p.cat === id).length;
      const others = catalog.cats.filter((x) => x.id !== id);
      const box = $(`[data-cat="${CSS.escape(id)}"] [data-cconfirm]`);
      box.hidden = false;
      box.innerHTML = n && !others.length
        ? `<span>“${esc(c.en)}” has ${n} product${n > 1 ? 's' : ''} and there is no other category to move them to. Add another category first.</span><div class="row"><button class="btn btn--soft btn--xs" type="button" data-cc-no>Close</button></div>`
        : `<span>Delete “${esc(c.en)}”?${n ? ` Move its <b>${n}</b> product${n > 1 ? 's' : ''} to <select class="select" data-cc-target style="display:inline-block;width:auto;min-height:34px;padding:.3em 2.2em .3em .8em;margin:0 .3em">${others.map((o) => `<option value="${esc(o.id)}">${esc(o.en)}</option>`).join('')}</select>` : ''}</span>
           <div class="row"><button class="btn btn--soft btn--xs" type="button" data-cc-no>Cancel</button><button class="btn btn--danger btn--xs" type="button" data-cc-yes>Delete category</button></div>`;
      $('[data-cc-no]', box).addEventListener('click', () => { box.hidden = true; });
      const yes = $('[data-cc-yes]', box);
      if (yes) yes.addEventListener('click', () => {
        const target = $('[data-cc-target]', box); const to = target ? target.value : null;
        if (n && to) catalog.products.forEach((p) => { if (p.cat === id) p.cat = to; });
        catalog.cats = catalog.cats.filter((x) => x.id !== id);
        if (F.cat === id) F.cat = 'all';
        changed(); renderCategories(); toast(`Category “${c.en}” deleted`);
      });
    }
  });

  /* ================= OFFERS ================= */
  $('#addDeal').addEventListener('click', () => {
    catalog.deals.push({ id: `deal-${rnd(5)}`, en: '', ar: '', sub_en: '', sub_ar: '', cat: 'all' });
    changed(); renderOffers();
    const last = $('#dealList .dcard:last-child input'); if (last) last.focus();
  });
  function renderOffers() {
    const sale = catalog.products.filter(onSale);
    $('#saleList').innerHTML = sale.length ? sale.map((p) => `
      <div class="srow">
        <img src="${esc(thumbOf(p))}" alt="" loading="lazy" />
        <div><b>${esc(p.en)}</b> <span dir="rtl" style="color:var(--soft)">${esc(p.ar)}</span><div class="srow__p"><b>${money(p.price)}</b> <s>${money(p.old)}</s> · −${pct(p)}% · ${esc(catName(p.cat))}${!p.stock ? ' · <span class="badge badge--out">Sold out</span>' : ''}${p.hidden ? ' · <span class="badge badge--hidden">Hidden</span>' : ''}</div></div>
        <div class="row"><button class="btn btn--ghost btn--xs" type="button" data-edit="${esc(p.id)}">Edit</button><button class="btn btn--soft btn--xs" type="button" data-endsale="${esc(p.id)}">End sale</button></div>
      </div>`).join('')
      : `<div class="empty"><svg><use href="#i-daisy"/></svg><b>Nothing on sale right now</b><span>Open a product → Price & discount → On sale.</span></div>`;

    $('#dealList').innerHTML = catalog.deals.length ? catalog.deals.map((d, i) => `
      <div class="dcard" data-deal="${i}">
        <div class="dcard__head"><b>Offer card ${i + 1}</b><div class="row">
          <button class="ibtn" type="button" data-dmove="${i}:-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up"><svg><use href="#i-up"/></svg></button>
          <button class="ibtn" type="button" data-dmove="${i}:1" ${i === catalog.deals.length - 1 ? 'disabled' : ''} aria-label="Move down"><svg><use href="#i-down"/></svg></button>
          <button class="ibtn ibtn--danger" type="button" data-ddel="${i}" aria-label="Delete"><svg><use href="#i-trash"/></svg></button></div></div>
        <div class="grid2">
          <label class="field"><span>Title (EN)</span><input data-df="en" value="${esc(d.en)}" placeholder="Free delivery in Saida over $40" /></label>
          <label class="field"><span>Title (AR)</span><input data-df="ar" dir="rtl" value="${esc(d.ar)}" placeholder="توصيل مجاني داخل صيدا" /></label>
          <label class="field"><span>Subtitle (EN)</span><input data-df="sub_en" value="${esc(d.sub_en)}" placeholder="Rest of Lebanon: flat delivery fee" /></label>
          <label class="field"><span>Subtitle (AR)</span><input data-df="sub_ar" dir="rtl" value="${esc(d.sub_ar)}" placeholder="باقي لبنان: رسم توصيل ثابت" /></label>
        </div>
        <label class="field" style="max-width:320px"><span>“Shop this offer” opens</span><select class="select" data-df="cat"><option value="all" ${d.cat === 'all' ? 'selected' : ''}>All products</option>${catalog.cats.map((c) => `<option value="${esc(c.id)}" ${d.cat === c.id ? 'selected' : ''}>${esc(c.en)}</option>`).join('')}</select></label>
        <div class="confirm" data-dconfirm hidden></div>
      </div>`).join('')
      : `<div class="empty"><svg><use href="#i-daisy"/></svg><b>No offer cards</b><span>Add one for free delivery, gift wrapping, bundles…</span></div>`;
  }
  $('#saleList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) openEditor(b.dataset.edit);
    if (b.dataset.endsale) { const p = byId(b.dataset.endsale); p.old = null; changed(); renderOffers(); toast(`Sale ended for ${p.en}`); }
  });
  $('#dealList').addEventListener('input', (e) => {
    const t = e.target; if (!t.dataset.df) return;
    const d = catalog.deals[Number(t.closest('[data-deal]').dataset.deal)]; if (d) { d[t.dataset.df] = t.value; changed(); }
  });
  $('#dealList').addEventListener('change', (e) => {
    const t = e.target; if (t.dataset.df === 'cat') { const d = catalog.deals[Number(t.closest('[data-deal]').dataset.deal)]; d.cat = t.value; changed(); }
  });
  $('#dealList').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.dmove) { const [i, dir] = d.dmove.split(':').map(Number); move(catalog.deals, i, dir); changed(); renderOffers(); }
    if (d.ddel) {
      const i = Number(d.ddel); const box = $(`[data-deal="${i}"] [data-dconfirm]`); box.hidden = false;
      box.innerHTML = `<span>Delete this offer card?</span><div class="row"><button class="btn btn--soft btn--xs" type="button" data-no>Cancel</button><button class="btn btn--danger btn--xs" type="button" data-yes>Delete</button></div>`;
      $('[data-no]', box).addEventListener('click', () => { box.hidden = true; });
      $('[data-yes]', box).addEventListener('click', () => { catalog.deals.splice(i, 1); changed(); renderOffers(); toast('Offer card deleted'); });
    }
  });

  /* ================= ABOUT ================= */
  function renderAbout() {
    const a = catalog.about;
    const txt = (path, label, dir = '', tall = false, hint = '') => {
      const val = get(a, path);
      return `<label class="field"><span>${label}${hint ? ` <small>${hint}</small>` : ''}</span><textarea data-ab="${path}" ${dir ? `dir="${dir}"` : ''} class="${tall ? 'tall' : ''}">${esc(val)}</textarea><span class="count" data-count="${path}">${String(val || '').length} characters</span></label>`;
    };
    const inp = (path, label, dir = '') => `<label class="field"><span>${label}</span><input data-ab="${path}" ${dir ? `dir="${dir}"` : ''} value="${esc(get(a, path))}" /></label>`;
    $('#aboutForm').innerHTML = `
      <div class="about">
        <div class="card">
          <h2 class="h2">About section (home page)</h2>
          <div class="grid2">${inp('title.en', 'Title (EN)')}${inp('title.ar', 'Title (AR)', 'rtl')}</div>
          <div class="grid2">${txt('body.en', 'Intro paragraph (EN)')}${txt('body.ar', 'Intro paragraph (AR)', 'rtl')}</div>
        </div>
        <div class="card">
          <h2 class="h2">Photos</h2>
          <div class="grid2">
            <div><p class="field"><span>Main photo <small>(home + about page)</small></span></p>${dropHTML('about1', a.img, 'Main photo', true)}<p class="drop__status" data-status="about1"></p>
              <div class="grid2" style="margin-top:.8rem">${inp('cap.en', 'Caption (EN)')}${inp('cap.ar', 'Caption (AR)', 'rtl')}</div></div>
            <div><p class="field"><span>Second photo <small>(about page)</small></span></p>${dropHTML('about2', a.img2, 'Second photo', true)}<p class="drop__status" data-status="about2"></p></div>
          </div>
        </div>
        <div class="card">
          <h2 class="h2">Four pillars</h2>
          ${a.pillars.slice(0, 4).map((p, i) => `
            <div class="pillar"><span class="pillar__n">${i + 1}</span><div class="pillar__fields">
              <div class="grid2">${inp(`pillars.${i}.en`, 'Title (EN)')}${inp(`pillars.${i}.ar`, 'Title (AR)', 'rtl')}</div>
              <div class="grid2">${inp(`pillars.${i}.den`, 'One line (EN)')}${inp(`pillars.${i}.dar`, 'One line (AR)', 'rtl')}</div>
            </div></div>`).join('')}
        </div>
        <div class="card">
          <h2 class="h2">About page story</h2>
          <p class="hint">The long version shown on the About page. <b>Blank line = new paragraph.</b></p>
          ${txt('story.en', 'Story (EN)', '', true)}
          ${txt('story.ar', 'Story (AR)', 'rtl', true)}
        </div>
      </div>`;
    const f = $('#aboutForm');
    f.addEventListener('input', onAboutInput);
    f.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.file === 'about1') handleAboutFile(t.files[0], 'about1', 'img');
      if (t.dataset.file === 'about2') handleAboutFile(t.files[0], 'about2', 'img2');
    });
    ['about1', 'about2'].forEach((k) => {
      const d = $(`[data-drop="${k}"]`, f); if (!d) return;
      ['dragenter', 'dragover'].forEach((ev) => d.addEventListener(ev, (e) => { e.preventDefault(); d.classList.add('is-over'); }));
      ['dragleave', 'drop'].forEach((ev) => d.addEventListener(ev, (e) => { e.preventDefault(); d.classList.remove('is-over'); }));
      d.addEventListener('drop', (e) => { const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) handleAboutFile(file, k, k === 'about1' ? 'img' : 'img2'); });
    });
  }
  function onAboutInput(e) {
    const t = e.target; const path = t.dataset.ab; if (!path) return;
    set(catalog.about, path, t.value);
    const c = $(`[data-count="${CSS.escape(path)}"]`); if (c) c.textContent = `${t.value.length} characters`;
    changed();
  }
  async function handleAboutFile(file, kind, field) {
    if (!file || !file.type.startsWith('image/')) return;
    const st = $(`[data-status="${kind}"]`);
    try {
      st.className = 'drop__status is-busy'; st.textContent = 'Compressing…';
      const big = await compressImage(file, 1400, 0.82);
      st.textContent = `Uploading… (${fmtBytes(file.size)} → ${fmtBytes(big.size)})`;
      const r = await uploadBlob(big, `about-${Date.now()}.${ext(big)}`);
      catalog.about[field] = r.url; changed();
      st.className = 'drop__status is-ok'; st.textContent = `Done · ${fmtBytes(file.size)} → ${fmtBytes(big.size)}`;
      renderAbout(); $(`[data-status="${kind}"]`).className = 'drop__status is-ok'; $(`[data-status="${kind}"]`).textContent = st.textContent;
    } catch (e) { st.className = 'drop__status is-bad'; st.textContent = `Upload failed: ${e.message}`; }
  }
  function get(o, path) { return path.split('.').reduce((x, k) => (x == null ? x : x[k]), o) ?? ''; }
  function set(o, path, v) { const ks = path.split('.'); let x = o; ks.slice(0, -1).forEach((k) => { if (x[k] == null) x[k] = /^\d+$/.test(k) ? [] : {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }

  /* ================= SETTINGS ================= */
  $('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = $('#pwNew').value, b = $('#pwNew2').value;
    if (a.length < 8) { toast('At least 8 characters', 'bad'); return; }
    if (a !== b) { toast('The two passwords do not match', 'bad'); return; }
    try {
      const res = await api('/api/auth', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ next: a }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'could not change password');
      token = a; try { sessionStorage.setItem(TOKEN_KEY, token); } catch (err) {}
      $('#pwNew').value = ''; $('#pwNew2').value = ''; toast('Password updated', 'ok');
    } catch (err) { if (err.message !== 'unauthorized') toast(err.message, 'bad'); }
  });

  $('#exportBtn').addEventListener('click', () => {
    const body = { cats: catalog.cats, products: catalog.products, deals: catalog.deals, colors: catalog.colors, about: catalog.about, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sama-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Backup downloaded', 'ok');
  });
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch (err) { toast('That file is not valid JSON', 'bad'); return; }
    if (!data || !Array.isArray(data.cats) || !Array.isArray(data.products) || !Array.isArray(data.deals) || !data.colors || !data.about) { toast('This does not look like a Sama backup', 'bad'); return; }
    const box = $('#importConfirm'); box.hidden = false;
    box.innerHTML = `<span>Replace the live catalogue with <b>${esc(f.name)}</b> (${data.products.length} products, ${data.cats.length} categories)? Current data will be overwritten.</span>
      <div class="row"><button class="btn btn--soft btn--xs" type="button" data-no>Cancel</button><button class="btn btn--danger btn--xs" type="button" data-yes>Import & publish</button></div>`;
    $('[data-no]', box).addEventListener('click', () => { box.hidden = true; });
    $('[data-yes]', box).addEventListener('click', async () => {
      catalog = normalize(deepClone(data)); box.hidden = true; setSaveState('dirty'); await saveNow(); render(); toast('Backup imported', 'ok');
    });
  });
  $('#resetWord').addEventListener('input', (e) => { $('#resetBtn').disabled = e.target.value.trim() !== 'RESET'; });
  $('#resetBtn').addEventListener('click', async () => {
    if ($('#resetWord').value.trim() !== 'RESET') return;
    catalog = normalize(seedCatalog()); $('#resetWord').value = ''; $('#resetBtn').disabled = true;
    setSaveState('dirty'); await saveNow(); render(); toast('Catalogue reset to seed data', 'ok');
  });
  function renderInfo() {
    if (view !== 'settings' || !catalog) return;
    const newCount = orders.filter((o) => o.status === 'new').length;
    $('#infoBox').innerHTML = `
      <div><b>${catalog.products.length}</b> products · <b>${catalog.products.filter(onSale).length}</b> on sale · <b>${catalog.products.filter((p) => !p.stock).length}</b> sold out · <b>${catalog.products.filter((p) => p.hidden).length}</b> hidden</div>
      <div><b>${catalog.cats.length}</b> categories · <b>${catalog.deals.length}</b> offer cards · <b>${Object.keys(catalog.colors).length}</b> colours</div>
      <div><b>${ordersLoaded ? orders.length : '…'}</b> orders · <b>${ordersLoaded ? newCount : '…'}</b> new${ordersLoaded && newCount ? ' (waiting for confirmation)' : ''}</div>
      <div>Last published: <b>${updatedAt ? new Date(updatedAt).toLocaleString() : 'not yet'}</b></div>
      <div style="margin-top:.4rem">Photos uploaded here are compressed to WebP (≤1200px, plus a 480px thumbnail) so the site stays fast even with many items.</div>`;
  }

  /* ================= ORDERS ================= */
  let orders = [], ordersLoaded = false, ordersTimer = null;
  const OF = { q: '', status: 'all' };
  const STATUS_LABEL = { new: 'New', confirmed: 'Confirmed', delivered: 'Delivered', cancelled: 'Cancelled' };

  async function fetchOrders(silent = true) {
    try {
      const res = await api(`/api/orders?t=${Date.now()}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `could not load orders (${res.status})`);
      orders = Array.isArray(d.orders) ? d.orders : [];
      ordersLoaded = true;
      updateOrdersBadge();
      if (view === 'orders') renderOrdersView();
      if (view === 'settings') renderInfo();
    } catch (e) {
      if (e.message !== 'unauthorized' && !silent) toast(e.message, 'bad');
    }
  }
  function startOrdersPolling() {
    stopOrdersPolling();
    fetchOrders(true);
    ordersTimer = setInterval(() => { if (token && !document.hidden) fetchOrders(true); }, 60000);
  }
  function stopOrdersPolling() { if (ordersTimer) { clearInterval(ordersTimer); ordersTimer = null; } }
  function updateOrdersBadge() {
    const n = orders.filter((o) => o.status === 'new').length;
    const b = $('#ordersBadge'); b.textContent = n; b.hidden = n === 0;
  }

  const relTime = (iso) => {
    const d = new Date(iso); if (isNaN(d)) return '';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) { const h = Math.floor(diff / 3600); return `${h} hour${h > 1 ? 's' : ''} ago`; }
    if (diff < 172800) return 'yesterday';
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} days ago`;
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const fullTime = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString(); };

  /** Normalise a phone as typed by the customer to WhatsApp's international digits. */
  function waDigits(phone) {
    let p = String(phone || '').replace(/[\s\-().]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    else if (p.startsWith('00')) p = p.slice(2);
    if (/^0\d+$/.test(p)) p = '961' + p.slice(1);          // local Lebanese 03 / 07x / 08x
    else if (/^\d{7,8}$/.test(p)) p = '961' + p;            // 76910051 → 96176910051
    return p.replace(/\D/g, '');
  }
  const itemName = (o, it) => (o.lang === 'ar' ? (it.name_ar || it.name_en) : (it.name_en || it.name_ar)) || it.id;
  const orderLines = (o) => (o.items || []).map((it) => `• ${itemName(o, it)} — ${it.size || '-'} / ${it.color || '-'} × ${it.qty}`).join('\n');
  function waMessage(o) {
    const total = money(o.total);
    return o.lang === 'ar'
      ? `مرحباً ${o.name}! معك سما لانجري 🌼 تم تأكيد طلبك ${o.ref}:\n${orderLines(o)}\nالمجموع: ${total} (الدفع عند الاستلام)\nالتوصيل إلى: ${o.address}\nسنراسلك عندما يكون في الطريق. شكراً لك!`
      : `Hi ${o.name}! This is Sama Lingerie 🌼 Your order ${o.ref} is confirmed:\n${orderLines(o)}\nTotal: ${total} (paid on delivery)\nDelivery: ${o.address}\nWe'll message you when it's on its way. Thank you!`;
  }
  const waLink = (o) => `https://wa.me/${waDigits(o.phone)}?text=${encodeURIComponent(waMessage(o))}`;
  function orderSummary(o) {
    return [`Order ${o.ref} · ${STATUS_LABEL[o.status] || o.status} · ${fullTime(o.created_at)}`, `${o.name} · ${o.phone}`, o.address, o.notes ? `Notes: ${o.notes}` : '', '', orderLines(o), `Total: ${money(o.total)} (paid on delivery)`].filter((l) => l !== '').join('\n');
  }

  function renderOrdersView() {
    const counts = { all: orders.length };
    Object.keys(STATUS_LABEL).forEach((s) => { counts[s] = orders.filter((o) => o.status === s).length; });
    $('#orderChips').innerHTML = [['all', 'All'], ...Object.entries(STATUS_LABEL)].map(([k, l]) =>
      `<button type="button" class="chip ${OF.status === k ? 'is-on' : ''}" data-ochip="${k}">${l}<b>${counts[k] || 0}</b></button>`).join('');

    const wrap = $('#orderList');
    if (!ordersLoaded) { wrap.innerHTML = `<div class="empty"><svg><use href="#i-daisy"/></svg><b>Loading orders…</b></div>`; return; }
    let list = orders.slice();
    if (OF.status !== 'all') list = list.filter((o) => o.status === OF.status);
    if (OF.q) list = list.filter((o) => `${o.ref} ${o.name} ${o.phone} ${waDigits(o.phone)}`.toLowerCase().includes(OF.q));
    if (!orders.length) { wrap.innerHTML = `<div class="empty"><svg><use href="#i-daisy"/></svg><b>No orders yet</b><span>They appear here the moment a customer places one.</span></div>`; return; }
    if (!list.length) { wrap.innerHTML = `<div class="empty"><svg><use href="#i-daisy"/></svg><b>No orders match</b><span>Try another filter or search.</span></div>`; return; }
    wrap.innerHTML = list.map(orderCardHTML).join('');
  }

  function orderCardHTML(o) {
    const items = (o.items || []).map((it) => `
      <div class="oitem">
        ${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" />` : '<i></i>'}
        <div><span class="oitem__name" ${o.lang === 'ar' ? 'dir="rtl"' : ''}>${esc(itemName(o, it))}</span><span class="oitem__opts">${esc(it.size || '-')} · ${esc(it.color || '-')} × ${esc(it.qty)}</span></div>
        <span class="oitem__price">${money(Number(it.price) * Number(it.qty))}</span>
      </div>`).join('');
    const st = o.status;
    return `
      <article class="ocard ocard--${esc(st)}" data-oid="${esc(o.id)}">
        <div class="ocard__head">
          <span class="ocard__ref">${esc(o.ref)}</span>
          <span class="opill opill--${esc(st)}">${esc(STATUS_LABEL[st] || st)}</span>
          <span class="ocard__time" title="${esc(fullTime(o.created_at))}">${esc(relTime(o.created_at))}${o.lang === 'ar' ? ' · عربي' : ''}</span>
          <span class="ocard__total">${money(o.total)}</span>
        </div>
        <div class="ocard__grid">
          <div class="ocard__cust">
            <b>${esc(o.name)}</b>
            <span class="line"><svg><use href="#i-phone"/></svg><a href="tel:+${esc(waDigits(o.phone))}">${esc(o.phone)}</a></span>
            ${o.email ? `<span class="line"><svg><use href="#i-mail"/></svg><a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.google_sub ? ' <em class="via-google">Google</em>' : ''}</span>` : ''}
            <span class="line"><svg><use href="#i-pin"/></svg><span>${esc(o.address)}</span></span>
            ${o.notes ? `<div class="ocard__notes"><b>Notes:</b> ${esc(o.notes)}</div>` : ''}
          </div>
          <div class="oitems">${items}</div>
        </div>
        <div class="ocard__actions" data-oactions>
          <a class="btn btn--wa btn--sm" href="${waLink(o)}" target="_blank" rel="noopener" data-owa="${esc(o.id)}"><svg><use href="#i-wa"/></svg><span>Send confirmation on WhatsApp</span></a>
          ${st === 'new' ? `<button class="btn btn--soft btn--sm" type="button" data-ostatus="${esc(o.id)}:confirmed"><svg><use href="#i-check"/></svg><span>Mark confirmed</span></button>` : ''}
          ${st === 'confirmed' ? `<button class="btn btn--dark btn--sm" type="button" data-ostatus="${esc(o.id)}:delivered"><svg><use href="#i-check"/></svg><span>Mark delivered</span></button>` : ''}
          ${st === 'cancelled' ? `<button class="btn btn--soft btn--sm" type="button" data-ostatus="${esc(o.id)}:new">Reopen</button>` : ''}
          <button class="btn btn--ghost btn--sm" type="button" data-ocopy="${esc(o.id)}"><svg><use href="#i-copy"/></svg><span>Copy</span></button>
          <span class="spacer"></span>
          ${st !== 'cancelled' && st !== 'delivered' ? `<button class="btn btn--ghost btn--sm" type="button" data-ocancel="${esc(o.id)}" style="color:var(--bad)"><svg><use href="#i-x"/></svg><span>Cancel</span></button>` : ''}
        </div>
      </article>`;
  }

  const orderById = (id) => orders.find((o) => String(o.id) === String(id));
  async function setOrderStatus(id, status, quiet = false) {
    const o = orderById(id); if (!o) return false;
    const prev = o.status;
    try {
      const res = await api('/api/orders', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: o.id, status }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `could not update order (${res.status})`);
      Object.assign(o, d.order || { status });
      updateOrdersBadge();
      const card = $(`.ocard[data-oid="${CSS.escape(String(o.id))}"]`);
      if (card) card.outerHTML = orderCardHTML(o);
      renderOrdersView();
      if (!quiet) toast(`Order ${o.ref} marked ${STATUS_LABEL[status].toLowerCase()}`, 'ok');
      return true;
    } catch (e) {
      o.status = prev;
      if (e.message !== 'unauthorized') toast(e.message, 'bad');
      return false;
    }
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) {}
      ta.remove(); return ok;
    }
  }

  $('#orderChips').addEventListener('click', (e) => { const b = e.target.closest('[data-ochip]'); if (b) { OF.status = b.dataset.ochip; renderOrdersView(); } });
  $('#orderSearch').addEventListener('input', (e) => { OF.q = e.target.value.trim().toLowerCase(); renderOrdersView(); });
  $('#ordersRefresh').addEventListener('click', () => { fetchOrders(false); toast('Orders refreshed'); });
  $('#orderList').addEventListener('click', async (e) => {
    const el = e.target.closest('[data-owa],[data-ostatus],[data-ocopy],[data-ocancel]'); if (!el) return;
    const d = el.dataset;
    if (d.owa !== undefined) {
      // let the link open WhatsApp; mark confirmed if still new
      const o = orderById(d.owa);
      if (o && o.status === 'new') { const ok = await setOrderStatus(o.id, 'confirmed', true); if (ok) toast('Opened WhatsApp · order marked confirmed', 'ok'); }
      else toast('Opened WhatsApp');
      return;
    }
    if (d.ostatus) { const [id, status] = d.ostatus.split(':'); setOrderStatus(id, status); return; }
    if (d.ocopy) { const o = orderById(d.ocopy); if (o) toast((await copyText(orderSummary(o))) ? 'Order copied' : 'Could not copy', 'ok'); return; }
    if (d.ocancel) {
      const o = orderById(d.ocancel); if (!o) return;
      const host = el.closest('[data-oactions]'); const old = host.innerHTML;
      host.innerHTML = `<div class="ocard__confirm"><span>Cancel order <b>${esc(o.ref)}</b> for ${esc(o.name)}?</span><span class="spacer"></span><button class="btn btn--soft btn--xs" type="button" data-cno>Keep it</button><button class="btn btn--danger btn--xs" type="button" data-cyes>Yes, cancel order</button></div>`;
      $('[data-cno]', host).addEventListener('click', () => { host.innerHTML = old; });
      $('[data-cyes]', host).addEventListener('click', () => setOrderStatus(o.id, 'cancelled'));
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && token && ordersTimer) fetchOrders(true); });

  /* ---------------- boot ---------------- */
  window.addEventListener('beforeunload', (e) => { if (saveState === 'dirty' || saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } });
  if (token) {
    fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: token }) })
      .then((r) => { if (r.ok) return showApp(); token = ''; try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} showLogin(); })
      .catch(() => showLogin());
  } else showLogin();
})();
