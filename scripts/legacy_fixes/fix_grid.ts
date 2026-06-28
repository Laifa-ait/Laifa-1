import fs from 'fs';

let grid = fs.readFileSync('src/components/Home/NeoCategoryGrid.tsx', 'utf8');

grid = grid.replace(/border-4 border-white/g, 'border border-[#E5DED4]/30');
grid = grid.replace(/from-\[\#FDF9EC\] via-\[\#FDF9EC\]\/30/g, 'from-[#1A1410]/80 via-[#1A1410]/20');
grid = grid.replace(/bg-\[\#C75C1A\]/g, 'bg-[#D4A574]/20');
grid = grid.replace(/text-white shadow-md/g, 'text-[#D4A574] border border-[#D4A574]/30 backdrop-blur-sm');

// Fix typography colors since we made background dark
grid = grid.replace(/text-\[\#2C2118\]/g, 'text-white');
grid = grid.replace(/text-\[\#C75C1A\]/g, 'text-[#F5F0E8]');
grid = grid.replace(/font-kinder/g, 'font-serif');

// Container spacing
grid = grid.replace(/shadow-md border border-\[\#E5DED4\]\/30/g, 'shadow-[0_16px_48px_rgba(26,20,16,0.10)] border border-[#E5DED4]/30');

fs.writeFileSync('src/components/Home/NeoCategoryGrid.tsx', grid, 'utf8');
