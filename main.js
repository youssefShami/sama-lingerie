/* =========================================================
   SAMA LINGERIE — motion + i18n
   GSAP 3 + ScrollTrigger + Lenis
   ========================================================= */
(() => {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  const html = document.documentElement;
  // always start at the top so the preloader + hero intro play from a known state
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const isRTL = () => html.dir === 'rtl';

  /* ---------------------------------------------------------
     i18n
  --------------------------------------------------------- */
  const T = {
    en: {
      'nav.collections':'Collections','nav.shop':'Shop','nav.offers':'Offers','nav.bridal':'Bridal','nav.about':'About','nav.contact':'Contact','nav.order':'Order',
      'hero.eyebrow':'Saida, Lebanon · est. 2025',
      'hero.tag':'Every woman deserves to feel beautiful in her own way. Explore our collection, where elegance, confidence, and femininity come together.',
      'hero.cta1':'Order on WhatsApp','hero.cta2':'Explore collections','hero.scroll':'scroll',
      'mq.1':'Delivery all over Lebanon','mq.2':'Imported from Turkey','mq.3':'Bridal trousseau in one place','mq.4':'Open daily 10:00 – 5:00',
      'intro.eyebrow':'The boutique','intro.title':'Soft things for real days.',
      'intro.body':'Sama is a little yellow boutique in Saida with a big idea: lingerie and loungewear that feel like you — warm, comfortable, a bit playful, and never out of reach. Every piece is imported from Turkey and picked for how it feels on an ordinary Tuesday.',
      'intro.f1':'founded in Saida','intro.f2':'imported from Turkey','intro.f3':'delivery everywhere',
      'intro.sticker':'soft · playful · everyday · soft · playful · everyday · ',
      'col.eyebrow':'Shop by collection','col.title':'Everything soft, in six shelves.',
      'col.1':'Pajama sets','col.1d':'Two-piece sets, shorts & long — cotton, satin, fleece.',
      'col.2':'Lingerie sets','col.2d':'Everyday bras & bralettes, soft lace, comfy fits.',
      'col.3':'Loungewear','col.3d':'Sweat sets, ribbed basics and oversized tees for home days.',
      'col.4':'Robes & kimonos','col.4d':'Satin, waffle and plush — the getting-ready essential.',
      'col.5':'Bridal boxes','col.5d':'Curated trousseau sets, wrapped and ready to gift.',
      'col.6':'Slippers & extras','col.6d':'Fluffy slippers, scrunchies, sleep masks and little gifts.',
      'col.cta':'Ask us on WhatsApp',
      'sc.eyebrow':'New in','sc.title':'Our shelves, photographed soon.',
      'sc.note':'This is a placeholder showcase. Real product photos, names and prices will be added here once the first shoot is done.',
      'sc.soon':'Coming soon','sc.p1':'Satin short set','sc.p2':'Lace bralette set','sc.p3':'Waffle robe','sc.p4':'Cotton pajama set','sc.p5':'Bridal night set','sc.p6':'Ribbed lounge set','sc.p7':'Fluffy slippers','sc.p8':'Gift box',
      'br.bg':'jihaz','br.eyebrow':'Brides-to-be','br.title':'Your jihaz, in one place.',
      'br.body':'From the wedding night to honeymoon mornings, we help brides complete their trousseau without running from shop to shop. Tell us your date and sizes, and we curate the rest — wrapped, labelled, delivered.',
      'br.cta':'Plan my trousseau',
      'br.s1':'Tell us your date','br.s1d':'Send us your wedding date, sizes and favourite colours on WhatsApp. We reply the same day.',
      'br.s2':'We curate your sets','br.s2d':'Wedding-night set, honeymoon pajamas, a robe for getting ready, everyday sets for the first months.',
      'br.s3':'Try it on in Saida','br.s3d':"Come by the boutique on Ghassan Hammoud Street, or we send photos and sizes if you're far.",
      'br.s4':'Wrapped & delivered','br.s4d':'Every box is wrapped with a daisy ribbon and delivered anywhere in Lebanon.',
      'br.c1':'Wedding-night set','br.c2':'Honeymoon pajamas','br.c3':'Satin robe','br.c4':'Everyday sets','br.c5':'Loungewear','br.c6':'Slippers','br.c7':'Gift wrapping',
      'ab.cap':'Saida, on the Mediterranean','ab.eyebrow':'About','ab.title':'Hello from Saida.',
      'ab.body':"Sama opened in 2025 on Ghassan Hammoud Street, right opposite Al-Amir wal Amira bookstore. We import feminine everyday pieces from Turkey and keep them affordable, because feeling good at home shouldn't be a luxury. Warm, playful, approachable — that's the whole idea.",
      'ab.p1':'Affordable, always','ab.p1d':'Boutique feel, everyday prices.',
      'ab.p2':'Imported from Turkey','ab.p2d':'Soft fabrics, careful finishing.',
      'ab.p3':'Feminine & everyday','ab.p3d':'Made to be lived in, not saved for later.',
      'ab.p4':'Delivery all over Lebanon','ab.p4d':'From Saida to your door.',
      'ct.eyebrow':'Visit or message','ct.title':'Come say hi.',
      'ct.addr':'Address','ct.addrv':'Ghassan Hammoud Street, opposite Al-Amir wal Amira Bookstore, Saida, Lebanon',
      'ct.hours':'Hours','ct.hoursv':'Daily 10:00 AM – 5:00 PM','ct.phone':'Phone & WhatsApp',
      'ct.delivery':'Delivery','ct.deliveryv':'All over Lebanon','ct.cta':'Order on WhatsApp','ct.map':'Open in Google Maps',
      'ab.more':'Read our story','ft.dev':'Developed by','pg.eyebrow':'Our story','pg.title':'A little yellow boutique in Saida.','pg.f1':'opened in Saida','pg.f2':'imported from Turkey','pg.f3':'delivery everywhere','pg.cta':'Come say hi, or order from your sofa.','pg.back':'Back to the shop',
      'ft.tag':'Feminine everyday lingerie & loungewear · Saida, Lebanon','wa.label':'Chat on WhatsApp'
    },
    ar: {
      'nav.collections':'المجموعات','nav.shop':'المتجر','nav.offers':'العروض','nav.bridal':'العرايس','nav.about':'عنّا','nav.contact':'تواصلي','nav.order':'اطلبي',
      'hero.eyebrow':'صيدا، لبنان · تأسّس ٢٠٢٥',
      'hero.tag':'كل امرأة تستحق أن تشعر بجمالها على طريقتها. اكتشفي مجموعتنا، حيث تلتقي الأناقة والثقة والأنوثة.',
      'hero.cta1':'اطلبي عبر واتساب','hero.cta2':'اكتشفي المجموعات','hero.scroll':'مرّري',
      'mq.1':'توصيل لكل لبنان','mq.2':'مستورد من تركيا','mq.3':'جهاز العروس في مكان واحد','mq.4':'يومياً من ١٠:٠٠ حتى ٥:٠٠',
      'intro.eyebrow':'البوتيك','intro.title':'أشياء ناعمة لأيام حقيقية.',
      'intro.body':'سما بوتيك صغير أصفر في صيدا بفكرة كبيرة: لانجري ولباس منزلي يشبهك — دافئ، مريح، فيه شيء من المرح، وبسعر في متناول الجميع. كل قطعة مستوردة من تركيا ومختارة لإحساسها في يوم عادي.',
      'intro.f1':'تأسّس في صيدا','intro.f2':'مستورد من تركيا','intro.f3':'توصيل لكل المناطق',
      'intro.sticker':'ناعم · مرح · يومي · ناعم · مرح · يومي · ',
      'col.eyebrow':'تسوّقي حسب المجموعة','col.title':'كل ما هو ناعم، على ستة رفوف.',
      'col.1':'أطقم بيجامات','col.1d':'أطقم من قطعتين، قصيرة وطويلة — قطن، ساتان، فليس.',
      'col.2':'أطقم لانجري','col.2d':'صدريات يومية وبراليت، دانتيل ناعم، قصّات مريحة.',
      'col.3':'لباس منزلي','col.3d':'أطقم رياضية، أساسيات مضلّعة وتيشيرتات واسعة لأيام البيت.',
      'col.4':'أرواب وكيمونو','col.4d':'ساتان، وافل وقطيفة — أساسي التحضير.',
      'col.5':'بوكسات العروس','col.5d':'أطقم جهاز منسّقة، مغلّفة وجاهزة للإهداء.',
      'col.6':'شحاطات وإضافات','col.6d':'شحاطات ناعمة، ربطات شعر، أقنعة نوم وهدايا صغيرة.',
      'col.cta':'اسألينا عبر واتساب',
      'sc.eyebrow':'وصل حديثاً','sc.title':'رفوفنا، ستُصوَّر قريباً.',
      'sc.note':'هذا قسم مؤقت لعرض المنتجات. ستُضاف صور المنتجات الحقيقية وأسماؤها وأسعارها هنا بعد جلسة التصوير الأولى.',
      'sc.soon':'قريباً','sc.p1':'طقم ساتان قصير','sc.p2':'طقم براليت دانتيل','sc.p3':'روب وافل','sc.p4':'طقم بيجاما قطن','sc.p5':'طقم ليلة العرس','sc.p6':'طقم منزلي مضلّع','sc.p7':'شحاطات ناعمة','sc.p8':'بوكس هدية',
      'br.bg':'جهاز','br.eyebrow':'للعرايس','br.title':'جهازك، في مكان واحد.',
      'br.body':'من ليلة العرس إلى صباحات شهر العسل، نساعد العروس على إكمال جهازها من دون التنقّل بين المحلات. أخبرينا بموعدك ومقاساتك، ونحن ننسّق الباقي — مغلّف، مرتّب، وموصَّل.',
      'br.cta':'خطّطي جهازي',
      'br.s1':'أخبرينا بموعدك','br.s1d':'أرسلي لنا موعد العرس، المقاسات والألوان المفضّلة عبر واتساب. نردّ في اليوم نفسه.',
      'br.s2':'ننسّق أطقمك','br.s2d':'طقم ليلة العرس، بيجامات شهر العسل، روب للتحضير، وأطقم يومية للأشهر الأولى.',
      'br.s3':'جرّبي في صيدا','br.s3d':'مرّي على البوتيك في شارع غسان حمود، أو نرسل لك الصور والمقاسات إن كنتِ بعيدة.',
      'br.s4':'مغلّف وموصَّل','br.s4d':'كل بوكس يُغلَّف بشريطة الأقحوان ويُوصَّل إلى أي مكان في لبنان.',
      'br.c1':'طقم ليلة العرس','br.c2':'بيجامات شهر العسل','br.c3':'روب ساتان','br.c4':'أطقم يومية','br.c5':'لباس منزلي','br.c6':'شحاطات','br.c7':'تغليف الهدايا',
      'ab.cap':'صيدا، على المتوسّط','ab.eyebrow':'عنّا','ab.title':'مرحباً من صيدا.',
      'ab.body':'افتُتح سما عام ٢٠٢٥ في شارع غسان حمود، مقابل مكتبة الأمير والأميرة. نستورد قطعاً أنثوية يومية من تركيا ونبقيها بأسعار معقولة، لأن الشعور بالراحة في البيت لا يجب أن يكون ترفاً. دافئ، مرح، قريب — هذه هي الفكرة كلها.',
      'ab.p1':'أسعار معقولة دائماً','ab.p1d':'إحساس بوتيك، أسعار يومية.',
      'ab.p2':'مستورد من تركيا','ab.p2d':'أقمشة ناعمة، تشطيب متقن.',
      'ab.p3':'أنثوي ويومي','ab.p3d':'مصنوع ليُعاش فيه، لا ليُحفَظ لاحقاً.',
      'ab.p4':'توصيل لكل لبنان','ab.p4d':'من صيدا إلى بابك.',
      'ct.eyebrow':'زورينا أو راسلينا','ct.title':'تعالي سلّمي علينا.',
      'ct.addr':'العنوان','ct.addrv':'شارع غسان حمود، مقابل مكتبة الأمير والأميرة، صيدا، لبنان',
      'ct.hours':'الدوام','ct.hoursv':'يومياً ١٠:٠٠ صباحاً – ٥:٠٠ مساءً','ct.phone':'هاتف وواتساب',
      'ct.delivery':'التوصيل','ct.deliveryv':'لكل لبنان','ct.cta':'اطلبي عبر واتساب','ct.map':'افتحي في خرائط غوغل',
      'ab.more':'اقرئي قصتنا','ft.dev':'تطوير','pg.eyebrow':'قصتنا','pg.title':'بوتيك صغير أصفر في صيدا.','pg.f1':'افتُتح في صيدا','pg.f2':'مستورد من تركيا','pg.f3':'توصيل لكل المناطق','pg.cta':'تعالي سلّمي علينا، أو اطلبي من كنبتك.','pg.back':'العودة إلى المتجر',
      'ft.tag':'لانجري ولباس منزلي أنثوي لكل يوم · صيدا، لبنان','wa.label':'راسلينا على واتساب'
    }
  };

  function applyLang(lang){
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (T[lang][k] != null) el.textContent = T[lang][k];
    });
    try { localStorage.setItem('sama-lang', lang); } catch(e){}
    if (window.SamaShop) window.SamaShop.setLang(lang);
    // re-split animated text and recalc positions
    buildWordReveals();
    buildScrubWords();
    ScrollTrigger.refresh();
  }

  /* ---------------------------------------------------------
     Smooth scroll (Lenis)
  --------------------------------------------------------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.13, smoothWheel: true, wheelMultiplier: 1.05, syncTouch: false });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------------------------------------------------------
     Text splitting helpers
  --------------------------------------------------------- */
  function splitWords(el, wrapInner){
    const text = el.textContent.trim();
    el.innerHTML = '';
    text.split(/\s+/).forEach((w, i) => {
      const span = document.createElement('span');
      span.className = wrapInner ? 'w' : 'sw';
      if (wrapInner) { const inner = document.createElement('i'); inner.textContent = w; span.appendChild(inner); }
      else span.textContent = w;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    });
  }
  let wordTriggers = [];
  function buildWordReveals(){
    wordTriggers.forEach(t => t.kill()); wordTriggers = [];
    document.querySelectorAll('.reveal-words').forEach(el => {
      splitWords(el, true);
      if (reduced) return;
      const inners = el.querySelectorAll('.w i');
      // already scrolled past (e.g. language switched mid-page): show immediately
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85) { gsap.set(inners, { y: 0, yPercent: 0 }); return; }
      gsap.set(inners, { y: 0, yPercent: 110 }); // y:0 clears the CSS translateY(110%) GSAP would otherwise parse as px
      wordTriggers.push(gsap.to(inners, {
        yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
      }).scrollTrigger);
    });
  }
  let scrubTriggers = [];
  function buildScrubWords(){
    scrubTriggers.forEach(t => t.kill()); scrubTriggers = [];
    document.querySelectorAll('.scrub-words').forEach(el => {
      splitWords(el, false);
      if (reduced) return;
      const words = el.querySelectorAll('.sw');
      gsap.set(words, { opacity: 0.18 });
      scrubTriggers.push(gsap.to(words, {
        opacity: 1, stagger: 0.08, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 }
      }).scrollTrigger);
    });
  }

  /* ---------------------------------------------------------
     Loader
  --------------------------------------------------------- */
  /* ---------------------------------------------------------
     Loader + hero intro: ONE timeline.
     The hero logo starts at the centre of the viewport over a yellow sheet (the "loader"),
     the bar fills, then the logo glides to its real place while the sheet fades and the rest
     of the hero rises in. Nothing is swapped or re-drawn, so there is no cut.
  --------------------------------------------------------- */
  const sheet = document.getElementById('heroSheet');
  function runLoader(done){
    const logo = document.querySelector('.hero__logoimg');
    if (reduced || !sheet || !logo) { sheet && sheet.remove(); html.classList.remove('is-loading'); done(); return; }
    if (lenis) lenis.stop();
    const bar = sheet.querySelector('.hero__bar i');
    // where the logo will end up vs. the centre of the viewport
    const r = logo.getBoundingClientRect();
    const dx = window.innerWidth / 2 - (r.left + r.width / 2);
    const dy = window.innerHeight / 2 - (r.top + r.height / 2);
    gsap.set(logo, { x: dx, y: dy, scale: 1.1, opacity: 0, transformOrigin: '50% 50%' });
    gsap.set(['.hero__eyebrow', '.hero__tag', '.hero__cta', '.hero__scroll'], { opacity: 0 }); // inline, so dropping the CSS class never pops them in
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete(){ sheet.remove(); if (lenis) lenis.start(); done(); } });
    tl.to(logo, { opacity: 1, duration: .7, ease: 'power2.out' }, .05)
      .to('.hero__credit', { opacity: 1, duration: .9, ease: 'power2.out' }, .35)
      .to(bar, { width: '100%', duration: 1.0, ease: 'power2.inOut' }, .15)
      .to(bar.parentNode, { opacity: 0, duration: .3 }, 1.05)
      // the glide: logo to its final place, sheet melts away in the same breath
      .to(logo, { x: 0, y: 0, scale: 1, duration: 1.0, ease: 'power3.inOut' }, 1.1)
      .to(sheet, { opacity: 0, duration: .8, ease: 'power2.inOut' }, 1.45)
      .add(() => html.classList.remove('is-loading'), 1.5)
      .from('.hero__eyebrow span', { y: 14, duration: .8 }, 1.55).to('.hero__eyebrow', { opacity: 1, duration: .6 }, 1.55)
      .to('.hero__tag', { opacity: 1, duration: .7 }, 1.7).from('.hero__tag', { y: 18, duration: .9 }, 1.7)
      .to('.hero__cta', { opacity: 1, duration: .6 }, 1.85).from('.hero__cta .btn', { y: 18, duration: .8, stagger: .1 }, 1.85)
      .from('.hero__photo', { y: 40, scale: .92, opacity: 0, duration: 1.1, stagger: .12 }, 1.6)
      .from('.fd', { scale: 0, opacity: 0, duration: 1, ease: 'back.out(1.8)', stagger: .06 }, 1.7)
      .to('.hero__scroll', { opacity: .85, duration: .8 }, 2.2);
  }
  function heroIntro(){ /* folded into runLoader */ }

  /* ---------------------------------------------------------
     Hero scroll
  --------------------------------------------------------- */
  function heroScroll(){
    if (reduced) return;
    const hero = document.getElementById('hero');
    if (!hero) return;
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    })
    .to('.hero__inner', { yPercent: 28, scale: .88, opacity: .2, ease: 'none' }, 0)
    .to('.hero__photo--l', { yPercent: -35, rotate: -12, ease: 'none' }, 0)
    .to('.hero__photo--r', { yPercent: 30, rotate: 12, ease: 'none' }, 0)
    .to('.hero__scroll', { opacity: 0, ease: 'none' }, 0);

    document.querySelectorAll('.fd').forEach(d => {
      const s = parseFloat(d.dataset.speed || .4);
      gsap.to(d, { yPercent: -220 * s, rotate: 90 * s, ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    });
    // idle float
    document.querySelectorAll('.fd').forEach((d, i) => {
      gsap.to(d, { y: '+=14', duration: 2.4 + i * .3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
    // mouse parallax
    if (!isTouch) {
      const movers = [...document.querySelectorAll('.fd')].map(d => ({ to: gsap.quickTo(d, 'x', { duration: 1.2, ease: 'power3.out' }), s: parseFloat(d.dataset.speed || .4) * 40 }));
      const pl = document.querySelector('.hero__photo--l'), pr = document.querySelector('.hero__photo--r');
      const ql = pl && gsap.quickTo(pl, 'x', { duration: 1.2, ease: 'power3.out' }), qr = pr && gsap.quickTo(pr, 'x', { duration: 1.2, ease: 'power3.out' });
      hero.addEventListener('mousemove', e => {
        const x = e.clientX / window.innerWidth - .5;
        movers.forEach(m => m.to(x * m.s));
        ql && ql(x * -18); qr && qr(x * 18);
      }, { passive: true });
    }
  }

  /* ---------------------------------------------------------
     Nav behaviour
  --------------------------------------------------------- */
  function nav(){
    const el = document.getElementById('nav');
    const wa = document.getElementById('floaters');
    if (document.getElementById('hero')) {
      ScrollTrigger.create({
        trigger: '#hero', start: 'bottom 90px',
        onLeave: () => { el.classList.remove('on-hero'); wa && wa.classList.add('is-in'); },
        onEnterBack: () => { el.classList.add('on-hero'); wa && wa.classList.remove('is-in'); }
      });
      el.classList.add('on-hero');
    } else if (wa) { wa.classList.add('is-in'); }
    let last = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self){
        const y = self.scroll();
        if (y > 400 && self.direction === 1 && y - last > 4) el.classList.add('is-hidden');
        else if (self.direction === -1) el.classList.remove('is-hidden');
        last = y;
      }
    });
  }

  /* ---------------------------------------------------------
     Global progress
  --------------------------------------------------------- */
  function progress(){
    gsap.to('#progressBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    gsap.to('#progressDaisy svg', { rotate: 720, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  }

  /* ---------------------------------------------------------
     Marquees
  --------------------------------------------------------- */
  function marquees(){
    document.querySelectorAll('[data-marquee]').forEach(track => {
      const first = track.children[0];
      // clone enough to fill 2x viewport
      let w = first.getBoundingClientRect().width;
      let n = Math.ceil((window.innerWidth * 2) / Math.max(w, 1)) + 1;
      for (let i = 0; i < n; i++) track.appendChild(first.cloneNode(true));
      if (reduced) return;
      const dir = parseFloat(track.dataset.dir || 1);
      const dist = () => track.children[0].getBoundingClientRect().width;
      const tween = gsap.to(track, {
        x: () => -dist() * dir, ease: 'none', duration: () => dist() / 60, repeat: -1,
        modifiers: { x: gsap.utils.unitize(x => parseFloat(x) % dist()) }
      });
      // scroll velocity influences speed
      let lastTs = 1, settle;
      ScrollTrigger.create({
        onUpdate(self){
          const v = Math.min(Math.abs(self.getVelocity()) / 1200, 3);
          const ts = (1 + v) * (self.direction || 1);
          if (Math.abs(ts - lastTs) > .35) { lastTs = ts; gsap.to(tween, { timeScale: ts, duration: .4, overwrite: true }); }
          clearTimeout(settle); settle = setTimeout(() => { lastTs = 1; gsap.to(tween, { timeScale: 1, duration: 1.2, overwrite: true }); }, 260);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Reveals (images, cards, parallax)
  --------------------------------------------------------- */
  function reveals(){
    if (reduced) return;
    document.querySelectorAll('.reveal-img').forEach(fig => {
      const media = fig.querySelector('img, iframe');
      const r = getComputedStyle(fig).borderRadius || '28px';
      gsap.set(fig, { clipPath: `inset(0 0 100% 0 round ${r})` });
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 88%', toggleActions: 'play none none none' } })
        .to(fig, { clipPath: `inset(0 0 0% 0 round ${r})`, duration: 1.3, ease: 'power4.inOut' })
        .to(media, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0)
        .set(fig, { clipPath: 'none' }); // not clearProps: that would restore the hidden CSS state
    });
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const s = parseFloat(el.dataset.parallax);
      gsap.to(el, { yPercent: s * 100, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    const batch = (sel, vars) => ScrollTrigger.batch(sel, {
      start: 'top 88%', once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .08, ...vars })
    });
    batch('.step'); batch('.pillars li'); batch('.checklist li', { stagger: .05 }); batch('.fact'); batch('.info div');
  }

  /* ---------------------------------------------------------
     Horizontal pinned collections
  --------------------------------------------------------- */
  let hST = null;
  function horizontal(){
    const section = document.querySelector('.hscroll');
    const track = document.getElementById('hTrack');
    if (!section || !track) return;
    if (hST) { hST.kill(); gsap.set(track, { clearProps: 'x' }); }
    const dist = () => track.scrollWidth - window.innerWidth;
    if (reduced || window.innerWidth < 760) {
      section.classList.add('is-native');
      track.style.overflowX = 'auto';
      return;
    }
    const tween = gsap.to(track, {
      x: () => (isRTL() ? 1 : -1) * dist(), ease: 'none',
      scrollTrigger: {
        trigger: section, start: 'top top', end: () => '+=' + dist(), pin: '.hscroll__pin', scrub: 1,
        anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate(self){
          gsap.set('#hProg', { scaleX: self.progress });
          const w = document.querySelector('.hscroll__progress').offsetWidth;
          gsap.set('#hDaisy', { x: (isRTL() ? -1 : 1) * self.progress * w, rotate: self.progress * 360 });
          if (isRTL()) gsap.set('#hDaisy', { left: 'auto', right: 0 });
        }
      }
    });
    hST = tween.scrollTrigger;
  }
  function cardsEntrance(){
    if (reduced) return;
    gsap.from('.ccard', { y: 60, opacity: 0, duration: 1, ease: 'power3.out', stagger: .08,
      scrollTrigger: { trigger: '.hscroll', start: 'top 70%', toggleActions: 'play none none none' } });
  }

  /* ---------------------------------------------------------
     Bridal background word + footer word
  --------------------------------------------------------- */
  function bigWords(){
    if (reduced) return;
    gsap.to('.bridal__bgword', { xPercent: -20, ease: 'none',
      scrollTrigger: { trigger: '.bridal', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.footer__big', { yPercent: 40, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.map__pin', { scale: 0, duration: .8, ease: 'back.out(2)', scrollTrigger: { trigger: '.contact__map', start: 'top 70%', toggleActions: 'play none none none' } });
  }

  /* ---------------------------------------------------------
     Tilt cards + magnetic buttons + cursor
  --------------------------------------------------------- */
  function interactions(){
    if (isTouch || reduced) return;
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, { rotateY: x * 10, rotateX: -y * 10, transformPerspective: 900, duration: .6, ease: 'power3.out' });
      });
      card.addEventListener('mouseleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: .9, ease: 'elastic.out(1,.5)' }));
    });
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .4, duration: .5, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
    });
    const cur = document.getElementById('cursor');
    if (!cur) return;
    const cx = gsap.quickTo(cur, 'x', { duration: .3, ease: 'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration: .3, ease: 'power3.out' });
    window.addEventListener('mousemove', e => { cur.classList.add('is-on'); cx(e.clientX); cy(e.clientY); }, { passive: true });
    document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
      el.addEventListener('mouseenter', () => cur.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cur.classList.remove('is-hover'));
    });
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  let saved = 'en';
  try { saved = localStorage.getItem('sama-lang') || 'en'; } catch(e){}
  html.lang = saved; html.dir = saved === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.dataset.i18n; if (T[saved][k] != null) el.textContent = T[saved][k]; });

  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.addEventListener('click', () => {
    const next = html.lang === 'ar' ? 'en' : 'ar';
    applyLang(next);
    horizontal();
    ScrollTrigger.refresh();
  });
  window.SamaMotion = { rebuildText(){ buildWordReveals(); buildScrubWords(); ScrollTrigger.refresh(); } };

  function boot(){
    buildWordReveals();
    buildScrubWords();
    nav(); progress(); marquees(); reveals(); horizontal(); cardsEntrance(); bigWords(); interactions(); heroScroll();
    runLoader(() => {});
    ScrollTrigger.refresh();
  }
  // Start as soon as the logo + fonts are ready instead of waiting for every photo on the page.
  const logoImg = document.querySelector('.hero__logoimg') || document.querySelector('.loader__logo');
  const ready = logoImg && logoImg.decode ? logoImg.decode().catch(() => {}) : Promise.resolve();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  // never hold the page hostage to a slow font/CDN: start after 1.6 s at the latest
  const start = () => Promise.race([Promise.all([ready, fontsReady]), new Promise(r => setTimeout(r, 1600))]).then(boot);
  if (document.readyState !== 'loading') start(); else window.addEventListener('DOMContentLoaded', start);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
