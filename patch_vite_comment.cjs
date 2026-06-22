const fs = require('fs'); let code = fs.readFileSync('vite.config.ts', 'utf8'); code = code.replace(/\/\/\sHMR.*?\n/g, '').replace(/\/\/\sDo not.*?\n/g, ''); fs.writeFileSync('vite.config.ts', code);
