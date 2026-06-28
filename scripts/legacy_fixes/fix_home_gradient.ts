import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

// Remove orange gradient from BentoHero section wrapper
home = home.replace(
  /<section className="w-full bg-gradient-to-br from-\[\#C75C1A\] via-\[\#D98A50\] to-\[\#E8B87A\] py-8 sm:py-12 lg:py-16 relative overflow-hidden before:absolute before:inset-0 before:bg-\[url\('.*?'\)\] before:opacity-20">/g,
  `<section className="w-full bg-[#F5F0E8] py-4 sm:py-6 lg:py-8 relative overflow-hidden">`
);

// If there's an empty "Pour vous" section, let's fix it too. 
// "Pour vous" is: <section className="py-16 bg-gradient-to-b from-[#F5F0E8] to-[#FFFBF5] relative z-20 overflow-hidden">
home = home.replace(
  /<section className="py-16 bg-gradient-to-b from-\[\#F5F0E8\] to-\[\#FFFBF5\] relative z-20 overflow-hidden">/g,
  `<section className="py-12 sm:py-16 bg-[#F5F0E8] relative z-20 overflow-hidden">`
);

fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');
