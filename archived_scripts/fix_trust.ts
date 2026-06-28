import fs from 'fs';

let trust = fs.readFileSync('src/components/Home/TechTrustBanner.tsx', 'utf8');

trust = trust.replace(
  /className="w-full py-4 border-y border-\[\#FF5C00\]\/60 bg-white\/40 backdrop-blur-md mb-8"/g,
  `className="w-full py-4 border-y border-[#E5DED4] bg-[#FFFBF5] mb-8"`
);

trust = trust.replace(/text-\[\#3C2B22\]/g, `text-[#8B7355]`);

fs.writeFileSync('src/components/Home/TechTrustBanner.tsx', trust, 'utf8');
