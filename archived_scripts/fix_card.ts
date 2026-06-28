import fs from 'fs';

let content = fs.readFileSync('src/components/Product/ProductCard.tsx', 'utf8');

const colors = {
  primary: '#C75C1A',
  bg: '#F5F0E8',
  surface: '#FFFBF5',
  textPrimary: '#2C2118',
  textSecondary: '#8B7355',
  gold: '#D4A574',
  border: '#E5DED4',
};

// Main container
content = content.replace(/group flex flex-col bg-white rounded-\[2rem\] overflow-hidden shadow-sm hover:shadow-xl border border-\[\#FF5C00\]\/60 transition-all duration-300 cursor-pointer h-full/g, 
  `group flex flex-col bg-[#FFFBF5] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(26,20,16,0.06)] hover:shadow-[0_16px_48px_rgba(26,20,16,0.10)] border border-[${colors.border}] hover:border-[${colors.gold}]/30 transition-all duration-500 cursor-pointer h-full`);

// Image wrapper
content = content.replace(/aspect-\[4\/5\] bg-\[\#FDF9EC\] overflow-hidden shrink-0 p-2/g, `aspect-[4/5] bg-[${colors.bg}] overflow-hidden shrink-0`);
content = content.replace(/rounded-3xl overflow-hidden/g, `rounded-none overflow-hidden`); // remove inner rounding

// Colors
content = content.replace(/bg-\[\#FF5C00\]/g, `bg-[${colors.primary}]`);
content = content.replace(/text-\[\#FF5C00\]/g, `text-[${colors.primary}]`);
content = content.replace(/fill-\[\#FF5C00\]/g, `fill-[${colors.primary}]`);
content = content.replace(/stroke-\[\#FF5C00\]/g, `stroke-[${colors.primary}]`);
content = content.replace(/border-\[\#FF5C00\]/g, `border-[${colors.primary}]`);

content = content.replace(/bg-\[\#3C2B22\]/g, `bg-[${colors.textPrimary}]`);
content = content.replace(/text-\[\#3C2B22\]/g, `text-[${colors.textPrimary}]`);

// Typography inside product card bottom part (line 197+)
content = content.replace(/font-kinder text-\[\#2B1D15\] text-\[15px\] sm:text-\[17px\]/g, `font-serif font-bold text-[${colors.textPrimary}] text-[15px] sm:text-[17px] group-hover:text-[${colors.primary}]`);
content = content.replace(/font-kinder text-\[\#E42313\]/g, `font-mono font-black text-[${colors.textPrimary}]`);
content = content.replace(/text-stone-500/g, `text-[${colors.textSecondary}]`);
content = content.replace(/text-stone-400/g, `text-[${colors.textSecondary}]`);
content = content.replace(/text-zinc-400/g, `text-[${colors.textSecondary}]`);
content = content.replace(/text-zinc-500/g, `text-[${colors.textSecondary}]`);

fs.writeFileSync('src/components/Product/ProductCard.tsx', content, 'utf8');
