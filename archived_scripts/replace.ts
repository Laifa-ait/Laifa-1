import fs from 'fs';
const filePaths = [
  'src/components/Product/Details/ProductInfo.tsx',
  'src/components/Product/Details/ProductBuyBox.tsx',
  'src/components/Product/Details/ProductGallery.tsx',
  'src/components/Product/ProductCard.tsx',
  'src/components/Navigation/TopNavbar.tsx',
  'src/components/Footer.tsx',
];

filePaths.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/#F37021/gi, '#FF5C00');
    content = content.replace(/#E33B1E/gi, '#FF5C00');
    content = content.replace(/#121315/gi, '#3C2B22');
    content = content.replace(/font-black/gi, 'font-kinder');
    fs.writeFileSync(filePath, content);
  }
});
