const fs = require('fs');
const glob = require('glob');

const files = glob.sync('{src/**/*.ts,src/**/*.tsx,server.ts}');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('console.log(')) {
    // Only replace single-line console.logs that end with a semicolon or newline. Actually, easier to use a regex or just replace 'console.log' with 'if(process.env.NODE_ENV === "development") console.log'.
    // Let's replace "console.log(" with "if (process.env.NODE_ENV === 'development') console.log("
    // Actually no, that might break things if it's in an arrow function like `() => console.log(..)`
    // Let's replace console.log with a no-op function call. But it's better to regex replace:
    // This regex looks for console.log and replaces it with void 0;
    
    // Better: replace 'console.log' with '__console_log' and then declare `const __console_log = (...args: any[]) => {};` at the top? No, let's just replace `console.log` with `(() => {})`. This works as `(() => {})("msg")` evaluates to undefined.
    // Replace: /\bconsole\.log\b/g -> '(void 0) /* console.log removed */' ? No.
    // `console.log("hi")` -> `(void 0) /* console.log removed */("hi")` would throw `(void 0) is not a function`.
    
    // We can replace `console.log` with `void` which turns `console.log(a, b)` into `void(a, b)` which is valid JS!
    content = content.replace(/\bconsole\.log\b/g, "(process.env.NODE_ENV === 'debug' ? console.log : function(){})");
    fs.writeFileSync(file, content);
    console.log('Patcher: ', file);
  }
}
