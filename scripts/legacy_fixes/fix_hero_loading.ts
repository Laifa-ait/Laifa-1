import fs from 'fs';

let home = fs.readFileSync('src/pages/Public/Home.tsx', 'utf8');

home = home.replace(
  /<BentoHero banners=\{targetedHeroBanners\} \/>/g,
  `{isBannersLoading ? (
            <div className="w-full min-h-[400px] sm:min-h-[500px] bg-[#E5DED4]/30 animate-pulse rounded-[2rem] border border-[#E5DED4]/50 mt-0" />
          ) : targetedHeroBanners.length > 0 ? (
            <BentoHero banners={targetedHeroBanners} />
          ) : null}`
);

fs.writeFileSync('src/pages/Public/Home.tsx', home, 'utf8');
