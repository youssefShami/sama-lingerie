/* =========================================================
   SAMA — catalogue data (placeholder products, real photos)
   Edit freely: prices in USD, names in EN + AR.
   Set `old` to show an offer (strike-through + badge).
   `stock:false` marks an item sold out; `hidden:true` hides it.
   `thumb` is an optional small image used in grids; `imgs` extra photos.
   NOTE: this file is only the fallback/seed. Once the dashboard saves,
   the site loads the live catalogue from /api/catalog instead.
   ========================================================= */
window.SAMA_DATA = (() => {
  const U = id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;
  const P = id => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
  const APP = ['S', 'M', 'L', 'XL'];
  const ONE = ['One size'];
  const C = {
    blush: { en: 'Blush', ar: 'زهري', hex: '#F6D6DC' },
    cream: { en: 'Cream', ar: 'كريمي', hex: '#FFF8EE' },
    white: { en: 'White', ar: 'أبيض', hex: '#FFFFFF' },
    marigold: { en: 'Marigold', ar: 'أصفر', hex: '#FFC466' },
    sky: { en: 'Sky', ar: 'سماوي', hex: '#BBD5EA' },
    sage: { en: 'Sage', ar: 'أخضر فاتح', hex: '#C9D6B8' },
    gold: { en: 'Gold', ar: 'ذهبي', hex: '#C9A24A' },
    camel: { en: 'Camel', ar: 'كاميل', hex: '#C9A27E' },
    black: { en: 'Black', ar: 'أسود', hex: '#2B2B2B' }
  };

  const CATS = [
    { id: 'all',      en: 'All',               ar: 'الكل' },
    { id: 'pajamas',  en: 'Pajama sets',       ar: 'أطقم بيجامات' },
    { id: 'lingerie', en: 'Lingerie sets',     ar: 'أطقم لانجري' },
    { id: 'lounge',   en: 'Loungewear',        ar: 'لباس منزلي' },
    { id: 'robes',    en: 'Robes & kimonos',   ar: 'أرواب وكيمونو' },
    { id: 'bridal',   en: 'Bridal boxes',      ar: 'بوكسات العروس' },
    { id: 'extras',   en: 'Slippers & extras', ar: 'شحاطات وإضافات' }
  ];

  const PRODUCTS = [
    // ---- Pajama sets
    { id: 'pj1', cat: 'pajamas', en: 'Cloud cotton pajama set', ar: 'طقم بيجاما قطن كلاود', price: 28, img: P(6625450), sizes: APP, colors: ['marigold', 'blush', 'white'], tag: 'bestseller',
      den: 'Soft brushed cotton, long sleeve + trousers. The one you live in all winter.', dar: 'قطن ناعم مفرّش، كم طويل وبنطلون. الطقم الذي تعيشين فيه طوال الشتاء.' },
    { id: 'pj2', cat: 'pajamas', en: 'Dotted satin pajama set', ar: 'طقم بيجاما ساتان منقّط', price: 32, old: 38, img: U('1766056278842-b754f1e093c0'), sizes: APP, colors: ['white', 'blush', 'sky'],
      den: 'Silky satin shirt and trousers with contrast piping. Cool to the touch.', dar: 'قميص وبنطلون ساتان ناعم مع حواف متباينة. بارد على البشرة.' },
    { id: 'pj3', cat: 'pajamas', en: 'Powder blue piped set', ar: 'طقم أزرق فاتح بحواف', price: 30, img: U('1768696082915-bdc6774f94c7'), sizes: APP, colors: ['sky', 'cream'], tag: 'new',
      den: 'Textured waffle-weave with white piping. Light, airy, breathable.', dar: 'نسيج وافل مع حواف بيضاء. خفيف وهوائي ومريح.' },
    { id: 'pj4', cat: 'pajamas', en: 'Cream piped long set', ar: 'طقم طويل كريمي بحواف', price: 30, old: 36, img: U('1768696083097-600943ad9d05'), sizes: APP, colors: ['cream', 'blush'],
      den: 'Classic long pajama set in warm cream with dark piping.', dar: 'طقم بيجاما كلاسيكي طويل بلون كريمي دافئ مع حواف داكنة.' },
    { id: 'pj5', cat: 'pajamas', en: 'Pineapple print short set', ar: 'طقم قصير بطبعة الأناناس', price: 24, img: P(28761349), sizes: APP, colors: ['blush'],
      den: 'Playful short set for warm nights. Cotton blend, elastic waist.', dar: 'طقم قصير مرح لليالي الدافئة. قطن مخلوط وخصر مطّاطي.' },

    // ---- Lingerie sets
    { id: 'li1', cat: 'lingerie', en: 'Soft lace bralette set', ar: 'طقم براليت دانتيل ناعم', price: 18, img: P(18530983), sizes: APP, colors: ['white', 'blush', 'black'], tag: 'bestseller',
      den: 'Wire-free bralette and brief in stretch floral lace. Everyday comfort.', dar: 'براليت بدون سلك مع كيلوت من الدانتيل المرن. راحة يومية.' },
    { id: 'li2', cat: 'lingerie', en: 'Gold-thread lace set', ar: 'طقم دانتيل بخيط ذهبي', price: 22, old: 26, img: P(6276025), sizes: APP, colors: ['gold', 'cream'],
      den: 'Beige lace with a fine metallic thread. Soft lining, adjustable straps.', dar: 'دانتيل بيج مع خيط معدني رفيع. بطانة ناعمة وأشرطة قابلة للتعديل.' },
    { id: 'li3', cat: 'lingerie', en: 'Everyday cotton set · 2 pack', ar: 'طقم قطن يومي · قطعتان', price: 20, img: P(8793891), sizes: APP, colors: ['blush', 'white'],
      den: 'Two soft cotton sets in blush and white. Breathable, no-show seams.', dar: 'طقمان من القطن الناعم بالزهري والأبيض. مريح وبدرزات غير ظاهرة.' },

    // ---- Loungewear
    { id: 'lo1', cat: 'lounge', en: 'Ribbed knit lounge set', ar: 'طقم منزلي تريكو مضلّع', price: 34, img: U('1759229874709-a8d0de083b91'), sizes: APP, colors: ['camel', 'cream', 'sage'], tag: 'new',
      den: 'Relaxed ribbed knit top and wide trousers. From sofa to balcony.', dar: 'بلوزة تريكو مضلّعة وبنطلون واسع. من الكنبة إلى البلكون.' },
    { id: 'lo2', cat: 'lounge', en: 'Oversized sleep tee', ar: 'تيشيرت نوم واسع', price: 14, img: P(8416085), sizes: ['S/M', 'L/XL'], colors: ['white', 'marigold', 'blush'],
      den: 'Loose, long and soft. The easiest thing to sleep in.', dar: 'واسع وطويل وناعم. أسهل قطعة للنوم.' },

    // ---- Robes & kimonos
    { id: 'ro1', cat: 'robes', en: 'Blush satin robe', ar: 'روب ساتان زهري', price: 26, old: 32, img: U('1766056278976-87f269e3b69c'), sizes: ['S/M', 'L/XL'], colors: ['blush', 'cream', 'white'], tag: 'bestseller',
      den: 'Knee-length satin robe with belt and shawl collar. The getting-ready essential.', dar: 'روب ساتان بطول الركبة مع حزام وياقة شال. أساسي التحضير.' },
    { id: 'ro2', cat: 'robes', en: 'Ice-blue satin robe', ar: 'روب ساتان أزرق ثلجي', price: 26, img: U('1770294759006-356f25f4f156'), sizes: ['S/M', 'L/XL'], colors: ['sky', 'white'],
      den: 'Light satin robe with white shawl collar and side pockets.', dar: 'روب ساتان خفيف مع ياقة شال بيضاء وجيوب جانبية.' },
    { id: 'ro3', cat: 'robes', en: 'Bridal lace-trim robe', ar: 'روب العروس بحواف دانتيل', price: 38, img: P(38614073), sizes: ['S/M', 'L/XL'], colors: ['white', 'cream'],
      den: 'White satin with scalloped lace trim. Made for the morning of.', dar: 'ساتان أبيض مع حواف دانتيل. مصنوع لصباح العرس.' },

    // ---- Bridal boxes
    { id: 'br1', cat: 'bridal', en: 'Bride-to-be box · 3 sets + robe', ar: 'بوكس العروس · ٣ أطقم + روب', price: 120, old: 145, img: P(34631585), sizes: APP, colors: ['white', 'blush', 'gold'], tag: 'bundle',
      den: 'Wedding-night set, two honeymoon pajama sets and a satin robe, wrapped with a daisy ribbon.', dar: 'طقم ليلة العرس، طقما بيجاما لشهر العسل وروب ساتان، مغلّفة بشريطة الأقحوان.' },
    { id: 'br2', cat: 'bridal', en: 'Honeymoon pajama trio', ar: 'ثلاثية بيجامات شهر العسل', price: 75, old: 90, img: P(16065663), sizes: APP, colors: ['white', 'blush', 'sky'], tag: 'bundle',
      den: 'Three satin pajama sets in your colours. Save compared to buying separately.', dar: 'ثلاثة أطقم بيجاما ساتان بألوانك. وفّري مقارنة بالشراء المنفصل.' },
    { id: 'br3', cat: 'bridal', en: 'Wedding-night satin set', ar: 'طقم ليلة العرس ساتان', price: 42, img: P(7988399), sizes: APP, colors: ['white', 'cream'],
      den: 'Champagne satin slip and robe with delicate lace edge.', dar: 'سليب وروب ساتان شامبين مع حافة دانتيل رقيقة.' },

    // ---- Slippers & extras
    { id: 'ex1', cat: 'extras', en: 'Fluffy home slippers', ar: 'شحاطات منزلية ناعمة', price: 12, img: P(20654846), sizes: ['36–37', '38–39', '40–41'], colors: ['white', 'blush', 'marigold'],
      den: 'Plush open-toe slippers with a soft sole.', dar: 'شحاطات قطيفة مفتوحة الأصابع مع نعل ناعم.' },
    { id: 'ex2', cat: 'extras', en: 'Gift box & daisy ribbon', ar: 'بوكس هدية وشريطة الأقحوان', price: 6, img: P(5485119), sizes: ONE, colors: ['gold', 'blush', 'white'],
      den: 'Add to any order. Rigid box, tissue paper, daisy ribbon and a handwritten card.', dar: 'أضيفيه لأي طلب. بوكس صلب، ورق حرير، شريطة أقحوان وبطاقة مكتوبة بخط اليد.' },
    { id: 'ex3', cat: 'extras', en: 'Satin scrunchie trio', ar: 'ثلاثية ربطات شعر ساتان', price: 5, img: U('1549465220-1a8b9238cd48'), sizes: ONE, colors: ['blush', 'marigold', 'gold'],
      den: 'Three satin scrunchies in brand colours.', dar: 'ثلاث ربطات شعر ساتان بألوان سما.' }
  ];

  // Static offer cards shown next to discounted products
  const DEALS = [
    { id: 'deal1', en: 'Buy 2 pajama sets, get a scrunchie trio free', ar: 'اشتري طقمَي بيجاما واحصلي على ثلاثية ربطات الشعر مجاناً', sub_en: 'Added automatically at checkout on WhatsApp', sub_ar: 'تُضاف تلقائياً عند الطلب عبر واتساب', cat: 'pajamas' },
    { id: 'deal2', en: 'Brides: free gift wrapping on every trousseau order', ar: 'للعرايس: تغليف هدايا مجاني على كل طلب جهاز', sub_en: 'Daisy ribbon, tissue and a handwritten card', sub_ar: 'شريطة أقحوان وورق حرير وبطاقة بخط اليد', cat: 'bridal' },
    { id: 'deal3', en: 'Free delivery in Saida on orders over $40', ar: 'توصيل مجاني داخل صيدا للطلبات فوق ٤٠$', sub_en: 'Rest of Lebanon: flat delivery fee', sub_ar: 'باقي لبنان: رسم توصيل ثابت', cat: 'all' }
  ];

  // About section + About page copy (editable from the dashboard)
  const ABOUT = {
    title: { en: 'Hello from Saida.', ar: 'مرحباً من صيدا.' },
    body: {
      en: "Sama opened in 2025 on Ghassan Hammoud Street, right opposite Al-Amir wal Amira bookstore. We import feminine everyday pieces from Turkey and keep them affordable, because feeling good at home shouldn't be a luxury. Warm, playful, approachable — that's the whole idea.",
      ar: 'افتُتح سما عام ٢٠٢٥ في شارع غسان حمود، مقابل مكتبة الأمير والأميرة. نستورد قطعاً أنثوية يومية من تركيا ونبقيها بأسعار معقولة، لأن الشعور بالراحة في البيت لا يجب أن يكون ترفاً. دافئ، مرح، قريب — هذه هي الفكرة كلها.'
    },
    cap: { en: 'Saida, on the Mediterranean', ar: 'صيدا، على المتوسّط' },
    img: P(33270837),
    img2: P(6625450),
    pillars: [
      { en: 'Affordable, always', ar: 'أسعار معقولة دائماً', den: 'Boutique feel, everyday prices.', dar: 'إحساس بوتيك، أسعار يومية.' },
      { en: 'Imported from Turkey', ar: 'مستورد من تركيا', den: 'Soft fabrics, careful finishing.', dar: 'أقمشة ناعمة، تشطيب متقن.' },
      { en: 'Feminine & everyday', ar: 'أنثوي ويومي', den: 'Made to be lived in, not saved for later.', dar: 'مصنوع ليُعاش فيه، لا ليُحفَظ لاحقاً.' },
      { en: 'Delivery all over Lebanon', ar: 'توصيل لكل لبنان', den: 'From Saida to your door.', dar: 'من صيدا إلى بابك.' }
    ],
    // Long story for the About page. Blank line = new paragraph.
    story: {
      en: "Sama started with a simple observation: the pieces women actually live in — pajamas, soft bralettes, a robe for slow mornings — were either overpriced or an afterthought in Saida's shops.\n\nSo in 2025 we opened a small yellow boutique on Ghassan Hammoud Street and filled it with everyday lingerie and loungewear imported from Turkey: soft fabrics, careful finishing, colours that make you smile, and prices that don't make you hesitate.\n\nBrides found us quickly. Putting a trousseau together usually means weeks of running between shops; here it takes one visit or one WhatsApp conversation. We curate the sets, wrap everything with our daisy ribbon and deliver anywhere in Lebanon.\n\nThe daisy in our logo says what we believe: feeling good at home should be light, cheerful and within reach.",
      ar: 'بدأت سما من ملاحظة بسيطة: القطع التي تعيش فيها المرأة فعلاً — البيجامات، البراليت الناعم، روب لصباحات هادئة — كانت إمّا غالية أو مهمَلة في محلات صيدا.\n\nلذلك افتتحنا عام ٢٠٢٥ بوتيكاً صغيراً أصفر في شارع غسان حمود وملأناه بلانجري ولباس منزلي يومي مستورد من تركيا: أقمشة ناعمة، تشطيب متقن، ألوان تبعث على الابتسام، وأسعار لا تجعلك تتردّدين.\n\nوجدتنا العرايس بسرعة. تجهيز الجهاز يعني عادةً أسابيع من التنقّل بين المحلات؛ هنا يكفي زيارة واحدة أو محادثة واتساب واحدة. ننسّق الأطقم، نغلّف كل شيء بشريطة الأقحوان ونوصّل إلى أي مكان في لبنان.\n\nالأقحوانة في شعارنا تقول ما نؤمن به: الشعور بالراحة في البيت يجب أن يكون خفيفاً ومبهجاً وفي متناول اليد.'
    }
  };

  return { CATS, PRODUCTS, DEALS, COLORS: C, ABOUT };
})();
