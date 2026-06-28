import fs from 'fs';

let dict = fs.readFileSync('src/locales/dictionary.ts', 'utf8');

dict = dict.replace(/"home\.sections\.see_more": "VOIR PLUS"/g, '"home.sections.see_more": "Découvrir la sélection"');
dict = dict.replace(/"home\.sections\.see_more": "عرض المزيد"/g, '"home.sections.see_more": "استكشاف التشكيلة"');
dict = dict.replace(/"home\.sections\.see_more": "SEE MORE"/g, '"home.sections.see_more": "Discover selection"');

fs.writeFileSync('src/locales/dictionary.ts', dict, 'utf8');

// And remove any hardcoded "Voir plus" in Home
