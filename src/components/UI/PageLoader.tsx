import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export const PageLoader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center min-h-[50vh]">
      <motion.div
        className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full mb-4"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      />
      <div className="text-slate-500 font-medium tracking-tight rtl:tracking-normal text-sm uppercase">
        {t("Chargement...")}
      </div>
    </div>
  );
};
