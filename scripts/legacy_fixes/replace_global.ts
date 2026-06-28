import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(walkDir(file));
        } else { 
            /* Is a file */
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const allFiles = walkDir('./src');

allFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Check if we need to make changes before rewriting
    if (content.match(/#F37021/gi)) { content = content.replace(/#F37021/gi, '#FF5C00'); changed = true; }
    if (content.match(/#121315/gi)) { content = content.replace(/#121315/gi, '#3C2B22'); changed = true; }
    if (content.match(/bg-\[\#faf8f5\]/gi)) { content = content.replace(/bg-\[\#faf8f5\]/gi, 'bg-[#FDF9EC]'); changed = true; }
    if (content.match(/bg-\[\#FAF8F5\]/g)) { content = content.replace(/bg-\[\#FAF8F5\]/g, 'bg-[#FDF9EC]'); changed = true; }
    if (content.match(/border-\[\#EBE5DF\]/g)) { content = content.replace(/border-\[\#EBE5DF\]/g, 'border-[#FF5C00]'); changed = true; }
    
    // We already handled "font-black" to "font-kinder" on a few files, let's keep it carefully. Let's do it globally for UI consistency.
    if (content.match(/className="([^"]*)font-black([^"]*)"/gi)) {
      content = content.replace(/className="([^"]*)font-black([^"]*)"/gi, 'className="$1font-kinder$2"');
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
    }
  }
});
