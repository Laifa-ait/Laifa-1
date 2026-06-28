import fs from 'fs';

let dict = fs.readFileSync('src/locales/dictionary.ts', 'utf8');

// I'll manually replace the Arabic translations.
dict = dict.replace(
  /"PIÈCE UNIQUE ARTISANALE": "PIÈCE UNIQUE ARTISANALE",/g,
  (match, offset, string) => {
    // Only replace if it's in the ar block (around line 499)
    if (offset > 15000 && offset < 35000) {
      return '"PIÈCE UNIQUE ARTISANALE": "قطعة حرفية فريدة",';
    }
    // Only replace if it's in the en block (around line 925)
    if (offset > 35000) {
       return '"PIÈCE UNIQUE ARTISANALE": "UNIQUE HANDCRAFTED PIECE",';
    }
    return match; // fr
  }
);

dict = dict.replace(
  /"home\.featured\.title_prefix": "NOS INCONTOURNABLES",/g,
  (match, offset) => {
    if (offset > 15000 && offset < 35000) return '"home.featured.title_prefix": "لا تفوتها",';
    if (offset > 35000) return '"home.featured.title_prefix": "OUR MUST-HAVES",';
    return match;
  }
);

dict = dict.replace(
  /"Sonia A. •": "Sonia A. •",/g,
  (match, offset) => {
    if (offset > 15000 && offset < 35000) return '"Sonia A. •": "سونيا أ. •",';
    return match;
  }
);

fs.writeFileSync('src/locales/dictionary.ts', dict, 'utf8');
