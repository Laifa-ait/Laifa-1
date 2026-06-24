import fs from 'fs';

let content = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

// Colors
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

// 1. General backgrounds
content = content.replace(/className="min-h-screen bg-white pb-20 overflow-x-hidden"/, `className="min-h-screen bg-[${colors.bg}] pb-20 overflow-x-hidden"`);

// 3. Filtre Wilaya actif
content = content.replace(/className="relative bg-\[\#FFFBF5\] rounded-3xl sm:rounded-3xl px-6 py-3 border border-stone-200 shadow-sm flex items-center justify-between overflow-hidden group"/, `className="relative bg-[${colors.surface}]/80 backdrop-blur-md border border-[${colors.gold}]/20 rounded-full px-6 py-2 shadow-[0_2px_12px_rgba(26,20,16,0.04)] flex items-center justify-between overflow-hidden group"`);
content = content.replace(/bg-\[\#E42313\]\/10 text-\[\#E42313\]/g, `bg-[${colors.gold}]/20 text-[${colors.gold}]`);

// 9. Selection Premium (Pour Vous)
content = content.replace(/<section className="pt-12 pb-16 bg-\[\#E42313\] rounded-3xl sm:rounded-3xl relative overflow-hidden shadow-xl border-4 border-white">/, `<section className="pt-16 pb-16 bg-gradient-to-b from-[${colors.bg}] to-[${colors.surface}] rounded-[2.5rem] relative overflow-hidden shadow-[0_20px_60px_rgba(26,20,16,0.08)] border border-[${colors.border}]/40">`);

content = content.replace(/text-4xl md:text-5xl lg:text-7xl font-kinder text-white tracking-tight mb-3 drop-shadow-sm leading-none/, `font-serif text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[${colors.textPrimary}] mb-3`);
content = content.replace(/text-white\/90 text-sm md:text-lg font-sans font-bold max-w-xl leading-snug/, `font-sans text-sm md:text-base text-[${colors.textSecondary}] uppercase tracking-[0.15em] max-w-xl leading-relaxed`);

content = content.replace(/<div className="inline-flex items-center gap-2 px-4 py-1\.5 rounded-full bg-white\/20 text-white font-kinder text-xs uppercase tracking-widest mb-4 backdrop-blur-sm shadow-sm border border-white\/20">/, `<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[${colors.gold}]/10 text-[${colors.primary}] border border-[${colors.gold}]/20 font-mono text-[9px] uppercase tracking-[0.2em] font-black mb-4">`);

// Replace the icon color
content = content.replace(/<Sparkles className="w-3\.5 h-3\.5 text-white" \/>/, `<Sparkles className="w-3.5 h-3.5 text-[${colors.primary}]" />`);

// Card Wrapper in Pour Vous
content = content.replace(/<div className="bg-white rounded-2xl p-3 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group border border-stone-100 flex flex-col h-full cursor-pointer relative overflow-hidden">/g, `<div className="bg-[${colors.surface}] rounded-2xl p-3 shadow-[0_8px_30px_rgba(26,20,16,0.06)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(26,20,16,0.10)] transition-all duration-500 ease-out group border border-[${colors.border}]/50 flex flex-col h-full cursor-pointer relative overflow-hidden">`);

// Image Wrapper
content = content.replace(/<div className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 mb-4">/g, `<div className="relative aspect-square rounded-xl overflow-hidden bg-[${colors.bg}] mb-4">`);

content = content.replace(/className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/g, `className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"`);

content = content.replace(/<div className="absolute top-2 left-2 flex flex-col gap-1 z-10">/g, `<div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">`);

content = content.replace(/<span className={`inline-flex items-center gap-1 px-2\.5 py-1\.5 rounded-xl font-sans font-bold text-\[10px\] rtl:text-\[12px\] tracking-widest rtl:tracking-normal uppercase shadow-sm backdrop-blur-md \${/g, 
  `<span className={\`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full font-mono font-black text-[9px] uppercase tracking-[0.2em] shadow-sm backdrop-blur-md \${`);
  
content = content.replace(/trustScore >= 90 \? "bg-white\/90 text-\[\#E42313\] border border-\[\#E42313\]\/20" :/g, 
  `trustScore >= 90 ? "bg-[${colors.success}] text-white border-none" :`);
  
content = content.replace(/trustScore >= 75 \? "bg-white\/90 text-\[\#FF5C00\] border border-\[\#FF5C00\]\/20" :/g, 
  `trustScore >= 75 ? "bg-[${colors.gold}] text-[${colors.textPrimary}] border-none" :`);
  
content = content.replace(/ "bg-white\/90 text-stone-600 border border-stone-200"/g, 
  ` "bg-[${colors.primary}] text-white border-none"`);

// COMMERCANT ELITE BADGE (was PRO)
content = content.replace(/<span className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-amber-200 to-yellow-400 text-yellow-900 text-\[9px\] rtl:text-\[11px\] font-black uppercase tracking-widest rtl:tracking-normal rounded-lg shadow-sm">/g, 
  `<span className="inline-flex items-center px-2 py-1 bg-[${colors.gold}]/20 text-[#8B6F3E] border border-[${colors.gold}]/30 text-[9px] font-mono font-black uppercase tracking-[0.2em] rounded-full shadow-sm">`);
content = content.replace(/>PRO</g, `>ÉLITE<`);

// Vendor name
content = content.replace(/<div className="text-xs rtl:text-sm font-sans font-bold text-stone-500 uppercase tracking-widest rtl:tracking-normal line-clamp-1 group-hover:text-\[\#E42313\] transition-colors">/g, 
  `<div className="text-[10px] font-mono uppercase tracking-[0.15em] text-[${colors.textSecondary}] line-clamp-1 group-hover:text-[${colors.primary}] transition-colors">`);

// Product name
content = content.replace(/<h3 className="font-kinder text-base sm:text-lg text-\[\#2B1D15\] leading-tight line-clamp-2 uppercase">/g, 
  `<h3 className="font-serif font-bold text-base sm:text-lg text-[${colors.textPrimary}] leading-tight line-clamp-2 group-hover:text-[${colors.primary}] transition-colors">`);

// Price
content = content.replace(/<div className="text-xl font-kinder text-\[\#E42313\]">/g, 
  `<div className="text-lg font-mono font-black text-[${colors.textPrimary}]">`);
  
// Old price
content = content.replace(/<div className="text-sm font-sans font-bold text-stone-400 line-through">/g, 
  `<div className="text-sm font-mono text-[${colors.textSecondary}] line-through">`);

// Add Separator before wishlist
content = content.replace(/<button\s*onClick=\{\(e\) => \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*toggleWishlist\(product\.id\);\s*\}\}\s*className={`absolute top-2 right-2 p-2 rounded-xl backdrop-blur-md shadow-sm transition-all duration-300 z-10 \${/g, 
  `<button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleWishlist(product.id);
                            }}
                            className={\`absolute top-2 right-2 p-2 rounded-full bg-white/90 border border-[${colors.border}] hover:border-[${colors.primary}] hover:bg-[${colors.primary}]/5 backdrop-blur-md shadow-[0_2px_12px_rgba(26,20,16,0.04)] transition-all duration-300 z-10 \${`);

content = content.replace(/wishlist\.includes\(product\.id\)\s*\?\s*"bg-white\/90 text-\[\#E42313\] border border-\[\#E42313\]\/20"\s*:\s*"bg-white\/80 text-stone-400 hover:text-\[\#E42313\] hover:bg-white border border-transparent"/g, 
  `wishlist.includes(product.id) ? "text-[${colors.primary}]" : "text-[${colors.textSecondary}] hover:text-[${colors.primary}]"`);

// 7. Intermediate Banners
content = content.replace(/<div className="rounded-3xl sm:rounded-3xl overflow-hidden shadow-sm relative group cursor-pointer border border-\[\#E42313\]\/20">/g, 
  `<div className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(26,20,16,0.10)] relative group cursor-pointer hover:shadow-[0_24px_64px_rgba(26,20,16,0.14)] hover:scale-[1.02] transition-all duration-500 border border-[${colors.border}]/50">`);

content = content.replace(/<div className="absolute inset-0 bg-gradient-to-t from-black\/80 via-black\/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" \/>/g, 
  `<div className="absolute inset-0 bg-gradient-to-t from-[${colors.overlay}]/60 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />`);

// Update "Tout Découvrir" buttons
content = content.replace(/<button\s*onClick=\{([^}]+)\}\s*className="px-8 py-3 bg-white text-\[\#2B1D15\] rounded-full font-sans font-bold text-xs sm:text-sm uppercase tracking-widest rtl:tracking-normal hover:bg-\[\#E42313\] hover:text-white transition-all shadow-md"/g, 
  `<button onClick={$1} className="px-8 py-3 bg-[${colors.textPrimary}] text-white rounded-full font-mono text-[9px] font-black uppercase tracking-[0.2em] hover:bg-[${colors.primary}] transition-all duration-300 shadow-[0_8px_30px_rgba(26,20,16,0.08)]">`);

content = content.replace(/<button\s*onClick=\{([^}]+)\}\s*className="flex items-center gap-3 text-sm sm:text-base font-kinder text-\[\#2B1D15\] cursor-pointer px-8 py-4 bg-white rounded-full hover:bg-\[\#E42313\] hover:text-white active:scale-95 transition-all shadow-md uppercase tracking-widest"/g, 
  `<button onClick={$1} className="flex items-center justify-center gap-3 w-full sm:w-auto font-mono text-[9px] font-black text-white cursor-pointer px-8 py-4 bg-[${colors.textPrimary}] rounded-full hover:bg-[${colors.primary}] active:scale-95 transition-all duration-300 shadow-[0_8px_30px_rgba(26,20,16,0.08)] uppercase tracking-[0.2em]">`);


// Remove the specific wrapper of FlashSales & Featured to let them take full width / proper background
// We change: <div className="bg-white rounded-3xl shadow-sm border border-[#E42313]/60 p-4 sm:p-8 overflow-hidden">
content = content.replace(/<div className="bg-white rounded-3xl shadow-sm border border-\[\#E42313\]\/60 p-4 sm:p-8 overflow-hidden">/g, 
  `<div className="bg-transparent p-0 overflow-hidden">`);

// Replace general old colors with new palette for remaining text
content = content.replace(/bg-\[\#E42313\]/g, `bg-[${colors.primary}]`);
content = content.replace(/text-\[\#E42313\]/g, `text-[${colors.primary}]`);
content = content.replace(/border-\[\#E42313\]/g, `border-[${colors.primary}]`);

content = content.replace(/bg-\[\#2B1D15\]/g, `bg-[${colors.textPrimary}]`);
content = content.replace(/text-\[\#2B1D15\]/g, `text-[${colors.textPrimary}]`);

content = content.replace(/text-stone-900/g, `text-[${colors.textPrimary}]`);
content = content.replace(/text-stone-500/g, `text-[${colors.textSecondary}]`);

fs.writeFileSync('src/pages/Public/Home.tsx', content, 'utf8');
