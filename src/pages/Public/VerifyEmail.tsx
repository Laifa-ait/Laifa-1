import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sendEmailVerification, reload } from 'firebase/auth';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const VerifyEmail: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    if (currentUser.emailVerified) {
      navigate('/onboarding');
    }
  }, [currentUser, navigate]);

  const handleResend = async () => {
    if (!currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success(t("email_resent", "L'e-mail a été renvoyé !"));
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast.error(t("too_many_requests", "Veuillez patienter avant de renvoyer un autre e-mail."));
      } else {
        toast.error(t("email_send_error", "Erreur lors de l'envoi de l'e-mail."));
      }
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    if (!currentUser) return;
    setChecking(true);
    try {
      await reload(currentUser);
      if (currentUser.emailVerified) {
        toast.success(t("email_verified_success", "E-mail vérifié avec succès !"));
        navigate('/onboarding');
      } else {
        toast.error(t("email_not_verified_yet", "E-mail non encore vérifié."));
      }
    } catch (error) {
      toast.error(t("verification_error", "Erreur lors de la vérification."));
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] p-10 border border-zinc-100 shadow-2xl relative z-10 text-center"
      >
        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Mail className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black text-zinc-950 mb-4 tracking-tight rtl:tracking-normal">{t("verify_email_title", "Vérifiez votre boîte e-mail")}</h2>
        <p className="text-zinc-500 font-medium leading-relaxed mb-8">
          {t("verify_email_sent_to", "Nous avons envoyé un lien de confirmation à")} <br/>
          <strong className="text-zinc-900">{currentUser?.email}</strong>
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleCheck}
            disabled={checking}
            className="w-full py-5 bg-zinc-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {checking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span>{t("i_clicked_link", "J'ai cliqué sur le lien")}</span>}
            {!checking && <ArrowRight className="w-4 h-4" />}
          </button>

          <button 
            onClick={handleResend}
            disabled={resending}
            className="w-full py-5 bg-zinc-50 text-zinc-600 rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal hover:bg-zinc-100 hover:text-zinc-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {resending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <span>{t("resend_email", "Renvoyer l'e-mail")}</span>}
          </button>
        </div>

        <button 
          onClick={handleLogout}
          className="mt-8 text-xs font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest rtl:tracking-normal transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("logout", "Se déconnecter")}
        </button>
      </motion.div>
    </div>
  );
};
