const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/routes/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('import { Request, Response }') && !content.includes("import { Request")) {
     content = "import { Request, Response } from 'express';\n" + content;
  }
  
  // Custom interface
  if (!content.includes('interface AuthenticatedRequest')) {
     content = content.replace("import { Request, Response } from 'express';", "import { Request, Response } from 'express';\nexport interface AuthenticatedRequest extends Request { user?: any; file?: any; files?: any; }\n");
  }

  content = content.replace(/\(req: any, res: any\)/g, "(req: AuthenticatedRequest, res: Response)");
  content = content.replace(/\(req: any, res: any, next: any\)/g, "(req: AuthenticatedRequest, res: Response, next: any)");

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}
