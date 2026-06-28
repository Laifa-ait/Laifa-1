import fs from 'fs';
import path from 'path';

function replaceFontInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/font-kinder/g, 'font-sans font-bold');
  fs.writeFileSync(filePath, content, 'utf8');
}

const files = [
  'src/components/Home/FlashSales.tsx',
  'src/components/Home/ShippingCalculator.tsx',
  'src/components/Home/FeaturedProductsCarousel.tsx',
  'src/components/Home/BoutiquesMarques.tsx',
  'src/components/Home/DynamicSection.tsx',
  'src/pages/Public/Home.tsx',
  'src/components/Navbar.tsx',
  'src/components/Footer.tsx',
];

files.forEach(replaceFontInFile);
