import os
import re

file_path = "src/pages/Seller/ProductFormModal.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace colors
replacements = [
    (r"bg-blue-900", r"bg-[#C75C1A]"),
    (r"bg-blue-800", r"bg-[#A64D16]"),
    (r"text-blue-900", r"text-[#C75C1A]"),
    (r"text-blue-800", r"text-[#A64D16]"),
    (r"border-blue-900", r"border-[#C75C1A]"),
    (r"text-blue-600", r"text-[#C75C1A]"),
    (r"bg-blue-100", r"bg-[#C75C1A]/10"),
    (r"text-blue-500", r"text-[#C75C1A]"),
    (r"bg-blue-50", r"bg-[#C75C1A]/5"),
    (r"border-blue-200", r"border-[#C75C1A]/20"),
    (r"focus:border-blue-500", r"focus:border-[#C75C1A]"),
    (r"focus:ring-blue-500", r"focus:ring-[#C75C1A]/20"),
    
    # Inactive steps / inputs
    (r"border-slate-200", r"border-[#E5DED4]"),
    (r"bg-slate-200", r"bg-[#E5DED4]"),
    (r"bg-slate-50", r"bg-[#FFFBF5]"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

# Specific fixes for step titles
# Replace "Étape" {idx + 1} with just the title
content = content.replace('{t("Étape")}{idx + 1}', '{step.title}')
content = content.replace('{step.title}</span>', '</span>') # Because we just put it in the top span

# Actually let's refine the step title replacement:
# Original:
# <span className={`text-[10px] uppercase font-bold tracking-widest rtl:tracking-normal ${isActive ? "text-[#C75C1A]" : "text-slate-500"}`}>{t("Étape")}{idx + 1}</span>
# <span className={`text-xs md:text-sm font-semibold hidden md:block ${isActive ? "text-slate-900" : "text-slate-600"}`}>{step.title}</span>
# We want just the title, prominently.
content = re.sub(
    r'<span className=\{`text-\[10px\] uppercase font-bold tracking-widest rtl:tracking-normal \$\{isActive \? "text-\[#C75C1A\]" : "text-slate-500"\}\`\}>\{t\("Étape"\)\}\{idx \+ 1\}</span>\s*<span className=\{`text-xs md:text-sm font-semibold hidden md:block \$\{isActive \? "text-slate-900" : "text-slate-600"\}\`\}>\{step\.title\}</span>',
    r'<span className={`text-xs md:text-sm font-semibold ${isActive ? "text-[#C75C1A]" : "text-slate-600"}`}>{step.title}</span>',
    content
)

# Modal Background
content = content.replace('bg-white w-full h-full md:max-w-6xl', 'bg-[#FFFBF5] w-full h-full md:max-w-6xl')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
