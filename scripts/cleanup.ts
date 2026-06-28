import fs from "fs";
import path from "path";

const dir = "scripts/legacy_fixes";
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const files = fs.readdirSync(".");
files.forEach(file => {
  if (file.startsWith("fix_") || file.startsWith("replace")) {
    fs.renameSync(file, path.join(dir, file));
    console.log(`Moved ${file} to ${dir}`);
  }
});
