import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Mail, Smartphone } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: "email" | "sms";
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose, method }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) throw new Error("Code invalide");

      toast.success("Compte vérifié avec succès !");
      onClose();
    } catch (err) {
      toast.error("Code invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#3C2B22]/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl"
          >
            <div className="w-16 h-16 bg-[#FF5C00]/10 text-[#FF5C00] rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-kinder text-[#3C2B22] text-center mb-2">{t("Vérification 2FA")}</h3>
            <p className="text-sm text-zinc-500 text-center mb-6">
              {t("Entrez le code reçu par")}
              {method === "email" ? "e-mail" : "SMS"}.
              {process.env.NODE_ENV !== "production" && (
                <span className="block mt-2 font-bold text-amber-600">{t("Code de test (Dév): 123456")}</span>
              )}
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              className="w-full text-center text-2xl font-bold tracking-[0.5em] py-4 bg-zinc-50 border border-zinc-200 rounded-xl mb-6 outline-none focus:border-[#FF5C00]"
              placeholder="000000"
            />
            <button
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
              className="w-full py-4 bg-[#3C2B22] text-white rounded-2xl font-bold hover:bg-[#0a0b0c] transition-all disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Valider le code"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
