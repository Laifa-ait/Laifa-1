import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

home = home.replace(
  /<div className="bg-\[\#FFFBF5\] font-sans">/g,
  `<div className="bg-[#F5F0E8] font-sans">`
);

// Endeless grid container
home = home.replace(
  /<div className="w-full max-w-\[90rem\] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-\[\#FFFBF5\]">/g,
  `<div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-[#F5F0E8]">`
);

fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');

// Update HomeEndlessGrid.tsx too
let grid = fs.readFileSync('src/components/Home/HomeEndlessGrid.tsx', 'utf8');
grid = grid.replace(
  /className="w-full max-w-\[90rem\] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-\[\#FFFBF5\]"/g,
  `className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 pb-16 pt-16 bg-[#F5F0E8]"`
);
fs.writeFileSync('src/components/Home/HomeEndlessGrid.tsx', grid, 'utf8');

