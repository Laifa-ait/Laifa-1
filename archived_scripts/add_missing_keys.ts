import fs from 'fs';

let dict = fs.readFileSync('src/locales/dictionary.ts', 'utf8');

// Add missing keys to fr, ar, en
function addKey(langObjStart, key, value) {
  return dict.replace(langObjStart, langObjStart + `\n    "${key}": "${value}",`);
}

// fr is "fr: { translation: {"
dict = addKey('"product_count": "{{count}} produits",', 'SOLD OUT', 'ÉPUISÉ');
dict = addKey('"product_count": "{{count}} produits",', 'DROP LIMITÉ', 'STOCK LIMITÉ');
dict = addKey('"product_count": "{{count}} produits",', 'VENTE FLASH', 'VENTE FLASH');
dict = addKey('"product_count": "{{count}} produits",', 'SPONSORED', 'SPONSORISÉ');

// ar is "ar: { translation: {"
dict = addKey('"product_count": "{{count}} منتجات",', 'SOLD OUT', 'نفذت الكمية');
dict = addKey('"product_count": "{{count}} منتجات",', 'DROP LIMITÉ', 'كمية محدودة');
dict = addKey('"product_count": "{{count}} منتجات",', 'VENTE FLASH', 'عرض حصري');
dict = addKey('"product_count": "{{count}} منتجات",', 'SPONSORED', 'ممَول');

// en is "en: { translation: {"
dict = addKey('"product_count": "{{count}} products",', 'SOLD OUT', 'SOLD OUT');
dict = addKey('"product_count": "{{count}} products",', 'DROP LIMITÉ', 'LIMITED DROP');
dict = addKey('"product_count": "{{count}} products",', 'VENTE FLASH', 'FLASH SALE');
dict = addKey('"product_count": "{{count}} products",', 'SPONSORED', 'SPONSORED');

fs.writeFileSync('src/locales/dictionary.ts', dict, 'utf8');
