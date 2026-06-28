import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');
home = home.replace(/background: "\#E42313"/g, 'background: "#1A1410"'); // Toast background dark
home = home.replace(/fill-\[\#E42313\]/g, 'fill-[#C75C1A]'); // Stars / Heart
home = home.replace(/stroke-\[\#E42313\]/g, 'stroke-[#C75C1A]'); // Heart
fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');

let flash = fs.readFileSync('src/components/Home/FlashSales.tsx', 'utf8');
flash = flash.replace(/border-\[\#E42313\]/g, 'border-[#C75C1A]');
flash = flash.replace(/to-\[\#E42313\]/g, 'to-[#C75C1A]');
flash = flash.replace(/from-red-600/g, 'from-[#D98A50]');
fs.writeFileSync('src/components/Home/FlashSales.tsx', flash, 'utf8');
