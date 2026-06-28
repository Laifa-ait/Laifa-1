import fs from 'fs';

let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

navbar = navbar.replace(/bg-\[\#E42313\]/g, 'bg-[#1A1410]');
navbar = navbar.replace(/text-\[\#E42313\]/g, 'text-[#C75C1A]');
navbar = navbar.replace(/fill-\[\#E42313\]/g, 'fill-[#C75C1A]');
navbar = navbar.replace(/border-\[\#E42313\]/g, 'border-[#C75C1A]');
navbar = navbar.replace(/bg-\[\#00AEEF\]/g, 'bg-[#C75C1A]');
navbar = navbar.replace(/border-\[\#00AEEF\]/g, 'border-white/10');

fs.writeFileSync('src/components/Navbar.tsx', navbar, 'utf8');

let flash = fs.readFileSync('src/components/Home/FlashSales.tsx', 'utf8');
flash = flash.replace(/bg-\[\#E42313\]/g, 'bg-[#C75C1A]');
flash = flash.replace(/hover:bg-\[\#E33B1E\]/g, 'hover:bg-[#C75C1A]/90');
flash = flash.replace(/text-\[\#E42313\]/g, 'text-[#C75C1A]');
flash = flash.replace(/fill-\[\#E42313\]/g, 'fill-[#C75C1A]');
fs.writeFileSync('src/components/Home/FlashSales.tsx', flash, 'utf8');

