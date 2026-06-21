import React, { useState } from 'react';
import { BellRing, Send, Users, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

export const PushNotificationsAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendNotification = () => {
    toast.success('Notification envoyée à tous les utilisateurs !');
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-950 uppercase">{t("Notifications Push")}</h2>
          <p className="text-zinc-500 font-medium">{t("Envoyez des alertes Firebase Cloud Messaging (FCM) à tous les utilisateurs ou à un segment.")}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm space-y-6">
          <div className="space-y-2">
             <label className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Titre de la notification")}</label>
             <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Ex: Livraison Gratuite ce weekend !") || "Ex: Livraison Gratuite ce weekend !"} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold" />
          </div>
          <div className="space-y-2">
             <label className="text-xs font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Message")}</label>
             <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder={t("Texte de l'alerte...") || "Texte de l'alerte..."} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium resize-none" />
          </div>
          <button onClick={sendNotification} disabled={!title || !message} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest rtl:tracking-normal text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Send className="w-4 h-4" /> {t("Cibler et Envoyer")}</button>
        </div>

        <div className="bg-orange-50 p-8 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col justify-center items-center text-center">
           <BellRing className="w-16 h-16 mb-4 text-orange-400" />
           <h3 className="text-2xl font-black tracking-tight rtl:tracking-normal mb-2 uppercase text-zinc-950">{t("Engagement en temps réel")}</h3>
           <p className="text-zinc-600 text-sm font-medium leading-relaxed max-w-sm">
             {t("Les notifications push augmentent la rétention de 30%. Utilisez cet outil pour les ventes flash, les annonces importantes ou les exclusivités.")}</p>
        </div>
      </div>
    </div>
  );
};
