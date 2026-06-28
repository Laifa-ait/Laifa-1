import fs from 'fs';

let content = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

// 1. Hero Wrapper
content = content.replace(
  /<section className="w-full bg-\[\#FFFBF5\] py-4 sm:py-6 lg:py-8">/,
  `<section className="w-full bg-gradient-to-br from-[#C75C1A] via-[#D98A50] to-[#E8B87A] py-8 sm:py-12 lg:py-16 relative overflow-hidden before:absolute before:inset-0 before:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTTAgOEw4IDBaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] before:opacity-20">`
);

// 9. Section "POUR VOUS" wrapper
content = content.replace(
  /<section className="py-12 bg-\[\#FFFBF5\] relative z-20 overflow-hidden">/g,
  `<section className="py-16 bg-gradient-to-b from-[#F5F0E8] to-[#FFFBF5] relative z-20 overflow-hidden">`
);
content = content.replace(
  /<section className="py-12 bg-white relative z-20 overflow-hidden">/g,
  `<section className="py-16 bg-gradient-to-b from-[#F5F0E8] to-[#FFFBF5] relative z-20 overflow-hidden">`
);

// Pour Vous Card wrapper
content = content.replace(
  /<div className="bg-white rounded-3xl shadow-sm border-4 border-white p-6 sm:p-10 relative">/g,
  `<div className="bg-[#FFFBF5] rounded-3xl shadow-[0_20px_60px_rgba(26,20,16,0.08)] border border-[#E5DED4]/40 p-6 sm:p-10 relative">`
);

// Intermediate Banners
content = content.replace(
  /className={`relative block rounded-3xl overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-500 border-4 border-white cursor-pointer /g,
  `className={\`relative block rounded-2xl overflow-hidden group shadow-[0_16px_48px_rgba(26,20,16,0.10)] hover:shadow-[0_24px_64px_rgba(26,20,16,0.14)] hover:scale-[1.02] transition-all duration-500 cursor-pointer `
);

// Selection Premium (Fix the container padding)
content = content.replace(
  /<section className="pt-16 pb-16 bg-gradient-to-b from-\[\#F5F0E8\] to-\[\#FFFBF5\] rounded-\[2\.5rem\] relative overflow-hidden shadow-\[0_20px_60px_rgba\(26,20,16,0\.08\)\] border border-\[\#E5DED4\]\/40">/g,
  `<section className="pt-16 pb-16 bg-[#FFFBF5] rounded-[2.5rem] relative overflow-hidden shadow-[0_20px_60px_rgba(26,20,16,0.08)] border border-[#E5DED4]/40">`
);

fs.writeFileSync('src/pages/Public/Home.tsx', content, 'utf8');

// BentoHero fixes
let bento = fs.readFileSync('src/components/Home/BentoHero.tsx', 'utf8');
bento = bento.replace(/bg-gradient-to-br from-\[\#C75C1A\] via-\[\#D98A50\] to-\[\#E8B87A\] py-8 sm:py-12 lg:py-16 relative overflow-hidden before:absolute before:inset-0 before:bg-\[url\('.*?'\)\] before:opacity-20/g, `w-full min-h-[450px] sm:min-h-[500px] relative rounded-[2rem] overflow-hidden group shadow-[0_16px_48px_rgba(26,20,16,0.10)] border border-[#E5DED4]/30 mt-0`);
bento = bento.replace(/w-full min-h-\[450px\] sm:min-h-\[500px\] relative rounded-\[3rem\] overflow-hidden group shadow-md border-4 border-white mt-4 sm:mt-6/g, `w-full min-h-[450px] sm:min-h-[500px] relative rounded-[2rem] overflow-hidden group shadow-[0_16px_48px_rgba(26,20,16,0.10)] border border-[#E5DED4]/30 mt-0`);
bento = bento.replace(/border-4 border-white/g, 'border border-[#E5DED4]/30');
bento = bento.replace(/bg-\[\#FF5C00\]/g, 'bg-[#C75C1A]');
bento = bento.replace(/fill-\[\#FF5C00\]/g, 'fill-[#C75C1A]');
bento = bento.replace(/text-\[\#FF5C00\]/g, 'text-[#C75C1A]');
bento = bento.replace(/font-kinder/g, 'font-serif');
bento = bento.replace(/bg-\[\#FFFBF5\]/g, 'bg-[#F5F0E8]');
fs.writeFileSync('src/components/Home/BentoHero.tsx', bento, 'utf8');
