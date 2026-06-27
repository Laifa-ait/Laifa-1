import React from "react";
import { motion } from "motion/react";
import { Truck, ShieldCheck, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export const TechTrustBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full py-3 sm:py-4 border-y border-slate-100 bg-white mb-4 sm:mb-6">
      <div className="max-w-[90rem] mx-auto px-4 flex items-center justify-between sm:justify-center sm:gap-16 gap-6 overflow-x-auto desktop-scrollbar">
        <motion.div whileHover={{ y: -1 }} className="flex items-center gap-2.5 shrink-0">
          <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" strokeWidth={1.5} />
          <span className="font-sans font-medium text-[11px] sm:text-[13px] uppercase tracking-wider text-slate-700">
            {t("home.trust.delivery_58")}
          </span>
        </motion.div>
        <div className="h-4 sm:h-5 w-px bg-slate-200 shrink-0" />
        <motion.div whileHover={{ y: -1 }} className="flex items-center gap-2.5 shrink-0">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" strokeWidth={1.5} />
          <span className="font-sans font-medium text-[11px] sm:text-[13px] uppercase tracking-wider text-slate-700">
            {t("home.trust.cod")}
          </span>
        </motion.div>
        <div className="h-4 sm:h-5 w-px bg-slate-200 shrink-0 hidden md:block" />
        <motion.div whileHover={{ y: -1 }} className="items-center gap-2.5 shrink-0 hidden md:flex">
          <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" strokeWidth={1.5} />
          <span className="font-sans font-medium text-[11px] sm:text-[13px] uppercase tracking-wider text-slate-700">
            {t("home.trust.certified")}
          </span>
        </motion.div>
      </div>
    </div>
  );
};
