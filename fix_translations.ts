import fs from 'fs';
import path from 'path';

// 1. Gather all files
const filesToProcess = [
  'src/pages/Public/Home.tsx',
  ...fs.readdirSync('src/components/Home')
    .filter(f => f.endsWith('.tsx'))
    .map(f => 'src/components/Home/' + f)
];

// 2. We'll extract and replace
let newKeysFr: Record<string, string> = {};

filesToProcess.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix seo_home_title !== "seo_home_title" ? t("seo_home_title") : "Fallback"
  content = content.replace(/t\("([^"]+)"\)\s*!==\s*"[^"]+"\s*\?\s*t\("[^"]+"\)\s*:\s*"([^"]+)"/g, (match, key, fallback) => {
    newKeysFr[key] = fallback;
    return `t("${key}")`;
  });

  // Fix t("key") || "Fallback"
  content = content.replace(/t\("([^"]+)"\)\s*\|\|\s*"([^"]+)"/g, (match, key, fallback) => {
    newKeysFr[key] = fallback;
    return `t("${key}")`;
  });

  // some might have single quotes
  content = content.replace(/t\('([^']+)'\)\s*\|\|\s*"([^"]+)"/g, (match, key, fallback) => {
    newKeysFr[key] = fallback;
    return `t("${key}")`;
  });
  
  // also fix standard things like {t("Text without key")} that are not in dictionary
  const literalMatches = [...content.matchAll(/t\("([^"]+)"\)/g)];
  literalMatches.forEach(m => {
    const key = m[1];
    if (key.includes(' ') || key.match(/^[A-Z]/)) { // Looks like a literal text
      if (!newKeysFr[key]) newKeysFr[key] = key;
    }
  });

  fs.writeFileSync(file, content, 'utf8');
});

// Let's add specific translations manually for Arabic to be sure:
const translationsToAdd: Record<string, {fr: string, ar: string, en: string}> = {};

for (const [key, fr] of Object.entries(newKeysFr)) {
  translationsToAdd[key] = {
    fr,
    en: fr, // default fallback for EN
    ar: fr // default fallback for AR
  };
}

