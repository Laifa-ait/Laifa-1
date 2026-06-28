import fs from 'fs';

let bento = fs.readFileSync('src/components/Home/BentoHero.tsx', 'utf8');

bento = bento.replace(
  /if \(\!heroBanner\) \{\s*return <div className=".*?" \/>;\s*\}/g,
  `if (!heroBanner) return null;`
);

fs.writeFileSync('src/components/Home/BentoHero.tsx', bento, 'utf8');
