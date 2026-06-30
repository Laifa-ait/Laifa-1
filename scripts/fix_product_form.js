import fs from 'fs';

const filePath = 'src/pages/Seller/ProductFormModal.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const replacements = [
    [/bg-blue-900/g, 'bg-[#C75C1A]'],
    [/bg-blue-800/g, 'bg-[#A64D16]'],
    [/text-blue-900/g, 'text-[#C75C1A]'],
    [/text-blue-800/g, 'text-[#A64D16]'],
    [/border-blue-900/g, 'border-[#C75C1A]'],
    [/text-blue-600/g, 'text-[#C75C1A]'],
    [/bg-blue-100/g, 'bg-[#C75C1A]/10'],
    [/text-blue-500/g, 'text-[#C75C1A]'],
    [/bg-blue-50/g, 'bg-[#C75C1A]/5'],
    [/border-blue-200/g, 'border-[#C75C1A]/20'],
    [/focus:border-blue-500/g, 'focus:border-[#C75C1A]'],
    [/focus:ring-blue-500/g, 'focus:ring-[#C75C1A]/20'],
    [/border-slate-200/g, 'border-[#E5DED4]'],
    [/bg-slate-200/g, 'bg-[#E5DED4]'],
    [/bg-slate-50/g, 'bg-[#FFFBF5]'],
    [/bg-white w-full h-full md:max-w-6xl/g, 'bg-[#FFFBF5] w-full h-full md:max-w-6xl'],
];

for (const [oldVal, newVal] of replacements) {
    content = content.replace(oldVal, newVal);
}

// Custom step title replace
const stepRegex = /<span className=\{`text-\[10px\] uppercase font-bold tracking-widest rtl:tracking-normal \$\{isActive \? "text-\[#C75C1A\]" : "text-slate-500"\}\`\}>\{t\("Étape"\)\}\{idx \+ 1\}<\/span>\s*<span className=\{`text-xs md:text-sm font-semibold hidden md:block \$\{isActive \? "text-slate-900" : "text-slate-600"\}\`\}>\{step\.title\}<\/span>/;
content = content.replace(stepRegex, '<span className={`text-xs md:text-sm font-semibold ${isActive ? "text-[#C75C1A]" : "text-slate-600"}`}>{step.title}</span>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixes applied to ProductFormModal.tsx');
