const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

function refineKinderAesthetic() {
  const rootDir = path.join(__dirname, 'src');
  walkDir(rootDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Dark brown/black backgrounds -> White or Kinder Red based on context
    // If it's a footer or something we can use a soft color
    if (content.match(/bg-\[\#3C2B22\]/g)) {
      content = content.replace(/bg-\[\#3C2B22\]/g, 'bg-white');
      changed = true;
    }
    
    // Some text might have been FDF9EC on top of 3C2B22. Since background is now white, this text must become dark.
    if (content.match(/text-\[\#FAF8F5\]/g)) {
       content = content.replace(/text-\[\#FAF8F5\]/g, 'text-zinc-600');
       changed = true;
    }
    if (content.match(/text-\[\#FDF9EC\]/g)) {
       content = content.replace(/text-\[\#FDF9EC\]/g, 'text-zinc-800');
       changed = true;
    }

    // Text colors
    if (content.match(/text-\[\#3C2B22\]/g)) {
      content = content.replace(/text-\[\#3C2B22\]/g, 'text-[#E42313]');
      changed = true;
    }

    // Orange/Red to Kinder Red
    if (content.match(/bg-\[\#FF5C00\]/g)) {
      content = content.replace(/bg-\[\#FF5C00\]/g, 'bg-[#E42313]');
      changed = true;
    }
    if (content.match(/text-\[\#FF5C00\]/g)) {
      content = content.replace(/text-\[\#FF5C00\]/g, 'text-[#00AEEF]');
      changed = true;
    }
    if (content.match(/border-\[\#FF5C00\]/g)) {
      content = content.replace(/border-\[\#FF5C00\]/g, 'border-[#E42313]');
      changed = true;
    }
    
    // Remove milky bg color if it's too dominant
    if (content.match(/bg-\[\#FDF9EC\]/g)) {
      content = content.replace(/bg-\[\#FDF9EC\]/g, 'bg-white');
      changed = true;
    }

    // Also remove the `rounded-[3rem]` and other exaggerated shapes, use standard large rounding
    if (content.match(/rounded-\[3rem\]/g)) {
      content = content.replace(/rounded-\[3rem\]/g, 'rounded-3xl');
      changed = true;
    }
    if (content.match(/rounded-\[4rem\]/g)) {
      content = content.replace(/rounded-\[4rem\]/g, 'rounded-3xl');
      changed = true;
    }

    // Fix the new white text on white bg issue (if button was 3C2B22 and text was white)
    // We changed bg-[#3C2B22] to bg-white. So text-white inside it needs to be text-[#E42313] or similar.
    // Since we can't reliably do this with regex, we should instead NOT change all bg-[#3C2B22] to bg-white.
    // Let's rethink.

    fs.writeFileSync(filePath, content, 'utf8');
  });
}

// I won't run this dangerous replace all yet. I will manually fix Home.tsx and related ones.
