const fs = require('fs');
const path = require('path');

const FORBIDDEN_PATTERNS = [
  { name: 'WhatsApp Link', regex: /wa\.me/i },
  { name: 'WhatsApp Word', regex: /whatsapp/i },
  { name: 'Instagram', regex: /instagram/i },
  { name: 'Facebook Word', regex: /facebook/i },
  { name: 'FB Brand Word', regex: /\bfb\b/i },
  { name: 'Telephone protocol', regex: /tel:/i }
];

const EXCLUDED_FILES = [
  'src/routes/core.ts',
  'src/routes/admin.ts',
  'src/routes/ai.ts',
  'src/routes/auth.ts',
  'src/routes/orders.ts',
  'src/routes/workspace.ts',
  'src/utils/masking.ts'
];

const EXCLUDED_DIRS = [
  'src/routes',
  'src/tests',
  'node_modules',
  'dist'
];

function shouldScanFile(filePath) {
  const normPath = filePath.replace(/\\/g, '/');
  
  // Check exact exclusions
  if (EXCLUDED_FILES.some(ex => normPath.endsWith(ex))) {
    return false;
  }
  
  // Check dir exclusions
  if (EXCLUDED_DIRS.some(dir => normPath.includes('/' + dir + '/') || normPath.startsWith(dir + '/'))) {
    return false;
  }
  
  // Only check code/markup files
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.html', '.css'].includes(ext);
}

function scanDir(dir, violations) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, violations);
    } else if (stat.isFile() && shouldScanFile(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(line)) {
            // Ignore potential comments or imports that might be false positives if necessary,
            // but we want a hard block on everything, including comments, to keep it extremely strict.
            violations.push({
              file: fullPath,
              lineNum: index + 1,
              pattern: pattern.name,
              matchedText: line.trim()
            });
          }
        }
      });
    }
  }
}

function runAudit() {
  console.log('🛡️ OLMART SECURE SHIELD - Running pre-build files verification...');
  const violations = [];
  const srcPath = path.resolve('src');
  
  if (fs.existsSync(srcPath)) {
    scanDir(srcPath, violations);
  }
  
  if (violations.length > 0) {
    console.error('\n🛑 SECURITY VIOLATION DETECTED!');
    console.error('La règle d\'ingénierie absolue OLMART (Zéro Canal Externe / Kill-Switch Social) a été violée.');
    console.error('Certains fichiers contiennent des traces de réseaux sociaux interdits ou liens directs de contact.\n');
    
    violations.forEach(v => {
      console.error(`📍 Fichier: ${v.file}:${v.lineNum}`);
      console.error(`   Règle enfreinte: [${v.pattern}]`);
      console.error(`   Ligne: "${v.matchedText}"`);
      console.error('----------------------------------------------------');
    });
    
    console.error('\n🚫 Le build est bloqué pour protéger l\'intégrité de la plateforme.');
    process.exit(1);
  } else {
    console.log('✅ OLMART SECURE SHIELD - Aucune violation de canal externe détectée.');
    process.exit(0);
  }
}

runAudit();
