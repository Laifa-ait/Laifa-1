import fs from 'fs';
import path from 'path';

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix imports of firebase-admin and middlewares
      content = content.replace(/\"\.\.\/\.\.\/server\//g, '"../');
      
      // Fix imports of config/gemini and utils/velocity
      content = content.replace(/\"\.\.\/config\/gemini\"/g, '"../config/gemini"');
      content = content.replace(/\"\.\.\/utils\/velocity\"/g, '"../utils/velocity"');

      // Fix imports of src dependencies
      content = content.replace(/\"\.\.\/types\"/g, '"../../src/types"');
      content = content.replace(/\"\.\.\/constants\"/g, '"../../src/constants"');
      content = content.replace(/\"\.\.\/utils\//g, '"../../src/utils/');
      
      // Fix imports in workers (which are in server/workers, so they need to go up one more level for src)
      if (dir.includes('workers')) {
        content = content.replace(/\"\.\.\/config\/gemini\"/g, '"../config/gemini"');
        content = content.replace(/\"\.\.\/server\//g, '"../');
        content = content.replace(/\"\.\.\/\.\.\/server\//g, '"../');
      }

      fs.writeFileSync(fullPath, content);
    }
  }
}

fixImports('./server/routes');
fixImports('./server/workers');
fixImports('./server/utils');
