import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');
home = home.replace(/bg-\[\#E33B1E\]/g, 'bg-[#2C2118]');
home = home.replace(/text-\[\#E33B1E\]/g, 'text-[#C75C1A]');
home = home.replace(/rgba\(227,59,30,0\.15\)/g, 'rgba(44,33,24,0.15)');
fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');

let flash = fs.readFileSync('src/components/Home/FlashSales.tsx', 'utf8');
flash = flash.replace(/bg-\[\#E33B1E\]/g, 'bg-[#C75C1A]');
flash = flash.replace(/text-\[\#E33B1E\]/g, 'text-[#C75C1A]');
flash = flash.replace(/border-red-400/g, 'border-[#C75C1A]/40');
fs.writeFileSync('src/components/Home/FlashSales.tsx', flash, 'utf8');

let card = fs.readFileSync('src/components/Product/ProductCard.tsx', 'utf8');
card = card.replace(/bg-\[\#E33B1E\]/g, 'bg-[#C75C1A]');
card = card.replace(/text-\[\#E33B1E\]/g, 'text-[#C75C1A]');
fs.writeFileSync('src/components/Product/ProductCard.tsx', card, 'utf8');
