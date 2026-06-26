import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

export const NotFound: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center bg-[#FDF9EC]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white border border-[#EBE5DF] rounded-3xl p-8 shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF5C00] to-[#FF8A00]" />
        
        <div className="w-20 h-20 bg-[#FDF9EC] border border-[#EBE5DF] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#FF5C00]">
          <HelpCircle className="w-10 h-10 animate-bounce" />
        </div>

        <h1 className="text-6xl font-black text-[#3C2B22] tracking-tight mb-2">404</h1>
        
        <h2 className="text-xl font-bold text-[#3C2B22] mb-4">
          {isRtl ? "الصفحة غير موجودة" : "Page non trouvée"}
        </h2>
        
        <p className="text-[#7A6555] mb-8 text-sm leading-relaxed">
          {isRtl 
            ? "عذرًا، الصفحة التي تبحث عنها قد تكون حُذفت أو تم نقلها أو أنها غير متوفرة مؤقتًا."
            : "Désolé, la page que vous recherchez a peut-être été supprimée, a changé de nom ou est temporairement indisponible."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 bg-[#FF5C00] hover:bg-[#E05200] text-white font-semibold py-3 px-6 rounded-xl transition duration-200 text-sm shadow-sm"
          >
            <Home className="w-4 h-4" />
            {isRtl ? "الرئيسية" : "Accueil"}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 bg-white hover:bg-[#FDF9EC] border border-[#EBE5DF] text-[#3C2B22] font-semibold py-3 px-6 rounded-xl transition duration-200 text-sm"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            {isRtl ? "رجوع" : "Retour"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
