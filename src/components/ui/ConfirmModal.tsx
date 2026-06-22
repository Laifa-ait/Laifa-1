import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-xl pointer-events-auto relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-stone-100 rounded-full blur-3xl -me-10 -mt-10 opacity-50 pointer-events-none" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-[#121315] mb-2 relative z-10">{title}</h3>
              <p className="text-stone-500 font-medium text-sm mb-8 leading-relaxed relative z-10">{message}</p>

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold tracking-wide transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 px-4 py-3 bg-[#121315] hover:bg-[#0a0b0c] text-white rounded-xl font-bold tracking-wide transition-colors shadow-lg"
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
