import fs from 'fs';

let c = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
c = c.replace(/#3C2B22/g, '#E42313'); // Kinder red text/bg
c = c.replace(/#FF5C00/g, '#00AEEF'); // Kinder blue text/bg
fs.writeFileSync('src/components/Navbar.tsx', c);

let f = fs.readFileSync('src/components/Footer.tsx', 'utf8');
f = f.replace(/#3C2B22/g, '#E42313'); 
f = f.replace(/#FF5C00/g, '#00AEEF'); 
fs.writeFileSync('src/components/Footer.tsx', f);

let h = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');
// remove the weird milk wave
h = h.replace(/<div className="w-full text-\[\#FDF9EC\] bg-white -mt-8 relative z-10 h-12" \/>/g, '');
// remove exaggerated roundings
h = h.replace(/rounded-\[3rem\]/g, 'rounded-3xl');
h = h.replace(/rounded-\[4rem\]/g, 'rounded-3xl');
// remove brown
h = h.replace(/#3C2B22/g, '#2B1D15'); // text/elements become dark chocolate
// remove extreme orange
h = h.replace(/#FF5C00/g, '#E42313'); // becomes Kinder Red
// remove weird milk body backgrounds 
h = h.replace(/bg-\[\#FDF9EC\]/g, 'bg-white');
fs.writeFileSync('src/pages/Public/Home.tsx', h);

let fsales = fs.readFileSync('src/components/Home/FlashSales.tsx', 'utf8');
fsales = fsales.replace(/#3C2B22/g, '#2B1D15');
fsales = fsales.replace(/#FF5C00/g, '#E42313');
fsales = fsales.replace(/bg-\[\#FDF9EC\]/g, 'bg-white');
fs.writeFileSync('src/components/Home/FlashSales.tsx', fsales);

let fpc = fs.readFileSync('src/components/Home/FeaturedProductsCarousel.tsx', 'utf8');
fpc = fpc.replace(/#3C2B22/g, '#2B1D15');
fpc = fpc.replace(/#FF5C00/g, '#E42313');
fs.writeFileSync('src/components/Home/FeaturedProductsCarousel.tsx', fpc);
