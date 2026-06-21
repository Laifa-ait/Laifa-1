import React, { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, Send, CheckCircle2, PhoneCall } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export const Support: React.FC = () => {
    const { t } = useTranslation();
    const [requestType, setRequestType] = useState('order_issue');
    const [email, setEmail] = useState(auth.currentUser?.email || '');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const [supportEmail, setSupportEmail] = useState("");

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'global');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().supportEmail) {
                    setSupportEmail(docSnap.data().supportEmail);
                }
            } catch (error) {
                console.error("Error fetching support settings:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email.trim() || !message.trim() || !name.trim()) {
            toast.error(t("Veuillez remplir tous les champs obligatoires."));
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'support_tickets'), {
                userId: auth.currentUser?.uid || 'guest',
                name,
                email,
                requestType,
                message,
                status: 'open',
                priority: requestType === 'order_issue' ? 'high' : 'medium',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setIsSubmitted(true);
        } catch (error) {
            console.error("Error submitting support ticket:", error);
            toast.error(t("Une erreur est survenue lors de l'envoi de votre demande."));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-stone-50 pt-24 pb-20 flex items-center justify-center">
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-100 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-stone-900 mb-2">{t("Demande Envoyée")}</h2>
                    <p className="text-stone-500 text-sm mb-8 leading-relaxed">
                        {t("Merci de nous avoir contactés. Notre équipe de support traitera votre demande dans les plus brefs délais et vous répondra sur")} <span className="font-bold text-stone-900">{email}</span>.
                    </p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="bg-stone-900 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-stone-800 transition-colors"
                    >
                        {t("Retour à l'accueil")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 pt-24 pb-20">
            <Toaster position="bottom-right" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">{t("Comment pouvons-nous vous aider ?")}</h1>
                    <p className="text-stone-500 font-medium mt-3 text-sm sm:text-base max-w-xl mx-auto">
                        {t("Notre équipe de support est là pour répondre à vos questions et résoudre vos problèmes rapidement.")}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Colonne d'informations */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                <Mail className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900 text-sm">{t("Par email")}</h3>
                                <p className="text-xs text-stone-500 mt-1 font-medium">{supportEmail || "support@olma.dz"}</p>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-900 text-sm">{t("Temps de réponse")}</h3>
                                <p className="text-xs text-stone-500 mt-1 font-medium">{t("Généralement sous 24h ouvrées.")}</p>
                            </div>
                        </div>
                    </div>

                    {/* Formulaire */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-100 space-y-6">
                            
                            {/* Type de demande */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-900 block">{t("Sujet de votre demande *")}</label>
                                <select 
                                    value={requestType}
                                    onChange={e => setRequestType(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 focus:bg-white text-sm font-medium transition-colors"
                                >
                                    <option value="order_issue">{t("Problème avec une commande/livraison")}</option>
                                    <option value="return_refund">{t("Demande de retour ou remboursement")}</option>
                                    <option value="technical_issue">{t("Problème technique sur le site")}</option>
                                    <option value="seller_inquiry">{t("Question pour un vendeur")}</option>
                                    <option value="other">{t("Autre demande")}</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Nom */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-stone-900 block">{t("Nom complet *")}</label>
                                    <input 
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder={t("Votre nom")}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 focus:bg-white text-sm font-medium transition-colors"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-stone-900 block">{t("Adresse email *")}</label>
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder={t("prenom.nom@gmail.com")}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 focus:bg-white text-sm font-medium transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-stone-900 block">{t("Message *")}</label>
                                <textarea 
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder={t("Décrivez votre problème en détail...")}
                                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 focus:bg-white text-sm font-medium transition-colors min-h-[160px] resize-y"
                                ></textarea>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center items-center gap-2 bg-stone-900 text-white font-bold text-sm px-6 py-4 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {t("Envoyer la demande")}
                                    </>
                                )}
                            </button>

                        </form>
                    </div>
                </div>

            </div>
        </div>
    );
};
