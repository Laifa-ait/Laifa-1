import fs from 'fs';

let bento = fs.readFileSync('src/components/Home/BentoHero.tsx', 'utf8');

bento = bento.replace(
  /<div className="w-full min-h-\[450px\] sm:min-h-\[500px\] relative rounded-\[2rem\] overflow-hidden group shadow-\[0_16px_48px_rgba\(26,20,16,0\.10\)\] border border-\[\#E5DED4\]\/30 mt-0" \/>/g,
  `<div className="w-full min-h-[450px] sm:min-h-[500px] bg-[#F5F0E8]/50 animate-pulse rounded-[2rem] border border-[#E5DED4]/50 mt-0" />`
);
fs.writeFileSync('src/components/Home/BentoHero.tsx', bento, 'utf8');

// Also update Sélection Premium placeholder text to be visible
let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');
home = home.replace(
  /<div className="w-full flex flex-col items-center justify-center py-10 text-center bg-white\/10 rounded-\[2rem\] border border-white\/20 backdrop-blur-sm">/g,
  `<div className="w-full flex flex-col items-center justify-center py-12 text-center bg-[#F5F0E8] rounded-[2rem] border border-[#E5DED4]/50 shadow-inner">`
);
home = home.replace(
  /<Sparkles className="w-8 h-8 text-white mb-2 opacity-80" \/>/g,
  `<Sparkles className="w-8 h-8 text-[#D4A574] mb-3" />`
);
home = home.replace(
  /<p className="font-sans font-bold text-white uppercase tracking-wider">\{t\("Prochain arrivage imminent"\)\}<\/p>/g,
  `<p className="font-mono font-black text-[#8B7355] text-xs uppercase tracking-[0.2em]">{t("Prochain arrivage imminent")}</p>`
);

fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');

