import React from 'react';
import { useTranslation } from "react-i18next";

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

interface NavigationSectionProps {
  items: NavItem[];
  handleNav: (path: string) => void;
}

export const NavigationSection: React.FC<NavigationSectionProps> = ({ items, handleNav }) => {
    const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-[10px] rtl:text-[12px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal ml-1 mb-4">{t("Navigation")}</p>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => handleNav(item.path)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-zinc-50 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:text-orange-600 group-hover:bg-orange-50 transition-all">
            <item.icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-zinc-700 group-hover:text-zinc-950">{item.label}</span>
        </button>
      ))}
    </div>
  );
};
