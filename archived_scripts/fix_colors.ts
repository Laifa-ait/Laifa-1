import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

// Sélection Premium cards
home = home.replace(
  /className="w-\[240px\] sm:w-\[260px\] shrink-0 snap-start snap-always h-\[360px\] rounded-\[2rem\] bg-white overflow-hidden shadow-\[0_8px_30px_rgba\(0,0,0,0\.12\)\] hover:shadow-\[0_15px_40px_rgba\(0,0,0,0\.2\)\] group transition-all duration-300 relative flex flex-col cursor-pointer hover:-translate-y-2"/g,
  `className="w-[240px] sm:w-[260px] shrink-0 snap-start snap-always h-[360px] rounded-[2rem] bg-[#FFFBF5] overflow-hidden shadow-[0_16px_48px_rgba(26,20,16,0.08)] border border-[#E5DED4]/50 group transition-all duration-300 relative flex flex-col cursor-pointer hover:-translate-y-2"`
);
home = home.replace(
  /className="relative h-\[180px\] bg-\[\#F5F5F5\] overflow-hidden shrink-0 rounded-t-\[2rem\]"/g,
  `className="relative h-[180px] bg-[#F5F0E8] overflow-hidden shrink-0 rounded-t-[2rem]"`
);
home = home.replace(
  /className="flex-1 p-5 flex flex-col justify-between bg-white rounded-b-\[2rem\]"/g,
  `className="flex-1 p-5 flex flex-col justify-between bg-[#FFFBF5] rounded-b-[2rem]"`
);

// Pour Vous nav buttons
home = home.replace(
  /className="absolute -left-3 sm:-left-5 top-1\/2 -translate-y-1\/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-\[\#2C2118\] border-2 border-white flex items-center justify-center hover:bg-\[\#C75C1A\] hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"/g,
  `className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFFBF5] text-[#2C2118] border border-[#E5DED4] flex items-center justify-center hover:bg-[#C75C1A] hover:text-white hover:border-[#C75C1A] hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-[0_8px_20px_rgba(26,20,16,0.1)] cursor-pointer"`
);
home = home.replace(
  /className="absolute -right-3 sm:-right-5 top-1\/2 -translate-y-1\/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-\[\#2C2118\] border-2 border-white flex items-center justify-center hover:bg-\[\#C75C1A\] hover:text-white hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-md hover:shadow-lg cursor-pointer"/g,
  `className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#FFFBF5] text-[#2C2118] border border-[#E5DED4] flex items-center justify-center hover:bg-[#C75C1A] hover:text-white hover:border-[#C75C1A] hover:scale-110 active:scale-95 transition-all duration-300 md:flex hidden shadow-[0_8px_20px_rgba(26,20,16,0.1)] cursor-pointer"`
);

// Pour Vous ProductCard wrapper
home = home.replace(
  /sectionStyle="bg-white rounded-\[2rem\] shadow-\[0_8px_20px_rgba\(0,0,0,0\.06\)\] border-none hover:-translate-y-2 transition-all duration-300"/g,
  `sectionStyle="bg-[#FFFBF5] rounded-[2rem] shadow-[0_8px_30px_rgba(26,20,16,0.06)] border border-[#E5DED4]/40 hover:-translate-y-2 transition-all duration-300"`
);

// Social Proof
home = home.replace(
  /<section className="py-8 sm:py-16 bg-white relative mt-16 rounded-3xl mx-4 sm:mx-8 shadow-sm border border-\[\#C75C1A\]\/60">/g,
  `<section className="py-12 sm:py-20 bg-[#FFFBF5] relative mt-16 rounded-[2.5rem] mx-4 sm:mx-8 shadow-[0_20px_60px_rgba(26,20,16,0.05)] border border-[#E5DED4]/60">`
);
home = home.replace(
  /<div className="flex items-center gap-2 p-4 rounded-full bg-white border-4 border-white shadow-\[0_8px_20px_rgba\(255,92,0,0\.08\)\] transform -rotate-2">/g,
  `<div className="flex items-center gap-2 p-4 rounded-full bg-[#F5F0E8] border border-[#E5DED4] shadow-inner transform -rotate-2">`
);
home = home.replace(
  /<div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-sm border border-white mt-4">/g,
  `<div className="flex items-center gap-4 bg-[#F5F0E8] px-6 py-3 rounded-full shadow-inner border border-[#E5DED4] mt-4">`
);
home = home.replace(
  /text-\[\#E42313\]/g,
  `text-[#C75C1A]`
);

fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');
