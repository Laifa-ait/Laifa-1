import fs from 'fs';

function addKeys(file: string, keys: Record<string, string>) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = false;
  for (const [k, v] of Object.entries(keys)) {
    if (!data[k]) {
      data[k] = v;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

addKeys("public/locales/fr.json", {
  "Voir la Collection": "Voir la Collection",
  "Prochain arrivage imminent": "Prochain arrivage imminent",
  "Sonia A.": "Sonia A.",
  "Voir les produits précédents": "Voir les produits précédents",
  "Voir plus de produits": "Voir plus de produits"
});

addKeys("public/locales/en.json", {
  "Voir la Collection": "View Collection",
  "Prochain arrivage imminent": "Next arrival imminent",
  "Sonia A.": "Sonia A.",
  "Voir les produits précédents": "View previous products",
  "Voir plus de produits": "View more products"
});

addKeys("public/locales/ar.json", {
  "Voir la Collection": "عرض المجموعة",
  "Prochain arrivage imminent": "الوصول القادم وشيك",
  "Sonia A.": "سونيا أ.",
  "Voir les produits précédents": "عرض المنتجات السابقة",
  "Voir plus de produits": "عرض المزيد من المنتجات"
});
