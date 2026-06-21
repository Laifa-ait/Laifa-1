import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";

// Existing legacy files are tolerated to allow current project compilation, but all new files are strictly validated!
const LEGACY_NON_COMPLIANT_LOCALIZATION_FILES = new Set([
]);

const EXCLUDED_FILES = [
  'src/routes/core.ts',
  'src/routes/admin.ts',
  'src/routes/ai.ts',
  'src/routes/auth.ts',
  'src/routes/orders.ts',
  'src/routes/workspace.ts'
];

const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'src/tests',
  'scripts'
];

function shouldScanFile(filePath: string): boolean {
  const normPath = filePath.replace(/\\/g, '/');
  const relativePath = normPath.replace(path.resolve('.').replace(/\\/g, '/') + '/', '');
  
  if (LEGACY_NON_COMPLIANT_LOCALIZATION_FILES.has(relativePath)) {
    return false;
  }

  if (EXCLUDED_FILES.some(ex => normPath.endsWith(ex))) {
    return false;
  }
  
  if (EXCLUDED_DIRS.some(dir => normPath.includes('/' + dir + '/') || normPath.startsWith(dir + '/'))) {
    return false;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  return ['.tsx', '.jsx'].includes(ext);
}

function runAudit() {
  console.log('🛡️ OLMART SECURE SHIELD - Running zero-hardcoding localization check for files...');
  
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });
  
  const sourceFiles = project.getSourceFiles("src/**/*.tsx");
  const violations: { file: string; lineNum: number; text: string }[] = [];
  
  sourceFiles.forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    if (shouldScanFile(filePath)) {
      const descendants = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
      descendants.forEach(node => {
        const text = node.getText().trim();
        // Skip if text does not contain alphabetical characters from EN, FR or AR alphabets
        if (text.length > 0 && /[a-zA-ZÀ-ÿ\u0600-\u06FF]/.test(text)) {
          // Reject any un-translated raw text literals in JSX elements
          violations.push({
            file: filePath.replace(path.resolve('.').replace(/\\/g, '/') + '/', ''),
            lineNum: node.getStartLineNumber(),
            text: text
          });
        }
      });
    }
  });

  if (violations.length > 0) {
    console.error('\n🛑 LOCALIZATION REGRESSION DETECTED!');
    console.error('La règle d\'ingénierie absolue OLMART (Localisation Constante / Zéro Hardcoding) a été violée.');
    console.error('Il est interdit d\'insérer des chaînes textuelles directement dans les balises JSX sans passer par la fonction de traduction t("...").\n');
    
    violations.forEach(v => {
      console.error(`📍 Fichier: ${v.file}:${v.lineNum}`);
      console.error(`   Texte brut détecté: "${v.text}"`);
      console.error(`   👉 Correction requise: Remplacez par  {t("${v.text}")}  et importez useTranslation().`);
      console.error('----------------------------------------------------');
    });
    
    console.error('\n🚫 Le build est bloqué pour protéger l\'intégrité multilingue de la plateforme.');
    process.exit(1);
  } else {
    console.log('✅ OLMART SECURE SHIELD - Zéro texte durci détecté dans les nouveaux fichiers JSX.');
    process.exit(0);
  }
}

runAudit();
