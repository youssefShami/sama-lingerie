/* =========================================================
   SAMA — shop, offers, quick view, cart, checkout (orders API)
   + live catalogue from /api/catalog (falls back to products.js)
   + editable About content ([data-about])
   ========================================================= */
(() => {
  'use strict';
  const html = document.documentElement;
  const WA = '96176910051';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- data ---------------- */
  const SEED = window.SAMA_DATA || { CATS: [], PRODUCTS: [], DEALS: [], COLORS: {}, ABOUT: null };
  const ALL = { id: 'all', en: 'All', ar: 'الكل' };
  function normalize(c) {
    return {
      cats: [ALL, ...(c.cats || []).filter(k => k.id !== 'all')],
      products: (c.products || []).filter(p => !p.hidden),
      deals: c.deals || [],
      colors: c.colors || {},
      about: c.about || null
    };
  }
  let D = normalize({ cats: SEED.CATS, products: SEED.PRODUCTS, deals: SEED.DEALS, colors: SEED.COLORS, about: SEED.ABOUT });
  let live = false;

  async function loadLive() {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch('/api/catalog', { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(timer);
      if (!r.ok) return false;
      const c = await r.json();
      if (!c || !Array.isArray(c.products) || !Array.isArray(c.cats)) return false;
      D = normalize(c); live = true; return true;
    } catch (e) { return false; }
  }

  /* ---------------- i18n ---------------- */
  const S = {
    en: {
      shopEyebrow: 'Shop', shopTitle: 'Pick your soft things.', shopNote: 'Prices in USD · pay on delivery · order confirmed on WhatsApp',
      add: 'Add to bag', added: 'Added to bag', quick: 'Quick view', size: 'Size', color: 'Colour', qty: 'Quantity',
      bag: 'Your bag', empty: 'Your bag is empty', emptySub: 'Add a few soft things and order them on WhatsApp.', browse: 'Browse the shop',
      subtotal: 'Subtotal', delivery: 'Delivery', deliveryNote: 'All over Lebanon · paid on delivery', checkout: 'Place order', orChat: 'or chat with us on WhatsApp', clear: 'Clear bag', remove: 'Remove', close: 'Close',
      backToBag: 'Back to bag', coTitle: 'Your details', coSub: 'We confirm every order by WhatsApp before delivery. Payment on delivery.', coName: 'Full name', coPhone: 'Phone (WhatsApp)', coAddress: 'Delivery address', coNotes: 'Notes (optional)', robot: "I'm not a robot", robotWorking: 'Checking…', robotOk: 'Verified', confirmOrder: 'Confirm order', coEmail: 'Email (optional)', gsiLabel: 'Sign in with Google to confirm your order', gsiAs: 'Signed in as', errGoogle: 'Please sign in with Google to confirm your order.',
      doneTitle: 'Order received!', doneRef: 'Order number', doneSub: "We'll message you on WhatsApp shortly to confirm the details and delivery time.", doneChat: 'Chat with us on WhatsApp', doneBack: 'Continue shopping',
      errName: 'Please enter your name.', errPhone: 'Please enter a valid phone number.', errAddress: 'Please enter your delivery address.', errRobot: 'Please tick "I\'m not a robot" first.', errNet: 'Could not send the order. Check your connection and try again.', errStock: 'is sold out — please remove it from your bag.',
      offersEyebrow: 'Offers', offersTitle: 'This week, a little sweeter.', offersNote: 'Offers apply while stock lasts. Mention the offer on WhatsApp and we take care of the rest.',
      save: 'Save', off: 'off', new: 'New', bestseller: 'Bestseller', bundle: 'Bundle', soldout: 'Sold out', soldoutToast: 'Sorry, this one is sold out',
      items: n => n === 1 ? '1 item' : `${n} items`, noItems: 'Nothing here yet — check back soon.', noOffers: 'No offers right now — follow @sama_lingerie.lb for the next one.',
      waIntro: 'Hi Sama! I would like to order:', waTotal: 'Total', waName: 'Name:', waAddress: 'Address:', waNote: 'Notes (sizes, colours, gift wrap):',
      allCats: 'All', viewAll: 'View all offers', seeShop: 'Shop this offer'
    },
    ar: {
      shopEyebrow: 'المتجر', shopTitle: 'اختاري أشياءك الناعمة.', shopNote: 'الأسعار بالدولار · الدفع عند الاستلام · تأكيد الطلب عبر واتساب',
      add: 'أضيفي إلى الحقيبة', added: 'أُضيف إلى الحقيبة', quick: 'عرض سريع', size: 'المقاس', color: 'اللون', qty: 'الكمية',
      bag: 'حقيبتك', empty: 'حقيبتك فارغة', emptySub: 'أضيفي بعض الأشياء الناعمة واطلبيها عبر واتساب.', browse: 'تصفّحي المتجر',
      subtotal: 'المجموع', delivery: 'التوصيل', deliveryNote: 'لكل لبنان · يُدفع عند الاستلام', checkout: 'إتمام الطلب', orChat: 'أو راسلينا على واتساب', clear: 'إفراغ الحقيبة', remove: 'إزالة', close: 'إغلاق',
      backToBag: 'العودة إلى الحقيبة', coTitle: 'بياناتك', coSub: 'نؤكد كل طلب عبر واتساب قبل التوصيل. الدفع عند الاستلام.', coName: 'الاسم الكامل', coPhone: 'رقم الهاتف (واتساب)', coAddress: 'عنوان التوصيل', coNotes: 'ملاحظات (اختياري)', robot: 'أنا لست روبوتاً', robotWorking: 'جارٍ التحقق…', robotOk: 'تم التحقق', confirmOrder: 'تأكيد الطلب', coEmail: 'البريد الإلكتروني (اختياري)', gsiLabel: 'سجّلي الدخول بحساب غوغل لتأكيد طلبك', gsiAs: 'مسجّلة باسم', errGoogle: 'يرجى تسجيل الدخول بحساب غوغل لتأكيد طلبك.',
      doneTitle: 'استلمنا طلبك!', doneRef: 'رقم الطلب', doneSub: 'سنراسلك على واتساب قريباً لتأكيد التفاصيل وموعد التوصيل.', doneChat: 'راسلينا على واتساب', doneBack: 'متابعة التسوّق',
      errName: 'يرجى إدخال اسمك.', errPhone: 'يرجى إدخال رقم هاتف صحيح.', errAddress: 'يرجى إدخال عنوان التوصيل.', errRobot: 'يرجى تفعيل "أنا لست روبوتاً" أولاً.', errNet: 'تعذّر إرسال الطلب. تحقّقي من الاتصال وحاولي مجدداً.', errStock: 'نفدت كميته — يرجى إزالته من الحقيبة.',
      offersEyebrow: 'العروض', offersTitle: 'هذا الأسبوع، أحلى بقليل.', offersNote: 'العروض سارية حتى نفاد الكمية. اذكري العرض عبر واتساب ونهتم نحن بالباقي.',
      save: 'وفّري', off: 'خصم', new: 'جديد', bestseller: 'الأكثر مبيعاً', bundle: 'باقة', soldout: 'نفدت الكمية', soldoutToast: 'عذراً، نفدت كمية هذه القطعة',
      items: n => n === 1 ? 'قطعة واحدة' : `${n} قطع`, noItems: 'لا شيء هنا بعد — عودي قريباً.', noOffers: 'لا عروض حالياً — تابعي @sama_lingerie.lb للعرض القادم.',
      waIntro: 'مرحباً سما! أودّ طلب:', waTotal: 'المجموع', waName: 'الاسم:', waAddress: 'العنوان:', waNote: 'ملاحظات (المقاسات، الألوان، التغليف):',
      allCats: 'الكل', viewAll: 'كل العروض', seeShop: 'تسوّقي هذا العرض'
    }
  };
  const lang = () => (html.lang === 'ar' ? 'ar' : 'en');
  const t = k => S[lang()][k];
  const money = n => `$${Number(n).toFixed(n % 1 ? 2 : 0)}`;
  const byId = id => D.products.find(p => p.id === id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = p => p[lang()] || p.en || '';
  const colorName = k => (D.colors[k] ? D.colors[k][lang()] : k);
  const colorHex = k => (D.colors[k] ? D.colors[k].hex : '#ddd');
  const onSale = p => p.old != null && p.old !== '' && Number(p.old) > Number(p.price);
  const pct = p => Math.round((1 - p.price / p.old) * 100);
  const isOut = p => p.stock === false;
  const catName = id => { const c = D.cats.find(k => k.id === id); return c ? (id === 'all' ? t('allCats') : c[lang()]) : ''; };

  // small image for grids: uploaded photos carry a `thumb`; stock photos get a smaller width param
  function small(u) {
    if (!u) return '';
    const w = window.innerWidth < 600 ? 420 : 640; // phones get lighter thumbnails
    if (/images\.(unsplash|pexels)\.com/.test(u)) return u.replace(/([?&])w=\d+/, '$1w=' + w);
    return u;
  }
  const thumb = p => p.thumb || small(p.img);

  /* ---------------- state ---------------- */
  let filter = 'all';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem('sama-cart') || '[]'); } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem('sama-cart', JSON.stringify(cart)); } catch (e) {} };
  const lineOk = l => { const p = byId(l.id); return p && !isOut(p); };
  const count = () => cart.reduce((a, l) => a + l.qty, 0);
  const subtotal = () => cart.reduce((a, l) => a + (lineOk(l) ? l.qty * byId(l.id).price : 0), 0);

  /* ---------------- DOM refs (all optional: sub-pages reuse this file) ---------------- */
  const $ = s => document.querySelector(s);
  const grid = $('#shopGrid'), chips = $('#shopChips'), offersRow = $('#offersRow');
  const drawer = $('#cart'), overlay = $('#cartOverlay'), cartItems = $('#cartItems'), cartFoot = $('#cartFoot'), cartEmpty = $('#cartEmpty');
  const quick = $('#quick'), quickOverlay = $('#quickOverlay'), quickBody = $('#quickBody');
  const toast = $('#toast');

  /* ---------------- templates ---------------- */
  const daisy = (cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#daisy"/></svg>`;
  const badge = p => isOut(p) ? `<span class="pcard__badge pcard__badge--out">${t('soldout')}</span>`
    : onSale(p) ? `<span class="pcard__badge pcard__badge--sale">-${pct(p)}%</span>`
    : p.tag && S.en[p.tag] ? `<span class="pcard__badge">${t(p.tag)}</span>` : '';

  function cardHTML(p) {
    const out = isOut(p);
    return `
      <article class="pcard is-live ${out ? 'is-out' : ''}" data-id="${p.id}" data-tilt>
        <div class="pcard__img">
          <img src="${esc(thumb(p))}" alt="${esc(name(p))}" loading="lazy" decoding="async" width="480" height="600" />
          ${badge(p)}
          <button class="pcard__quick" type="button" data-quick="${p.id}" aria-label="${t('quick')}">${t('quick')}</button>
          <div class="pcard__swatches">${(p.colors || []).map(c => `<i style="background:${colorHex(c)}" title="${esc(colorName(c))}"></i>`).join('')}</div>
        </div>
        <div class="pcard__meta">
          <div class="pcard__text">
            <h3>${esc(name(p))}</h3>
            <span class="pcard__price">${money(p.price)}${onSale(p) ? ` <s>${money(p.old)}</s>` : ''}</span>
          </div>
          <button class="pcard__add" type="button" data-add="${p.id}" aria-label="${out ? t('soldout') : t('add')}" ${out ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </article>`;
  }

  function renderChips() {
    if (!chips) return;
    const used = new Set(D.products.map(p => p.cat));
    chips.innerHTML = D.cats.filter(c => c.id === 'all' || used.has(c.id)).map(c => `<button type="button" class="chip ${c.id === filter ? 'is-on' : ''}" data-cat="${c.id}">${c.id === 'all' ? t('allCats') : esc(c[lang()])}</button>`).join('');
  }

  function renderGrid(animate = true) {
    if (!grid) return;
    const list = D.products.filter(p => filter === 'all' || p.cat === filter);
    grid.innerHTML = list.length ? list.map(cardHTML).join('') : `<p class="shop__emptymsg">${t('noItems')}</p>`;
    if (!reduced && window.gsap && animate) {
      gsap.from(grid.querySelectorAll('.pcard'), { y: 36, opacity: 0, duration: .9, ease: 'power3.out', stagger: .05, clearProps: 'opacity,transform' });
    }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function renderOffers() {
    if (!offersRow) return;
    const deals = D.products.filter(onSale);
    const cards = deals.map(p => `
      <article class="ocard ${isOut(p) ? 'is-out' : ''}" data-id="${p.id}">
        <div class="ocard__img"><img src="${esc(thumb(p))}" alt="${esc(name(p))}" loading="lazy" decoding="async" width="480" height="480" /><span class="ocard__pct">-${pct(p)}%</span>${isOut(p) ? `<span class="pcard__badge pcard__badge--out ocard__out">${t('soldout')}</span>` : ''}</div>
        <div class="ocard__meta">
          <h3>${esc(name(p))}</h3>
          <p class="ocard__price"><b>${money(p.price)}</b><s>${money(p.old)}</s><em>${t('save')} ${money(p.old - p.price)}</em></p>
          <button class="btn btn--dark btn--sm" type="button" data-add="${p.id}" ${isOut(p) ? 'disabled' : ''}><span>${isOut(p) ? t('soldout') : t('add')}</span></button>
        </div>
      </article>`);
    const statics = D.deals.map((d, i) => `
      <article class="ocard ocard--deal ocard--deal-${i % 3}">
        ${daisy('ocard__daisy')}
        <h3>${esc(d[lang()])}</h3>
        <p>${esc(d['sub_' + lang()])}</p>
        <button class="btn btn--white btn--sm" type="button" data-cat-go="${esc(d.cat || 'all')}"><span>${t('seeShop')}</span></button>
      </article>`);
    const out = [];
    let di = 0, pi = 0;
    while (pi < cards.length || di < statics.length) {
      if (di < statics.length) out.push(statics[di++]);
      out.push(...cards.slice(pi, pi + 2)); pi += 2;
    }
    offersRow.innerHTML = out.length ? out.join('') : `<p class="shop__emptymsg">${t('noOffers')}</p>`;
  }

  function renderStatic() {
    document.querySelectorAll('[data-s]').forEach(el => { const v = S[lang()][el.dataset.s]; if (typeof v === 'string') el.textContent = v; });
  }

  /* ---------------- about (editable from the dashboard) ---------------- */
  function aboutValue(A, k) {
    const L = lang();
    if (k === 'img' || k === 'img2') return A[k] || '';
    const m = k.match(/^pillar-(\d)-(t|d)$/);
    if (m) { const pl = (A.pillars || [])[+m[1]]; return pl ? (m[2] === 't' ? pl[L] : pl['d' + L]) : null; }
    return A[k] && typeof A[k] === 'object' ? A[k][L] : null;
  }
  function renderAbout() {
    const A = D.about; if (!A) return;
    document.querySelectorAll('[data-about]').forEach(el => {
      const k = el.dataset.about;
      const v = aboutValue(A, k);
      if (v == null) return;
      if (k === 'img' || k === 'img2') {
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img && v && img.getAttribute('src') !== v) img.src = v;
        return;
      }
      if (k === 'story') { el.innerHTML = String(v).split(/\n\s*\n/).filter(Boolean).map(p => `<p>${esc(p.trim())}</p>`).join(''); return; }
      if (el.textContent !== v) el.textContent = v;
    });
  }

  /* ---------------- cart ---------------- */
  function add(id, size, color, qty = 1) {
    const p = byId(id); if (!p) return;
    if (isOut(p)) { showToast(t('soldoutToast')); return; }
    size = size || (p.sizes && p.sizes[0]) || ''; color = color || (p.colors && p.colors[0]) || '';
    const line = cart.find(l => l.id === id && l.size === size && l.color === color);
    if (line) line.qty += qty; else cart.push({ id, size, color, qty });
    save(); renderCart(); bump(); showToast(`${t('added')} · ${name(p)}`);
  }
  function setQty(i, q) { if (!cart[i]) return; cart[i].qty = Math.max(0, q); if (cart[i].qty === 0) cart.splice(i, 1); save(); renderCart(); }
  function clear() { cart = []; save(); renderCart(); }

  function renderCart() {
    const n = count();
    document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = n; el.classList.toggle('is-zero', n === 0); });
    document.body.classList.toggle('has-items', n > 0);
    if (!drawer) return;
    cartEmpty.hidden = n > 0; cartItems.hidden = n === 0; cartFoot.hidden = n === 0;
    const lbl = $('#cartCountLabel'); if (lbl) lbl.textContent = t('items')(n);
    if (n === 0) return;
    cartItems.innerHTML = cart.map((l, i) => {
      const p = byId(l.id);
      if (!p) return `<li class="cline cline--gone"><div class="cline__info"><h4>—</h4><p>${t('soldout')}</p></div><button class="cline__x" type="button" data-qty="${i}:-999" aria-label="${t('remove')}">×</button></li>`;
      const out = isOut(p);
      return `
        <li class="cline ${out ? 'cline--gone' : ''}">
          <img src="${esc(thumb(p))}" alt="" loading="lazy" decoding="async" />
          <div class="cline__info">
            <h4>${esc(name(p))}</h4>
            <p>${esc(l.size)}${l.color ? ` · ${esc(colorName(l.color))}` : ''}${out ? ` · <b>${t('soldout')}</b>` : ''}</p>
            <div class="cline__row">
              <div class="qty"><button type="button" data-qty="${i}:-1" aria-label="−">−</button><span>${l.qty}</span><button type="button" data-qty="${i}:1" aria-label="+" ${out ? 'disabled' : ''}>+</button></div>
              <b>${out ? '—' : money(p.price * l.qty)}</b>
            </div>
          </div>
          <button class="cline__x" type="button" data-qty="${i}:-999" aria-label="${t('remove')}">×</button>
        </li>`;
    }).join('');
    $('#cartSubtotal').textContent = money(subtotal());
    const tot = $('#checkoutTotal'); if (tot) tot.textContent = money(subtotal());
  }

  function waLink() { // kept for reference: plain chat link is now used instead
    const lines = cart.filter(lineOk).map((l, i) => {
      const p = byId(l.id);
      return `${i + 1}) ${name(p)} — ${l.size}${l.color ? ' / ' + colorName(l.color) : ''} × ${l.qty} — ${money(p.price * l.qty)}`;
    });
    const msg = [t('waIntro'), '', ...lines, '', `${t('waTotal')}: ${money(subtotal())}`, '', t('waName'), t('waAddress'), t('waNote')].join('\n');
    return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  }

  function bump() {
    document.querySelectorAll('.cart-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
  }
  let toastT;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2200);
  }

  function lock(on) {
    const L = window.__lenis; if (L) on ? L.stop() : L.start();
    document.body.classList.toggle('is-locked', on);
  }
  function openCart() { if (!drawer) return; showBag(); renderCart(); drawer.classList.add('is-open'); overlay.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); lock(true); }
  function closeCart() { if (!drawer) return; drawer.classList.remove('is-open'); overlay.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); lock(false); }


  /* ---------------- checkout (orders API + not-a-robot proof of work) ---------------- */
  const co = $('#checkout'), done = $('#orderDone'), robot = $('#robot'), coErr = $('#checkoutErr'), coSubmit = $('#checkoutSubmit');
  let captcha = null, robotBusy = false, coStarted = 0;
  let googleToken = null, googleEmail = '', googleClientId = null;
  const gsi = $('#gsi');

  // Google sign-in: shown only when the site has a client id configured (GET /api/config).
  async function setupGoogle() {
    if (!gsi) return;
    try {
      const r = await fetch('/api/config'); const c = r.ok ? await r.json() : {};
      googleClientId = c.googleClientId || null;
    } catch (e) { googleClientId = null; }
    if (!googleClientId) return;
    let tries = 0;
    const render = () => {
      if (!(window.google && google.accounts && google.accounts.id)) { if (tries++ < 40) setTimeout(render, 250); return; }
      google.accounts.id.initialize({ client_id: googleClientId, callback: onGoogle, auto_select: false, itp_support: true });
      google.accounts.id.renderButton($('#gsiBtn'), { theme: 'outline', size: 'large', shape: 'pill', width: 300, text: 'signin_with', locale: lang() === 'ar' ? 'ar' : 'en' });
      gsi.hidden = false; if (robot) robot.hidden = true; const ef = $('#emailField'); if (ef) ef.hidden = true;
    };
    render();
  }
  function onGoogle(resp) {
    try {
      const payload = JSON.parse(atob(resp.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      googleToken = resp.credential; googleEmail = payload.email || '';
      $('#gsiEmail').textContent = googleEmail; $('#gsiDone').hidden = false; gsi.classList.add('is-ok');
      if (co && payload.name && !co.elements.name.value) co.elements.name.value = payload.name;
      coSubmit.disabled = false; coErr.hidden = true;
    } catch (e) { googleToken = null; }
  }
  setupGoogle();

  function showBag() {
    if (!drawer) return;
    if (co) co.hidden = true; if (done) done.hidden = true;
    cartEmpty.hidden = count() > 0; cartItems.hidden = count() === 0; cartFoot.hidden = count() === 0;
  }
  function openCheckout() {
    if (!co || !count()) return;
    cartEmpty.hidden = true; cartItems.hidden = true; cartFoot.hidden = true; done.hidden = true;
    co.hidden = false; coErr.hidden = true; coStarted = Date.now();
    $('#checkoutTotal').textContent = money(subtotal());
    // remember the customer's details for next time
    try { const saved = JSON.parse(localStorage.getItem('sama-customer') || '{}'); ['name', 'phone', 'address'].forEach(k => { if (saved[k] && !co.elements[k].value) co.elements[k].value = saved[k]; }); } catch (e) {}
    resetRobot();
    setTimeout(() => co.elements.name.focus(), 350);
  }
  function resetRobot() {
    captcha = null; robotBusy = false;
    if (!robot) return;
    robot.classList.remove('is-ok', 'is-working', 'is-bad'); robot.setAttribute('aria-checked', 'false');
    robot.querySelector('.robot__label').textContent = t('robot');
    coSubmit.disabled = !(googleClientId && googleToken);
  }

  // compact SHA-256 (hex) for the proof-of-work; ~1 µs per hash, so 15 bits ≈ 30 ms of work
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  function sha256Bytes(str) {
    const m = new TextEncoder().encode(str); const l = m.length; const padded = new Uint8Array(((l + 9 + 63) >> 6) << 6);
    padded.set(m); padded[l] = 0x80; const dv = new DataView(padded.buffer); dv.setUint32(padded.length - 4, l * 8, false);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]); const w = new Uint32Array(64);
    for (let i = 0; i < padded.length; i += 64) {
      for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
      for (let j = 16; j < 64; j++) { const a = w[j-15], b = w[j-2]; const s0 = ((a>>>7)|(a<<25)) ^ ((a>>>18)|(a<<14)) ^ (a>>>3); const s1 = ((b>>>17)|(b<<15)) ^ ((b>>>19)|(b<<13)) ^ (b>>>10); w[j] = (w[j-16] + s0 + w[j-7] + s1) >>> 0; }
      let [a,b,c,d,e,f,g,h] = H;
      for (let j = 0; j < 64; j++) { const S1 = ((e>>>6)|(e<<26)) ^ ((e>>>11)|(e<<21)) ^ ((e>>>25)|(e<<7)); const ch = (e & f) ^ (~e & g); const t1 = (h + S1 + ch + K[j] + w[j]) >>> 0; const S0 = ((a>>>2)|(a<<30)) ^ ((a>>>13)|(a<<19)) ^ ((a>>>22)|(a<<10)); const mj = (a & b) ^ (a & c) ^ (b & c); const t2 = (S0 + mj) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0; }
      H[0] = (H[0]+a)>>>0; H[1] = (H[1]+b)>>>0; H[2] = (H[2]+c)>>>0; H[3] = (H[3]+d)>>>0; H[4] = (H[4]+e)>>>0; H[5] = (H[5]+f)>>>0; H[6] = (H[6]+g)>>>0; H[7] = (H[7]+h)>>>0;
    }
    return H;
  }
  const leadingZeroBits = (H) => { let z = 0; for (const word of H) { if (word === 0) { z += 32; continue; } z += Math.clz32(word); break; } return z; };

  async function solveRobot() {
    if (robotBusy || captcha) return;
    robotBusy = true; robot.classList.add('is-working'); robot.classList.remove('is-bad');
    robot.querySelector('.robot__label').textContent = t('robotWorking');
    try {
      const r = await fetch('/api/orders?challenge=1', { headers: { accept: 'application/json' } });
      if (!r.ok) throw new Error('challenge');
      const ch = await r.json();
      let nonce = 0; const t0 = performance.now();
      while (true) {
        if (leadingZeroBits(sha256Bytes(ch.seed + nonce)) >= ch.bits) break;
        nonce++;
        if ((nonce & 2047) === 0) await new Promise(res => setTimeout(res, 0)); // keep the UI responsive
      }
      await new Promise(res => setTimeout(res, Math.max(0, 650 - (performance.now() - t0)))); // let the spinner read as a check
      captcha = { seed: ch.seed, exp: ch.exp, sig: ch.sig, nonce };
      robot.classList.remove('is-working'); robot.classList.add('is-ok'); robot.setAttribute('aria-checked', 'true');
      robot.querySelector('.robot__label').textContent = t('robotOk');
      coSubmit.disabled = false; coErr.hidden = true;
    } catch (e) {
      robot.classList.remove('is-working'); robot.classList.add('is-bad');
      robot.querySelector('.robot__label').textContent = t('robot');
      showErr(t('errNet'));
    }
    robotBusy = false;
  }
  if (robot) {
    robot.addEventListener('click', solveRobot);
    robot.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); solveRobot(); } });
  }
  function showErr(msg) { coErr.textContent = msg; coErr.hidden = false; }
  function bad(name, on) { const f = co.elements[name].closest('.field'); f && f.classList.toggle('is-bad', !!on); }

  if (co) co.addEventListener('submit', async e => {
    e.preventDefault();
    const f = co.elements;
    ['name', 'phone', 'address'].forEach(k => bad(k, false));
    const name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim(), notes = f.notes.value.trim();
    if (name.length < 2) { bad('name', 1); return showErr(t('errName')); }
    if (phone.replace(/\D/g, '').length < 7) { bad('phone', 1); return showErr(t('errPhone')); }
    if (address.length < 6) { bad('address', 1); return showErr(t('errAddress')); }
    if (googleClientId && !googleToken) return showErr(t('errGoogle'));
    if (!googleClientId && !captcha) { robot.classList.add('is-bad'); return showErr(t('errRobot')); }
    coErr.hidden = true; coSubmit.classList.add('is-busy');
    const items = cart.filter(lineOk).map(l => ({ id: l.id, size: l.size, color: l.color, qty: l.qty }));
    try {
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, address, notes, email: googleEmail || (f.email ? f.email.value.trim() : ''), google_token: googleToken, lang: lang(), items, captcha, started: coStarted, website: f.website.value }) });
      const data = await r.json().catch(() => ({}));
      coSubmit.classList.remove('is-busy');
      if (!r.ok) {
        if (data.code === 'captcha') { resetRobot(); return showErr(t('errRobot')); }
        if (data.code === 'google') { googleToken = null; gsi.classList.remove('is-ok'); $('#gsiDone').hidden = true; return showErr(t('errGoogle')); }
        if (r.status === 409 && data.id) { const p = byId(data.id); return showErr(`${p ? name(p) : ''} ${t('errStock')}`); }
        if (data.field && f[data.field]) bad(data.field, 1);
        return showErr(data.error ? `${t('errNet')}` : t('errNet'));
      }
      try { localStorage.setItem('sama-customer', JSON.stringify({ name, phone, address })); } catch (err) {}
      cart = []; save(); renderCart();
      co.hidden = true; cartEmpty.hidden = true; cartItems.hidden = true; cartFoot.hidden = true;
      $('#doneRef').textContent = data.ref;
      const msg = lang() === 'ar' ? `مرحباً سما! بخصوص طلبي رقم ${data.ref}` : `Hi Sama! About my order ${data.ref}`;
      $('#doneWa').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
      done.hidden = false;
      resetRobot();
      if (!reduced && window.gsap) gsap.from(done.children, { y: 20, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' });
    } catch (err) {
      coSubmit.classList.remove('is-busy'); showErr(t('errNet'));
    }
  });

  /* ---------------- quick view ---------------- */
  let q = { id: null, size: null, color: null, qty: 1, img: 0 };
  function openQuick(id) {
    const p = byId(id); if (!p || !quick) return;
    q = { id, size: (p.sizes || [])[0] || '', color: (p.colors || [])[0] || '', qty: 1, img: 0 };
    renderQuick(); quick.classList.add('is-open'); quickOverlay.classList.add('is-open'); quick.setAttribute('aria-hidden', 'false'); lock(true);
  }
  function closeQuick() { if (!quick) return; quick.classList.remove('is-open'); quickOverlay.classList.remove('is-open'); quick.setAttribute('aria-hidden', 'true'); lock(false); }
  function renderQuick() {
    const p = byId(q.id); if (!p) return;
    const gallery = [p.img, ...(p.imgs || [])].filter(Boolean);
    const out = isOut(p);
    quickBody.innerHTML = `
      <div class="quick__img">
        <img src="${esc(gallery[q.img] || p.img)}" alt="${esc(name(p))}" decoding="async" />
        ${badge(p)}
        ${gallery.length > 1 ? `<div class="quick__thumbs">${gallery.map((g, i) => `<button type="button" class="${i === q.img ? 'is-on' : ''}" data-qimg="${i}" aria-label="${i + 1}"><img src="${esc(small(g))}" alt="" loading="lazy" decoding="async" /></button>`).join('')}</div>` : ''}
      </div>
      <div class="quick__info">
        <p class="eyebrow">${daisy('eyebrow__d')}<span>${esc(catName(p.cat))}</span></p>
        <h3 class="quick__title">${esc(name(p))}</h3>
        <p class="quick__price">${money(p.price)}${onSale(p) ? ` <s>${money(p.old)}</s>` : ''}</p>
        <p class="quick__desc">${esc(p['d' + lang()] || p.den || '')}</p>
        ${(p.sizes || []).length ? `<div class="opt"><span class="opt__label">${t('size')}</span><div class="opt__row">${p.sizes.map(s => `<button type="button" class="opt__pill ${s === q.size ? 'is-on' : ''}" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
        ${(p.colors || []).length ? `<div class="opt"><span class="opt__label">${t('color')} · ${esc(colorName(q.color))}</span><div class="opt__row">${p.colors.map(c => `<button type="button" class="opt__dot ${c === q.color ? 'is-on' : ''}" data-color="${esc(c)}" style="--c:${colorHex(c)}" aria-label="${esc(colorName(c))}"></button>`).join('')}</div></div>` : ''}
        <div class="quick__row">
          <div class="qty qty--lg"><button type="button" data-qq="-1" aria-label="−">−</button><span>${q.qty}</span><button type="button" data-qq="1" aria-label="+">+</button></div>
          <button class="btn btn--dark quick__add" type="button" data-quick-add ${out ? 'disabled' : ''}><span>${out ? t('soldout') : `${t('add')} · ${money(p.price * q.qty)}`}</span></button>
        </div>
        <p class="quick__note">${t('shopNote')}</p>
      </div>`;
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-cat],[data-cat-go],[data-add],[data-quick],[data-qty],[data-size],[data-color],[data-qq],[data-qimg],[data-quick-add],[data-cart-open],[data-cart-close],[data-quick-close],[data-cart-clear],[data-checkout-open],[data-checkout-close]');
    if (!el) return;
    const d = el.dataset;
    if (d.cat !== undefined && el.classList.contains('chip')) { filter = d.cat; renderChips(); renderGrid(); return; }
    if (d.cat !== undefined && el.classList.contains('ccard')) { goShop(d.cat); return; }
    if (d.catGo !== undefined) { goShop(d.catGo); return; }
    if (d.add !== undefined) { e.preventDefault(); add(d.add); return; }
    if (d.quick !== undefined) { openQuick(d.quick); return; }
    if (d.qty !== undefined) { const [i, dq] = d.qty.split(':').map(Number); if (!cart[i]) return; setQty(i, dq === -999 ? 0 : cart[i].qty + dq); return; }
    if (d.size !== undefined) { q.size = d.size; renderQuick(); return; }
    if (d.color !== undefined) { q.color = d.color; renderQuick(); return; }
    if (d.qimg !== undefined) { q.img = Number(d.qimg); renderQuick(); return; }
    if (d.qq !== undefined) { q.qty = Math.max(1, q.qty + Number(d.qq)); renderQuick(); return; }
    if (d.quickAdd !== undefined) { add(q.id, q.size, q.color, q.qty); closeQuick(); setTimeout(openCart, 250); return; }
    if (d.cartOpen !== undefined) { e.preventDefault(); openCart(); return; }
    if (d.cartClose !== undefined) { closeCart(); return; }
    if (d.quickClose !== undefined) { closeQuick(); return; }
    if (d.cartClear !== undefined) { clear(); return; }
    if (d.checkoutOpen !== undefined) { openCheckout(); return; }
    if (d.checkoutClose !== undefined) { showBag(); return; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeQuick(); } });

  function goShop(cat) {
    if (!grid) { location.href = `./#shop`; return; }
    filter = D.cats.some(c => c.id === cat) ? cat : 'all';
    renderChips(); renderGrid();
    const target = document.getElementById('shop');
    if (window.__lenis) window.__lenis.scrollTo(target, { offset: -10, duration: 1.2 }); else target.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------------- public ---------------- */
  function renderAll(animate) {
    renderStatic(); renderChips(); renderGrid(animate); renderOffers(); renderAbout(); renderCart();
    if (quick && quick.classList.contains('is-open')) renderQuick();
  }
  window.SamaShop = { setLang: () => renderAll(false), openCart, add, get data() { return D; }, get live() { return live; } };

  // First paint from the seed so nothing is empty, then swap to the live catalogue.
  renderAll(false);
  loadLive().then(ok => {
    if (!ok) return;
    renderAll(false);
    if (window.SamaMotion) window.SamaMotion.rebuildText();
  });
})();
