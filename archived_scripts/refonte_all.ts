import fs from 'fs';
import path from 'path';

const colors = {
  primary: '#C75C1A',
  primaryLight: '#FDF6EC',
  bg: '#F5F0E8',
  surface: '#FFFBF5',
  dark: '#1A1410',
  textPrimary: '#2C2118',
  textSecondary: '#8B7355',
  gold: '#D4A574',
  goldLight: '#FAF0E0',
  border: '#E5DED4',
  success: '#2D8A6E',
  overlay: '#1A1410'
};

const shadows = {
  sm: 'shadow-[0_2px_12px_rgba(26,20,16,0.04)]',
  md: 'shadow-[0_8px_30px_rgba(26,20,16,0.08)]',
  lg: 'shadow-[0_16px_48px_rgba(26,20,16,0.10)]',
  xl: 'shadow-[0_24px_64px_rgba(26,20,16,0.14)]',
};

// Generic replacement function
function replaceColors(content: string) {
  let c = content;
  // Replace old colors with new colors using regex
  c = c.replace(/bg-\[\#E42313\]/g, `bg-[${colors.primary}]`);
  c = c.replace(/text-\[\#E42313\]/g, `text-[${colors.primary}]`);
  c = c.replace(/border-\[\#E42313\]/g, `border-[${colors.primary}]`);
  c = c.replace(/from-\[\#E42313\]/g, `from-[${colors.primary}]`);
  c = c.replace(/to-\[\#FF5C00\]/g, `to-[#D98A50]`); // specific gradient end
  
  c = c.replace(/bg-\[\#FF5C00\]/g, `bg-[${colors.primary}]`);
  c = c.replace(/text-\[\#FF5C00\]/g, `text-[${colors.primary}]`);
  c = c.replace(/border-\[\#FF5C00\]/g, `border-[${colors.primary}]`);

  c = c.replace(/bg-\[\#2B1D15\]/g, `bg-[${colors.textPrimary}]`);
  c = c.replace(/text-\[\#2B1D15\]/g, `text-[${colors.textPrimary}]`);

  c = c.replace(/bg-\[\#3C2B22\]/g, `bg-[${colors.textPrimary}]`);
  c = c.replace(/text-\[\#3C2B22\]/g, `text-[${colors.textPrimary}]`);
  
  c = c.replace(/text-stone-900/g, `text-[${colors.textPrimary}]`);
  c = c.replace(/text-stone-800/g, `text-[${colors.textPrimary}]`);
  c = c.replace(/text-stone-500/g, `text-[${colors.textSecondary}]`);
  c = c.replace(/text-stone-400/g, `text-[${colors.textSecondary}]`);
  
  c = c.replace(/bg-stone-50/g, `bg-[${colors.bg}]`);
  c = c.replace(/bg-stone-100/g, `bg-[${colors.bg}]`);
  c = c.replace(/bg-white/g, `bg-[${colors.surface}]`);
  c = c.replace(/border-stone-100/g, `border-[${colors.border}]`);
  c = c.replace(/border-stone-200/g, `border-[${colors.border}]`);

  return c;
}

// 1. BentoHero.tsx
let heroPath = 'src/components/Home/BentoHero.tsx';
if (fs.existsSync(heroPath)) {
  let c = fs.readFileSync(heroPath, 'utf8');
  // ACTUEL: bg-[#FAF8F5] py-4 sm:py-6 lg:py-8
  // NOUVEAU: bg-gradient-to-br from-[#C75C1A] via-[#D98A50] to-[#E8B87A] py-8 sm:py-12 lg:py-16 relative overflow-hidden
  c = c.replace(/bg-\[\#FAF8F5\] py-4 sm:py-6 lg:py-8/, `bg-gradient-to-br from-[${colors.primary}] via-[#D98A50] to-[#E8B87A] py-8 sm:py-12 lg:py-16 relative overflow-hidden before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] before:opacity-20`);
  c = c.replace(/text-\[\#2B1D15\]/g, `text-white drop-shadow-md`); // Make titles white
  c = c.replace(/bg-white/g, `bg-[${colors.surface}]`);
  fs.writeFileSync(heroPath, c, 'utf8');
}

// 2. TechTrustBanner.tsx
let techPath = 'src/components/Home/TechTrustBanner.tsx';
if (fs.existsSync(techPath)) {
  let c = fs.readFileSync(techPath, 'utf8');
  // ACTUEL: Fond sombre
  // NOUVEAU: bg-[#FFFBF5] border-y border-[#E5DED4]
  c = c.replace(/bg-zinc-900 border-zinc-800/, `bg-[${colors.surface}] border-y border-[${colors.border}]`);
  c = c.replace(/text-white/g, `text-[${colors.textPrimary}]`);
  c = c.replace(/text-zinc-400/g, `text-[${colors.textSecondary}]`);
  c = c.replace(/text-zinc-300/g, `text-[${colors.textSecondary}]`);
  c = c.replace(/bg-zinc-800\/50/g, `bg-[${colors.gold}]/10`);
  c = c.replace(/text-\[\#FF5C00\]/g, `text-[${colors.gold}]`);
  fs.writeFileSync(techPath, c, 'utf8');
}

// 4. NeoCategoryGrid.tsx
let catPath = 'src/components/Home/NeoCategoryGrid.tsx';
if (fs.existsSync(catPath)) {
  let c = fs.readFileSync(catPath, 'utf8');
  c = c.replace(/bg-stone-50 py-12/, `bg-[${colors.bg}] py-16`);
  // Cartes
  c = c.replace(/bg-white rounded-\[2rem\] p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border border-stone-200\/60 flex flex-col items-center justify-center gap-3 relative overflow-hidden/g, 
    `bg-[${colors.surface}] rounded-2xl p-4 ${shadows.md} hover:${shadows.lg} hover:-translate-y-1 transition-all duration-500 ease-out group border border-[${colors.border}]/50 flex flex-col items-center justify-center gap-3 relative overflow-hidden hover:border-[${colors.gold}]/30`);
  c = replaceColors(c);
  // Title
  c = c.replace(/text-3xl md:text-5xl font-kinder text-\[\#2C2118\] tracking-tight uppercase drop-shadow-sm/g, `font-serif text-3xl md:text-4xl font-bold tracking-tight text-[${colors.textPrimary}]`);
  c = c.replace(/font-sans font-bold text-xs uppercase tracking-widest text-stone-500/g, `font-mono text-[9px] uppercase tracking-[0.2em] font-black text-[${colors.textSecondary}]`);
  // Names
  c = c.replace(/font-kinder text-base text-center leading-tight uppercase/g, `font-serif font-bold text-[${colors.textPrimary}] text-base text-center leading-tight`);
  fs.writeFileSync(catPath, c, 'utf8');
}

// 5. FlashSales.tsx
let flashPath = 'src/components/Home/FlashSales.tsx';
if (fs.existsSync(flashPath)) {
  let c = fs.readFileSync(flashPath, 'utf8');
  // Container
  c = c.replace(/bg-\[\#2B1D15\] rounded-3xl p-6 sm:p-8/g, `bg-gradient-to-r from-[${colors.primary}] to-[#D98A50] rounded-3xl p-6 sm:p-8 text-white`);
  // Text adjustments
  c = c.replace(/text-white/g, `text-white`); // Keep white
  c = c.replace(/text-white\/70/g, `text-white/80`);
  // Flash product cards
  c = c.replace(/bg-white\/5 rounded-2xl/g, `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl`);
  // "VOIR TOUTES LES OFFRES" btn
  c = c.replace(/bg-\[\#E42313\] hover:bg-\[\#FF5C00\] text-white/g, `bg-white text-[${colors.primary}] hover:bg-white/90`);
  fs.writeFileSync(flashPath, c, 'utf8');
}

// 6. FeaturedProductsCarousel.tsx
let featPath = 'src/components/Home/FeaturedProductsCarousel.tsx';
if (fs.existsSync(featPath)) {
  let c = fs.readFileSync(featPath, 'utf8');
  c = c.replace(/<div className="mt-16 sm:mt-24 mb-8">/, `<div className="bg-[${colors.surface}] py-16 mt-8 sm:mt-12 rounded-3xl relative">`);
  c = c.replace(/<h2 className="text-4xl sm:text-5xl font-kinder text-\[\#2C2118\] uppercase tracking-tight leading-none mb-3">/g, 
    `<h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[${colors.textPrimary}] mb-3 flex flex-col items-center gap-2">`);
  c = c.replace(/<div className="w-16 h-1\.5 bg-\[\#C75C1A\] rounded-full mb-6"/, `<div className="w-24 h-1 bg-[${colors.gold}] rounded-full mb-6"`);
  c = replaceColors(c);
  // Navigation arrows
  c = c.replace(/bg-white border-stone-200 text-stone-800 hover:bg-\[\#C75C1A\]/g, `bg-[${colors.bg}] border-[${colors.border}] text-[${colors.textPrimary}] hover:bg-[${colors.primary}]`);
  fs.writeFileSync(featPath, c, 'utf8');
}

// 8. DynamicSection.tsx
let dynPath = 'src/components/Home/DynamicSection.tsx';
if (fs.existsSync(dynPath)) {
  let c = fs.readFileSync(dynPath, 'utf8');
  c = c.replace(/bg-stone-50/, `bg-[${colors.bg}]`);
  c = c.replace(/bg-white/, `bg-[${colors.surface}]`);
  c = c.replace(/text-4xl sm:text-5xl font-kinder text-white uppercase tracking-tighter rtl:tracking-normal leading-none/, `font-serif text-3xl md:text-4xl font-bold tracking-tight text-white`);
  c = replaceColors(c);
  fs.writeFileSync(dynPath, c, 'utf8');
}

// 10. BoutiquesMarques.tsx
let boutPath = 'src/components/Home/BoutiquesMarques.tsx';
if (fs.existsSync(boutPath)) {
  let c = fs.readFileSync(boutPath, 'utf8');
  c = c.replace(/bg-white py-16 sm:py-24/, `bg-[${colors.bg}] py-16`);
  c = c.replace(/bg-stone-50/g, `bg-[${colors.surface}]`);
  c = c.replace(/border-stone-100/g, `border-[${colors.border}]`);
  c = replaceColors(c);
  fs.writeFileSync(boutPath, c, 'utf8');
}

// 12. HomeEndlessGrid.tsx
let gridPath = 'src/components/Home/HomeEndlessGrid.tsx';
if (fs.existsSync(gridPath)) {
  let c = fs.readFileSync(gridPath, 'utf8');
  c = c.replace(/<div className="w-full max-w-\[90rem\] mx-auto px-4 sm:px-6 md:px-8 pb-16 mt-8 sm:mt-16">/, `<div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-[${colors.surface}]">`);
  c = replaceColors(c);
  fs.writeFileSync(gridPath, c, 'utf8');
}

console.log("All sections updated with Luxe Saharien Moderne.");
