import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast.error(t("no_account_linked", "Aucun compte n'est lié à cet e-mail."));
      } else {
        toast.error(t("generic_error", "Une erreur est survenue."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-500/5 blur-[120px] pointer-events-none" />

      <button 
        onClick={() => navigate('/auth')}
        className="absolute top-10 left-10 p-4 bg-white border border-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 shadow-sm hover:shadow transition-all"
      >
        <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] p-10 border border-zinc-100 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-zinc-950 mb-2 tracking-tight rtl:tracking-normal">{t("forgot_password_title", "Mot de passe oublié")}</h2>
          <p className="text-zinc-500 font-medium leading-relaxed">
            {t("forgot_password_desc", "Entrez votre adresse e-mail. Nous vous enverrons un lien pour réinitialiser votre mot de passe.")}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div 
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
                <Send className="w-8 h-8 ml-1" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900">{t("email_sent", "E-mail envoyé")}</h3>
              <p className="text-zinc-500 text-sm">{t("check_inbox", "Vérifiez votre boîte de réception et vos courriers indésirables.")}</p>
              <button 
                onClick={() => navigate('/auth')}
                className="w-full py-5 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-900 transition-all shadow-xl"
              >
                {t("back_to_login", "Retour à la connexion")}
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-6"
            >
              <div className="relative">
                <Mail className={`absolute ${i18n.language === 'ar' ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none`} />
                <input 
                  type="email" 
                  placeholder={t("email_address", "Adresse e-mail") as string} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full ${i18n.language === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all`}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-500 transition-all shadow-xl shadow-orange-500/30 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t("send_link", "Envoyer le lien")}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
