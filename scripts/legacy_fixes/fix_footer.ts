import fs from 'fs';

let content = fs.readFileSync('src/components/Footer.tsx', 'utf8');

// Update footer background
content = content.replace(/bg-\[\#E42313\]/g, 'bg-[#1A1410]');
content = content.replace(/border-\[\#E42313\]\/20/g, 'border-[#E5DED4]/10');

// Update orange accents
content = content.replace(/text-orange-500/g, 'text-[#D4A574]');
content = content.replace(/bg-orange-500/g, 'bg-[#C75C1A]');
content = content.replace(/hover:bg-orange-600/g, 'hover:bg-[#C75C1A]/80');
content = content.replace(/shadow-orange-500\/10/g, 'shadow-black/20');

// Update OlmaLogo icon color
content = content.replace(/text-\[\#ea580c\]/g, 'text-[#D4A574]');

fs.writeFileSync('src/components/Footer.tsx', content, 'utf8');
