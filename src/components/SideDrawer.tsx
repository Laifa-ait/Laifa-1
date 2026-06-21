import React, { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  icon: ReactNode;
  children: ReactNode;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
}) => {
    const { t } = useTranslation();
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#FAF8F5]/98 md:backdrop-blur-xl z-[110] shadow-[0_20px_50px_rgba(44,30,22,0.10)] flex flex-col overscroll-contain border-l border-[#EBE5DF]/40"
            style={{ maxHeight: '100dvh', overflowY: 'auto' }}
          >
            <div className="p-6 border-b border-[#EBE5DF]/40 flex items-center justify-between shrink-0 bg-[#FAF8F5]">
              <h3 className="text-lg font-bold flex items-center gap-2 tracking-tight rtl:tracking-normal text-zinc-900">
                {icon} {title}
              </h3>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-zinc-100/80 hover:bg-zinc-200/85 rounded-full text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer border-none"
                title={t("Fermer") || "Fermer"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
