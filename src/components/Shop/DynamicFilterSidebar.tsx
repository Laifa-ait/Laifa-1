import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Filter, ChevronDown, Check } from "lucide-react";
import { CategoryStructure, DynamicFilterDef } from "../../config/dynamicFilters";
import { useTranslation } from "react-i18next";

type FilterState = Record<string, any>;

interface DynamicFilterSidebarProps {
  categoryDef: CategoryStructure;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DynamicFilterSidebar: React.FC<DynamicFilterSidebarProps> = ({
  categoryDef,
  filters,
  onFilterChange,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFilterChange = (filterId: string, value: string | string[] | boolean) => {
    const newFilters = { ...filters, [filterId]: value };
    // Clean up empty values
    if (value === "" || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[filterId];
    }
    onFilterChange(newFilters);
  };

  const handleCheckboxChange = (filterId: string, option: string, isChecked: boolean) => {
    const currentList = (filters[filterId] as string[]) || [];
    if (isChecked) {
      handleFilterChange(filterId, [...currentList, option]);
    } else {
      handleFilterChange(
        filterId,
        currentList.filter((v) => v !== option)
      );
    }
  };

  const renderFilterControl = (filter: DynamicFilterDef) => {
    switch (filter.type) {
      case "select":
      case "radio":
        return (
          <div className="space-y-2 mt-2">
            <select
              value={(filters[filter.id] as string) || ""}
              onChange={(e) => handleFilterChange(filter.id, e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-900 transition-colors text-xs rtl:text-sm font-medium text-slate-700"
            >
              <option value="">
                {t("all_the", "Tous les")} {t(filter.label, filter.label).toLowerCase()}
              </option>
              {filter.options?.map((opt: any) => {
                const label = typeof opt === "string" ? opt : opt.label;
                const value = typeof opt === "string" ? opt : opt.value;
                return (
                  <option key={value} value={value}>
                    {t(label, label) as string}
                  </option>
                );
              })}
            </select>
          </div>
        );

      case "multiselect":
        return (
          <div className="space-y-2.5 mt-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {filter.options?.map((opt: any) => {
              const label = typeof opt === "string" ? opt : opt.label;
              const value = typeof opt === "string" ? opt : opt.value;
              const isChecked = ((filters[filter.id] as string[]) || []).includes(value);

              return (
                <label key={value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isChecked}
                    onChange={(e) => handleCheckboxChange(filter.id, value, e.target.checked)}
                  />
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isChecked ? "bg-blue-900 border-blue-900" : "bg-white border-slate-300 group-hover:border-blue-900"}`}
                  >
                    {isChecked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={`text-[13px] font-medium transition-colors ${isChecked ? "text-blue-900 font-bold" : "text-slate-600 group-hover:text-slate-900"}`}
                  >
                    {t(label, label) as string}
                  </span>
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white lg:bg-transparent">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-900" />
          <h2 className="font-bold text-slate-900">
            {t("filter_filters", "Filtres")} {categoryDef.name}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-0 bg-white lg:bg-transparent">
        <div className="lg:border lg:border-slate-200 lg:bg-white lg:rounded-2xl overflow-hidden p-4">
          <div className="hidden lg:flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Filter className="w-4 h-4 text-blue-900" />
            <span className="font-kinder text-sm uppercase tracking-wider rtl:tracking-normal text-slate-900">
              {t("dynamic_filters", "Filtres Dynamiques")}
            </span>
          </div>

          <div className="space-y-6">
            {categoryDef.allowed_filters.map((filter) => {
              const isExpanded = expandedSections[filter.id] !== false;

              return (
                <div key={filter.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                  <button
                    onClick={() => toggleSection(filter.id)}
                    className="w-full flex items-center justify-between group"
                  >
                    <span className="font-bold text-sm text-slate-800">{t(filter.label, filter.label)}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {renderFilterControl(filter)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => onFilterChange({})}
              className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs rtl:text-sm font-bold uppercase transition-colors"
            >
              {t("reset_filters", "Réinitialiser les filtres")}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-72 shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
