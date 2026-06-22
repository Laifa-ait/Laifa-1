const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(/hmr: false,/g, '');
content = content.replace(/watch: null,/g, '');
fs.writeFileSync('vite.config.ts', content);
