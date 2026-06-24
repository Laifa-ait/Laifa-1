import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../lib/firebase";
import { collection, query, getDocs, limit, orderBy } from "firebase/firestore";
import { X, Sparkles, Megaphone, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export const MonthlyUpdateBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [updates, setUpdates] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const snap = await getDocs(query(collection(db, "site_content_monthly"), limit(20)));
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          setUpdates(docs);

          const latest = docs[0];
          if (latest) {
            const storageKey = `olma_closed_monthly_${latest.id}`;
            if (!localStorage.getItem(storageKey)) {
              setIsVisible(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching monthly updates:", err);
      }
    };

    fetchUpdates();

    const handleOpenUpdates = () => setIsModalOpen(true);
    window.addEventListener("open-olma-updates", handleOpenUpdates);
    return () => window.removeEventListener("open-olma-updates", handleOpenUpdates);
  }, []);

  const currentLang = i18n.language || "fr";
  const latestUpdate = updates[0];

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    if (latestUpdate) {
      localStorage.setItem(`olma_closed_monthly_${latestUpdate.id}`, "true");
    }
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && latestUpdate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsModalOpen(true)}
            className="overflow-hidden bg-gradient-to-r from-zinc-950 to-zinc-800 text-white relative z-50 shadow-md cursor-pointer group"
            dir={currentLang === "ar" ? "rtl" : "ltr"}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="text-[10px] rtl:text-[12px] font-kinder text-amber-300 uppercase tracking-widest rtl:tracking-normal mb-0.5">
                    {currentLang === "ar" ? "تحديثات الشهر" : currentLang === "en" ? "Monthly Update" : "Mise à jour"} •{" "}
                    {latestUpdate.month || latestUpdate.id}
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {(latestUpdate[`text_${currentLang}`] || latestUpdate.text_fr || "").length > 150
                      ? (latestUpdate[`text_${currentLang}`] || latestUpdate.text_fr || "").substring(0, 150) + "..."
                      : latestUpdate[`text_${currentLang}`] || latestUpdate.text_fr || ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="shrink-0 p-2 hover:bg-white/10 rounded-full transition-colors self-start sm:self-center z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
            dir={currentLang === "ar" ? "rtl" : "ltr"}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                <h2 className="text-2xl font-kinder text-zinc-900 flex items-center gap-3">
                  <Megaphone className="w-6 h-6 text-emerald-500" />
                  {currentLang === "ar"
                    ? "سجل التحديثات"
                    : currentLang === "en"
                      ? "Changelog"
                      : "Journal des Mises à Jour"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-zinc-100/50 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/50">
                {updates.length === 0 ? (
                  <p className="text-center text-zinc-500 font-medium py-10">
                    {t("Aucune mise à jour pour le moment.")}
                  </p>
                ) : (
                  updates.map((up) => (
                    <div key={up.id} className="relative pl-6 rtl:pl-0 rtl:pr-6">
                      <div className="absolute left-0 rtl:left-auto rtl:right-0 top-0 bottom-0 w-px bg-zinc-200"></div>
                      <div className="absolute left-[-4px] rtl:left-auto rtl:right-[-4px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                      <div className="mb-1 text-xs rtl:text-sm font-kinder text-emerald-600 uppercase tracking-widest rtl:tracking-normal">
                        {up.month || up.id}
                      </div>
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/60 whitespace-pre-wrap text-zinc-700 text-sm leading-relaxed font-medium">
                        {up[`text_${currentLang}`] || up.text_fr || ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 bg-white border-t border-zinc-100 text-center">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-3 bg-zinc-950 text-white rounded-full font-kinder text-sm uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-800 transition-colors"
                >
                  {currentLang === "ar" ? "إغلاق" : currentLang === "en" ? "Close" : "Fermer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
