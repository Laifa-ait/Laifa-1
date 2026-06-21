import React from 'react';
import { ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

interface CategorySectionProps {
  categories: any[];
  expandedId: string | null;
  toggleExpand: (id: string) => void;
  handleCategoryDirectNav: (name: string) => void;
  handleSubcategoryNav: (cat: string, sub: string) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({ categories, expandedId, toggleExpand, handleCategoryDirectNav, handleSubcategoryNav, t, isRtl }) => {
  return (
    <div className="space-y-4">
      <p className="text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ml-1">
        {t("menu_categories") || "Rayons"}
      </p>
      <div className="space-y-2.5">
        {categories.map((category) => {
          const isExpanded = expandedId === category.id;
          const hasSections = category.sections && category.sections.length > 0;

          return (
            <div key={category.id} className="bg-zinc-50 border border-zinc-100/60 rounded-2xl overflow-hidden transition-all duration-300">
              <div className="flex items-center justify-between p-4 hover:bg-zinc-100/30 transition-colors">
                <button
                  onClick={() => handleCategoryDirectNav(category.name)}
                  className="bg-transparent border-none text-left font-black text-sm text-zinc-800 flex-1 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  {t(category.name) || category.name}
                </button>
                {hasSections && (
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="w-8 h-8 flex items-center justify-center bg-white border border-zinc-100 rounded-xl text-zinc-500 hover:text-orange-600 hover:border-orange-200 transition-all cursor-pointer"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {isExpanded && hasSections && (
                <div className="bg-white border-t border-zinc-100/80 p-3.5 space-y-1.5">
                  <button
                    onClick={() => handleCategoryDirectNav(category.name)}
                    className="w-full text-left py-2 px-3 rounded-xl text-xs rtl:text-sm font-semibold text-zinc-500 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-between cursor-pointer border-none bg-transparent"
                  >
                    <span>{t("all_category") || "Voir toute la catégorie"}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-zinc-400 ${isRtl ? 'rotate-180' : ''}`} />
                  </button>
                  {category.sections.map((section: any, sIdx: number) => (
                    <button
                      key={sIdx}
                      onClick={() => handleSubcategoryNav(category.name, section.name)}
                      className="w-full text-left py-2 px-3 rounded-xl text-xs rtl:text-sm font-bold text-zinc-700 hover:bg-zinc-50 hover:text-orange-600 transition-all flex items-center justify-between cursor-pointer border-none bg-transparent"
                    >
                      <span>{t(section.name) || section.name}</span>
                      <ChevronRight className={`w-3.5 h-3.5 text-zinc-300 ${isRtl ? 'rotate-180' : ''}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