// Override with specific Arabic translations for e-commerce
Object.assign(translationsToAdd, {
  "cat_beauty_title": { fr: "Beauté & Pureté", ar: "الجمال والنقاء", en: "Beauty & Purity" },
  "cat_beauty_desc": { fr: "Soins naturels et bio d'Algérie", ar: "عناية طبيعية وعضوية", en: "Natural organic care" },
  "cat_electronic_title": { fr: "Électronique", ar: "إلكترونيات", en: "Electronics" },
  "cat_electronic_desc": { fr: "Gadgets connectés", ar: "أجهزة ذكية", en: "Smart Gadgets" },
  "cat_appliance_title": { fr: "Électroménager", ar: "أجهزة كهرومنزلية", en: "Home Appliances" },
  "cat_appliance_desc": { fr: "Pour la maison", ar: "للمنزل", en: "For the home" },
  "cat_scolaire_title": { fr: "Scolaire & Bureau", ar: "مستلزمات مدرسية ومكتبية", en: "School & Office" },
  "cat_scolaire_desc": { fr: "Livres, fournitures & rentrée", ar: "كتب وأدوات مدرسية", en: "Books & supplies" },
  "hero_title_1": { fr: "Olma Marketplace", ar: "سوق أولما", en: "Olma Marketplace" },
  "hero_btn_1": { fr: "Découvrir la Collection", ar: "اكتشف التشكيلة", en: "Discover Collection" },
  "hero_title_2": { fr: "Design & Tradition", ar: "تصميم وتقاليد", en: "Design & Tradition" },
  "hero_btn_2": { fr: "Explorer", ar: "تصفح الآن", en: "Explore" },
  "home.popup.exclusive_offer": { fr: "Offre Exclusive", ar: "عرض حصري", en: "Exclusive Offer" },
  "seo_home_title": { fr: "OLMART | Marketplace N°1 en Algérie", ar: "OLMART | السوق رقم 1 في الجزائر", en: "OLMART | #1 Marketplace in Algeria" },
  "seo_home_description": { fr: "La première marketplace en Algérie.", ar: "أول سوق إلكتروني في الجزائر.", en: "First marketplace in Algeria." },
  "seo_home_keywords": { fr: "olmart, marketplace algérie", ar: "أولما, سوق الجزائر, تسوق", en: "olmart, algeria marketplace" },
  "home.sr_title": { fr: "Olma Marketplace - La plus grande plateforme", ar: "سوق أولما - أكبر منصة", en: "Olma Marketplace" },
  "home.regional_filter_active": { fr: "FILTRE ACTIF", ar: "تصفية نشطة", en: "ACTIVE FILTER" },
  "exploration_premium": { fr: "LES INCONTOURNABLES", ar: "الأساسيات", en: "MUST HAVES" },
  "product.premium_selection": { fr: "Sélection Magique", ar: "تشكيلة سحرية", en: "Magic Selection" },
  "Voir la Collection": { fr: "Tout Découvrir", ar: "اكتشف الكل", en: "Discover All" },
  "Prochain arrivage imminent": { fr: "Aucune pièce premium actuellement.", ar: "لا توجد قطع ممتازة حاليا.", en: "No premium items currently." },
  "FIABILITÉ": { fr: "TRUST", ar: "الموثوقية", en: "TRUST" },
  "home.pour_vous.prefix": { fr: "POUR", ar: "لأجل", en: "FOR" },
  "home.pour_vous.suffix": { fr: "VOUS", ar: "ـك", en: "YOU" },
  "home.pour_vous.explore_all": { fr: "TOUT VOIR", ar: "عرض الكل", en: "SEE ALL" },
  "Voir les produits précédents": { fr: "Voir les produits précédents", ar: "عرض المنتجات السابقة", en: "View previous products" },
  "Voir plus de produits": { fr: "Voir plus de produits", ar: "عرض المزيد من المنتجات", en: "View more products" },
  "home.social_proof.quote": { fr: "\"Service extra, livraison rapide vers Oran en 48h !\"", ar: "\"خدمة ممتازة وتوصيل سريع إلى وهران في 48 ساعة!\"", en: "\"Great service, fast delivery!\"" },
  "home.social_proof.verified": { fr: "Vérifié", ar: "تم التحقق", en: "Verified" },
  "home.voir_encore": { fr: "À DÉCOUVRIR", ar: "للاكتشاف", en: "TO DISCOVER" },
  "home.voir_encore_desc": { fr: "Continuez l'aventure avec nos pépites recommandées !", ar: "واصل المغامرة مع إبداعاتنا الموصى بها!", en: "Continue the adventure!" },
  "Voir tout": { fr: "Explorer", ar: "تصفح", en: "Explore" },
  "Hero Banner": { fr: "Hero Banner", ar: "بانر رئيسي", en: "Hero Banner" },
  "home.hero.exclusive_selection": { fr: "DÉCOUVERTE EXCLUSIVE", ar: "اكتشاف حصري", en: "EXCLUSIVE DISCOVERY" },
  "cat_explore": { fr: "C'EST PARTI", ar: "لننطلق", en: "LET'S GO" },
  "home.shops.community_badge": { fr: "Communauté OLMART", ar: "مجتمع أولما", en: "OLMART Community" },
  "home.shops.title": { fr: "Boutiques & Marques Officielles", ar: "المتاجر والعلامات الرسمية", en: "Official Stores & Brands" },
  "Voir la boutique précédente": { fr: "Voir la boutique précédente", ar: "عرض المتجر السابق", en: "View previous store" },
  "home.shops.visit_boutique": { fr: "Visiter la boutique", ar: "زيارة المتجر", en: "Visit store" },
  "Voir la boutique suivante": { fr: "Voir la boutique suivante", ar: "عرض المتجر التالي", en: "View next store" },
  "home.sections.new_arrivals": { fr: "Nouveautés", ar: "وصل حديثاً", en: "New Arrivals" },
  "home.sections.top_picks": { fr: "Recommandé pour vous", ar: "موصى به لك", en: "Top Picks" },
  "home.sections.trending": { fr: "Tendances actuelles", ar: "الترند الحالي", en: "Trending Now" },
  "home.sections.flash_sale": { fr: "Ventes Flash", ar: "عروض فلاش", en: "Flash Sales" },
  "home.sections.default": { fr: "Sélection du moment", ar: "اختيارات اليوم", en: "Current Selection" },
  "home.sections.see_more": { fr: "VOIR PLUS", ar: "عرض المزيد", en: "SEE MORE" },
  "common.edit": { fr: "Modifier", ar: "تعديل", en: "Edit" },
  "home.featured.title_premium": { fr: "CRAFT PRIDE", ar: "فخر الصناعة", en: "CRAFT PRIDE" },
  "home.featured.title_prefix": { fr: "LA SÉLECTION", ar: "تشكيلة", en: "THE SELECTION" },
  "home.featured.explore_all": { fr: "TOUT EXPLORER", ar: "استكشف الكل", en: "EXPLORE ALL" },
  "home.category.recommended_star": { fr: "⭐ RECOMMANDÉ", ar: "⭐ موصى به", en: "⭐ RECOMMENDED" },
  "delivery_58_wilayas": { fr: "Logistique Algérie 58 Wilayas", ar: "توصيل 58 ولاية جزائرية", en: "58 Wilayas Logistics" },
  "calc_shipping_fees": { fr: "Calculez vos frais de port", ar: "احسب مصاريف الشحن", en: "Calculate shipping fees" },
  "cash_on_delivery": { fr: "Paiement à la livraison", ar: "الدفع عند الاستلام", en: "Cash on delivery" },
  "cash_on_delivery_desc": { fr: "Payez en espèces à réception du colis", ar: "الدفع نقداً عند استلام الطرد", en: "Pay in cash upon receipt" },
  "transparent_fees": { fr: "Frais transparents", ar: "رسوم شفافة", en: "Transparent fees" },
  "transparent_fees_desc": { fr: "Tarifs calculés au plus juste", ar: "أسعار محسوبة بدقة", en: "Fairly calculated rates" },
  "step_choose_wilaya": { fr: "Étape 1 : Choisissez votre Wilaya", ar: "الخطوة 1: اختر ولايتك", en: "Step 1: Choose your Wilaya" },
  "modify": { fr: "Modifier ▾", ar: "تغيير ▾", en: "Modify ▾" },
  "search_wilaya_placeholder": { fr: "Saisissez votre Wilaya", ar: "أدخل ولايتك", en: "Enter your Wilaya" },
  "no_matching_wilaya": { fr: "Aucune Wilaya correspondante.", ar: "لا توجد ولاية مطابقة.", en: "No matching Wilaya." },
  "active_badge": { fr: "Actif ✓", ar: "نشط ✓", en: "Active ✓" },
  "main_option": { fr: "Option principale", ar: "الخيار الأساسي", en: "Main option" },
  "home_delivery": { fr: "Livraison à domicile", ar: "توصيل للمنزل", en: "Home delivery" },
  "home_delivery_desc": { fr: "Colis déposé en main propre", ar: "طرد يسلم يداً بيد", en: "Hand delivered" },
  "economic_option": { fr: "Option économique", ar: "خيار اقتصادي", en: "Economic option" },
  "stop_desk": { fr: "Point Relais / Stop Desk", ar: "نقطة استلام / Stop Desk", en: "Relay Point" },
  "stop_desk_desc": { fr: "À récupérer au bureau local", ar: "استلام من المكتب المحلي", en: "Pick up at local office" },
  "estimated_delay": { fr: "Délai estimé", ar: "المدة المقدرة", en: "Estimated delay" },
  "shipping_under": { fr: "Expédition sous", ar: "شحن خلال", en: "Shipping under" },
  "estimated_by": { fr: "🚀 Estimé d'ici le", ar: "🚀 متوقع بحلول", en: "🚀 Estimated by" },
  "home.trust.delivery_58": { fr: "LIVRAISON 58 WILAYAS", ar: "توصيل 58 ولاية", en: "58 WILAYAS DELIVERY" },
  "home.trust.cod": { fr: "PAIEMENT CASH", ar: "الدفع نقداً", en: "CASH PAYMENT" },
  "home.trust.certified": { fr: "CRAFT PRIDE", ar: "منتجات معتمدة", en: "CERTIFIED" },
  "Ventes Flash": { fr: "Ventes Flash", ar: "عروض فلاش", en: "Flash Sales" },
  "Ne manquez pas nos offres exceptionnelles à durée limitée. Prix de choc immédiats !": { fr: "Ne manquez pas nos offres...", ar: "لا تفوت عروضنا الاستثنائية بأسعار مذهلة!", en: "Don't miss our offers..." },
  "VOIR TOUTES LES OFFRES": { fr: "VOIR TOUTES LES OFFRES", ar: "عرض كل العروض", en: "VIEW ALL OFFERS" },
  "Afficher plus": { fr: "Afficher plus", ar: "عرض المزيد", en: "Show more" },
  "Aucun produit trouvé.": { fr: "Aucun produit trouvé.", ar: "لم يتم العثور على أي منتج.", en: "No products found." },
  "Aucun produit trouvé pour cette section.": { fr: "Aucun produit trouvé pour cette section.", ar: "لم يتم العثور على أي منتج في هذا القسم.", en: "No products found for this section." }
});

let dictPath = 'src/locales/dictionary.ts';
let dictContent = fs.readFileSync(dictPath, 'utf8');

function injectKeys(lang: string, keys: Record<string, string>) {
  const langMatch = new RegExp(`${lang}:\\s*\\{`, 'g');
  const match = langMatch.exec(dictContent);
  if (match) {
    const insertPos = match.index + match[0].length;
    let newStr = '\n';
    for (const [k, v] of Object.entries(keys)) {
      newStr += `    "${k.replace(/"/g, '\\"')}": ${JSON.stringify(v)},\n`;
    }
    dictContent = dictContent.slice(0, insertPos) + newStr + dictContent.slice(insertPos);
  }
}

let frToAdd: any = {};
let arToAdd: any = {};
let enToAdd: any = {};

for (const [k, obj] of Object.entries(translationsToAdd)) {
  if (!dictContent.includes(`"${k}":`)) {
    frToAdd[k] = obj.fr;
    arToAdd[k] = obj.ar;
    enToAdd[k] = obj.en;
  }
}

injectKeys('fr', frToAdd);
injectKeys('ar', arToAdd);
injectKeys('en', enToAdd);

fs.writeFileSync(dictPath, dictContent, 'utf8');

console.log("Translation keys injected and files fixed.");
