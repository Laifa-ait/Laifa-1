import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Key, User, CheckCircle2, Eye, EyeOff, ShieldCheck, ScrollText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification
} from "firebase/auth";

import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { OlmaLogo } from "../../components/Navbar";

export const Auth: React.FC = () => {
  const { currentUser, signUpWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller">("buyer");

  // Premium UI & Verification States (Module 5)
  const [fieldErrors, setFieldErrors] = useState({ email: false, password: false, name: false, cgv: false });
  const [showPassword, setShowPassword] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [registrationRules, setRegistrationRules] = useState("");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [rulesValidated, setRulesValidated] = useState(false);
  const rulesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().registrationRules) {
          setRegistrationRules(docSnap.data().registrationRules);
        }
      } catch (error) {
        console.error("Error fetching rules:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleScroll = () => {
    if (rulesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = rulesContainerRef.current;
      // Allow a 5px margin of error
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setHasScrolledToBottom(true);
      }
    }
  };

  useEffect(() => {
    if (!isLogin && registrationRules && rulesContainerRef.current) {
      const { scrollHeight, clientHeight } = rulesContainerRef.current;
      if (scrollHeight <= clientHeight) {
        setHasScrolledToBottom(true);
      }
    }
  }, [isLogin, registrationRules]);

  // Password strength gauge analyzer
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "", color: "bg-zinc-200" };
    if (pass.length < 1) return { score: 0, text: "", color: "bg-zinc-200" };
    if (pass.length < 4) return { score: 1, text: t("auth.password_strength.very_weak") || "Très faible", color: "bg-red-500 w-1/4" };
    if (pass.length < 6) return { score: 2, text: t("auth.password_strength.weak") || "Faible", color: "bg-orange-500 w-2/4" };
    if (pass.length < 8) return { score: 3, text: t("auth.password_strength.medium") || "Moyen", color: "bg-yellow-500 w-3/4" };
    // Check complexity
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    if (hasLetters && hasNumbers) {
      return { score: 5, text: t("auth.password_strength.robust") || "Robuste !", color: "bg-emerald-600 w-full" };
    }
    return { score: 4, text: t("auth.password_strength.strong") || "Fort", color: "bg-emerald-500 w-4/5" };
  };

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (currentUser) {
      if (!currentUser.emailVerified) {
        navigate('/verify-email');
        return;
      }
      
      if (!isLogin) {
         navigate('/');
      } else {
         if (window.history.length > 2) {
           navigate(-1);
         } else {
           navigate('/');
         }
      }
    }
  }, [currentUser, navigate, isLogin]);

  if (currentUser) return null;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle(selectedRole);
      toast.success(t("login_success", "Connexion réussie !"));
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
         console.error("Erreur de connexion Google:", error);
         toast.error(t("google_login_failed", "La connexion avec Google a échoué."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({ email: false, password: false, name: false, cgv: false });

    if (!isLogin && !name.trim()) {
        setFieldErrors(prev => ({ ...prev, name: true }));
        toast.error(t("auth.error.name_required") || "Veuillez saisir votre nom complet.");
        setLoading(false);
        return;
    }

    if (!isLogin && password.length < 6) {
        setFieldErrors(prev => ({ ...prev, password: true }));
        toast.error(t("auth.error.password_too_short") || "Le mot de passe doit faire au moins 6 caractères.");
        setLoading(false);
        return;
    }

    if (!isLogin && registrationRules && !cgvAccepted) {
        setFieldErrors(prev => ({ ...prev, cgv: true }));
        toast.error(t("auth.error.read_rules") || "Veuillez lire et accepter les conditions d'inscription.");
        setLoading(false);
        return;
    }

    const getLocalizedAuthErrorMessage = (code: string): string => {
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
          return t("auth_error_invalid_credential", "Email ou mot de passe incorrect.");
        case 'auth/user-not-found':
          return t("auth_error_user_not_found", "Aucun compte existant pour cet e-mail.");
        case 'auth/email-already-in-use':
          return t("auth_error_email_already_in_use", "Cet e-mail est déjà utilisé par un autre compte.");
        case 'auth/weak-password':
          return t("auth_error_weak_password", "Le mot de passe est trop faible (6 caractères minimum).");
        case 'auth/invalid-email':
          return t("auth_error_invalid_email", "L'adresse e-mail saisie est de format incorrect.");
        case 'auth/too-many-requests':
          return t("auth_error_too_many_requests", "Trop de tentatives échouées. Par sécurité, votre accès est temporairement bloqué. Réessayez plus tard.");
        case 'auth/user-disabled':
          return t("auth_error_user_disabled", "Ce compte a été suspendu. Veuillez contacter le support technique d'OLMART.");
        case 'auth/network-request-failed':
          return t("auth_error_network_request_failed", "Erreur réseau. Veuillez vérifier votre connexion internet et réessayer.");
        case 'auth/internal-error':
          return t("auth_error_internal", "Une erreur interne s'est produite lors de la connexion.");
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          return t("auth_error_popup_closed", "La fenêtre d'authentification a été fermée.");
        default:
          return t("auth_error_generic", "Erreur d'authentification. Veuillez réessayer.");
      }
    };

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success(t("welcome_back", "Content de vous revoir !"));
      } else {
        localStorage.setItem("olmart_pending_registration_role", selectedRole);
        await signUpWithEmail(email, password, name, selectedRole);
        toast.success(t("account_created_success", "Compte créé avec succès ! Veuillez vérifier votre email."));
      }
    } catch (err: any) {
      console.error("Erreur d'authentification:", err);
      
      // Update field highlights based on errorCode
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setFieldErrors({ email: true, password: true, name: false, cgv: false });
      } else if (err.code === 'auth/email-already-in-use' || err.code === 'auth/invalid-email') {
        setFieldErrors(prev => ({ ...prev, email: true }));
      } else if (err.code === 'auth/weak-password') {
        setFieldErrors(prev => ({ ...prev, password: true }));
      }
      
      toast.error(getLocalizedAuthErrorMessage(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/forgot-password');
  };

  return (
    <div className="min-h-screen flex text-[#3C2B22] bg-[#FDF9EC] selection:bg-[#FF5C00]/20 selection:text-[#FF5C00]">
      
      {/* Côté Gauche - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-[#3C2B22] overflow-hidden items-center justify-center p-12">
         <div className="absolute inset-0">
            <img loading="lazy" 
              src="/marketplace.jpg" 
              alt={t("Marketplace") || "Marketplace"} 
              className="w-full h-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#3C2B22] via-[#3C2B22]/40 to-transparent"></div>
         </div>

         {/* Contenu Décoratif (Glassmorphism clair) */}
         <div className="relative z-10 w-full max-w-lg mt-[15vh]">
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.8, ease: "easeOut" }}
               className="backdrop-blur-xl bg-[#FDF9EC]/90 border border-white/40 p-10 rounded-[2.5rem] shadow-2xl"
            >
               <div className="w-16 h-16 bg-gradient-to-tr from-[#FF5C00] to-[#E5A852] rounded-2xl flex items-center justify-center mb-8 shadow-xl">
                  <OlmaLogo className="w-8 h-8 text-white" />
               </div>
               <h1 className="text-4xl text-[#3C2B22] font-kinder tracking-tight rtl:tracking-normal mb-4">
                  {t("OLMA")}<br/><span className="text-[#FF5C00] text-3xl">{t("Marketplace")}</span>
               </h1>
               <p className="text-lg text-[#3C2B22]/80 font-medium leading-relaxed">
                  {t("auth.sidebar.description") || "Découvrez la plus grande marketplace des 58 Wilayas. Rejoignez notre communauté de vendeurs et acheteurs !"}
               </p>

               <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-[#3C2B22] font-bold">
                     <CheckCircle2 className="w-5 h-5 text-[#FF5C00]" />
                     {t("auth.sidebar.secure_payment") || "Paiement 100% sécurisé"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#3C2B22] font-bold">
                     <CheckCircle2 className="w-5 h-5 text-[#FF5C00]" />
                     {t("auth.sidebar.delivery_dz") || "Livraison partout en Algérie"}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#3C2B22] font-bold">
                     <CheckCircle2 className="w-5 h-5 text-[#FF5C00]" />
                     {t("auth.sidebar.support_7j") || "Support client 7j/7"}
                  </div>
               </div>
            </motion.div>
         </div>
      </div>

      {/* Côté Droit - Formulaire */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-6 sm:px-12 md:px-24 py-12 relative overflow-hidden">
         {/* Décoration subtile en arrière-plan */}
         <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-bl from-[#FF5C00]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10"></div>
         
         <div className="w-full max-w-md mx-auto z-10">
            {/* Header Mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#FF5C00] to-[#E5A852] rounded-xl flex items-center justify-center shadow-lg">
                   <OlmaLogo className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-kinder tracking-tighter rtl:tracking-normal text-[#3C2B22]">{t("OLMA")}</span>
            </div>

            {/* Titre dynamique */}
            <div className="mb-10 text-center xl:text-start">
               <h2 className="text-3xl sm:text-4xl font-kinder tracking-tight rtl:tracking-normal text-[#3C2B22] mb-3">
                  {isLogin ? (t("auth.login_title") || "Heureux de vous revoir") : (t("auth.signup_title") || "Créer un compte")}
               </h2>
               <p className="text-[#3C2B22]/70 font-medium text-sm sm:text-base">
                  {isLogin ? (t("auth.login_subtitle") || "Connectez-vous pour continuer vos achats.") : (t("auth.signup_subtitle") || "Rejoignez Olma et commencez l'aventure.")}
               </p>
            </div>

            <div className="relative">
                {/* Onglets */}
                <div className="flex bg-[#3C2B22]/5 p-1.5 rounded-2xl mb-8">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                      isLogin ? 'bg-white text-[#3C2B22] shadow-md' : 'text-[#3C2B22]/60 hover:text-[#3C2B22]'
                    }`}
                  >
                    {t("auth.tab_login") || "Connexion"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                      !isLogin ? 'bg-white text-[#3C2B22] shadow-md' : 'text-[#3C2B22]/60 hover:text-[#3C2B22]'
                    }`}
                  >
                    {t("auth.tab_signup") || "Inscription"}
                  </button>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {!isLogin && (
                      <motion.div
                        key="role-select"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="space-y-4 mb-2"
                      >
                         <label className="text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-[#3C2B22]/50 block ps-1">
                           {t("i_want_to_be", "Je souhaite être")}
                         </label>
                         <div className="flex bg-[#3C2B22]/5 rounded-2xl p-1.5 border border-[#3C2B22]/5">
                           <button
                             type="button"
                             onClick={() => setSelectedRole('buyer')}
                             className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${
                               selectedRole === 'buyer' 
                                 ? 'bg-[#3C2B22] text-white shadow-lg' 
                                 : 'text-[#3C2B22]/60 hover:text-[#3C2B22]'
                             }`}
                           >
                             {t("buyer_role", "Acheteur")}
                           </button>
                           <button
                             type="button"
                             onClick={() => setSelectedRole('seller')}
                             className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all ${
                               selectedRole === 'seller' 
                                 ? 'bg-[#FF5C00] text-white shadow-lg shadow-[#FF5C00]/20' 
                                 : 'text-[#3C2B22]/60 hover:text-[#FF5C00]'
                             }`}
                           >
                             {t("seller_role", "Vendeur")}
                           </button>
                         </div>
                      </motion.div>
                    )}

                    {!isLogin && (
                      <motion.div
                        key="name-input"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <div className="relative group">
                           <User className="absolute ltr:left-5 rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3C2B22]/40 group-focus-within:text-[#FF5C00] transition-colors pointer-events-none" />
                           <input 
                              type="text" 
                              placeholder={t("auth.placeholder_name") || "Nom complet"} 
                              required={!isLogin} 
                              value={name} 
                              onChange={(e) => setName(e.target.value)} 
                              className="w-full bg-white border border-[#FF5C00] rounded-2xl ltr:pl-12 rtl:pr-12 ltr:pr-5 rtl:pl-5 py-4 text-[#3C2B22] placeholder:text-[#3C2B22]/40 outline-none focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 transition-all font-semibold shadow-sm" 
                           />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="relative group">
                    <Mail className="absolute ltr:left-5 rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3C2B22]/40 group-focus-within:text-[#FF5C00] transition-colors pointer-events-none" />
                    <input 
                        type="email" 
                        placeholder={t("auth.placeholder_email") || "Adresse e-mail"} 
                        required 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full bg-white border border-[#FF5C00] rounded-2xl ltr:pl-12 rtl:pr-12 ltr:pr-5 rtl:pl-5 py-4 text-[#3C2B22] placeholder:text-[#3C2B22]/40 outline-none focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 transition-all font-semibold shadow-sm" 
                    />
                  </div>
                  
                  <div className="relative group">
                    <Key className="absolute ltr:left-5 rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#3C2B22]/40 group-focus-within:text-[#FF5C00] transition-colors pointer-events-none" />
                    <input 
                        type="password" 
                        placeholder={t("auth.placeholder_password") || "Mot de passe"} 
                        required 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full bg-white border border-[#FF5C00] rounded-2xl ltr:pl-12 rtl:pr-12 ltr:pr-5 rtl:pl-5 py-4 text-[#3C2B22] placeholder:text-[#3C2B22]/40 outline-none focus:border-[#FF5C00] focus:ring-4 focus:ring-[#FF5C00]/10 transition-all font-semibold shadow-sm" 
                    />
                  </div>
                  
                  {isLogin && (
                     <div className="flex justify-end pt-1">
                          <button
                           type="button"
                           onClick={handleForgotPassword}
                           className="text-xs font-bold text-[#3C2B22]/70 hover:text-[#FF5C00] transition-colors"
                        >
                           {t("auth.forgot_password") || "Mot de passe oublié ?"}</button>
                     </div>
                  )}

                  {!isLogin && registrationRules && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 flex flex-col space-y-3"
                    >
                      <label className="text-xs font-kinder uppercase tracking-widest rtl:tracking-normal text-[#3C2B22] flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-[#FF5C00]" />
                        {t("auth.rules_title") || "Conditions d'inscription"}
                      </label>
                      
                      <button 
                        type="button"
                        onClick={() => setShowRulesModal(true)}
                        className={`text-start text-sm font-bold underline transition-colors ${rulesValidated ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-600'}`}
                      >
                         {rulesValidated ? (t("auth.rules_validated") || "Conditions lues et validées") : (t("auth.rules_read_cta") || "Lire les conditions d'inscription obligatoires")}
                      </button>
                      
                      <div className="flex items-start gap-3 mt-2">
                         <input 
                           type="checkbox" 
                           id="cgv-checkbox"
                           checked={cgvAccepted}
                           onChange={(e) => setCgvAccepted(e.target.checked)}
                           disabled={!rulesValidated}
                           className="mt-1 w-4 h-4 text-[#FF5C00] border-[#FF5C00] rounded focus:ring-[#FF5C00] disabled:opacity-40 disabled:cursor-not-allowed"
                         />
                         <label htmlFor="cgv-checkbox" className={`text-xs font-bold ${!rulesValidated ? 'text-[#3C2B22]/40 cursor-not-allowed' : 'text-[#3C2B22] cursor-pointer'}`}>
                           {t("auth.accept_rules") || "J'accepte les conditions d'inscription."}
                           {!rulesValidated && (
                             <span className="block mt-1 text-red-500 font-semibold">{t("auth.read_rules_first") || "Veuillez d'abord lire le texte des conditions."}</span>
                           )}
                         </label>
                      </div>
                    </motion.div>
                  )}

                  <button 
                     type="submit" 
                     disabled={loading || Boolean(!isLogin && registrationRules && !cgvAccepted)}
                     className="w-full mt-6 py-4 bg-[#3C2B22] text-white rounded-2xl font-kinder uppercase tracking-[0.2em] rtl:tracking-normal flex items-center justify-center gap-3 text-xs hover:bg-[#0a0b0c] hover:shadow-lg hover:shadow-[#3C2B22]/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                     {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : (
                        isLogin ? (t("auth.btn_login") || "Se Connecter") : (selectedRole === 'seller' ? (t("auth.btn_apply_seller") || "Soumettre ma candidature vendeur") : (t("auth.btn_signup") || "S'inscrire"))
                     )}
                  </button>
                  
                  {!isLogin && selectedRole === 'seller' && (
                     <p className="text-center text-xs text-[#3C2B22]/60 mt-4 font-medium">
                        {t("auth.seller_disclaimer") || "Votre candidature sera étudiée par notre équipe de curateurs."}
                     </p>
                  )}
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#FF5C00]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#FDF9EC] text-[#3C2B22]/50 font-bold uppercase tracking-widest rtl:tracking-normal text-[10px]">
                       {t("auth.oauth_divider") || "Ou continuer avec"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  type="button"
                  disabled={loading || Boolean(!isLogin && registrationRules && !cgvAccepted)}
                  className="w-full py-4 flex items-center justify-center gap-3 bg-white border border-[#FF5C00] rounded-2xl hover:bg-[#FDF9EC] hover:border-[#FF5C00]/30 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <img loading="lazy" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt={t("Google") || "Google"} className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-[#3C2B22]">{t("Google")}</span>
                </button>
            </div>
         </div>
      </div>

      {showRulesModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white z-10 sticky top-0">
               <h2 className="text-xl font-kinder text-zinc-900 flex items-center gap-3">
                 <ShieldCheck className="w-6 h-6 text-[#FF5C00]" />
                 {t("auth.modal.rules_title") || "Conditions d'inscription"}
               </h2>
            </div>
            
            <div 
              className="p-6 overflow-y-auto flex-1 font-medium text-sm text-zinc-700 leading-relaxed" 
              ref={rulesContainerRef} 
              onScroll={handleScroll}
            >
              {registrationRules.split('\n').map((line, idx) => (
                 <p key={idx} className="mb-4">{line}</p>
              ))}
            </div>
            
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 shrink-0 flex flex-col sm:flex-row items-center gap-4 justify-between">
              <p className="text-xs font-bold text-zinc-500 max-w-sm">
                {!hasScrolledToBottom 
                  ? (t("auth.modal.scroll_down") || "Vous devez lire le document jusqu'en bas pour pouvoir valider.") 
                  : (t("auth.modal.rules_read_feedback") || "Merci d'avoir pris connaissance de nos conditions.")}
              </p>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowRulesModal(false)}
                  className="px-6 py-3 font-bold text-zinc-500 hover:bg-zinc-200 rounded-xl transition-colors flex-1 sm:flex-none text-center"
                >
                  {t("common.close") || "Fermer"}
                </button>
                <button
                  type="button"
                  disabled={!hasScrolledToBottom}
                  onClick={() => {
                    setRulesValidated(true);
                    setCgvAccepted(true);
                    setShowRulesModal(false);
                  }}
                  className="px-6 py-3 bg-[#3C2B22] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black transition-colors flex-1 sm:flex-none text-center flex items-center justify-center gap-2"
                >
                  {t("auth.modal.btn_validate") || "J'ai tout lu et je valide"}
                  {hasScrolledToBottom && <CheckCircle2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};


