import React, { useState } from 'react';
import { CheckCircle2, Circle, Rocket, ShieldAlert, CreditCard, Search, Database, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

export const LaunchChecklistAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [tasks, setTasks] = useState([
    { id: 1, category: "Base de données & Contenu", title: "Purger les données de test (Seed)", done: false, icon: Database },
    { id: 2, category: "Base de données & Contenu", title: "Ajouter vos vrais produits et vendeurs", done: false, icon: Database },
    { id: 3, category: "Base de données & Contenu", title: "Configurer Firebase Storage (Règles publiques)", done: false, icon: Database },
    { id: 4, category: "Sécurité & Accès", title: "Vérifier les Firestore Security Rules (Production)", done: false, icon: ShieldAlert },
    { id: 5, category: "Sécurité & Accès", title: "Restreindre l'accès Admin à votre compte", done: false, icon: ShieldAlert },
    { id: 6, category: "Paiement & Légal", title: "Configurer la passerelle de paiement locale (SATIM/CIB...)", done: false, icon: CreditCard },
    { id: 7, category: "Paiement & Légal", title: "Mettre à jour les CGV, Mentions Légales et Politique de Retour", done: false, icon: CreditCard },
    { id: 8, category: "SEO & Visibilité", title: "Configurer les balises Meta (Titre, Description) pour le SEO", done: false, icon: Search },
    { id: 9, category: "Tests & QA", title: "Tester le parcours complet : Inscription -> Panier -> Paiement", done: false, icon: Smartphone },
    { id: 10, category: "Tests & QA", title: "Vérifier le responsive design sur mobile réel", done: false, icon: Smartphone },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const progress = Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);

  const handleLaunch = () => {
    if (progress === 100) {
      toast.success("Félicitations ! Vous êtes prêt pour le lancement de OLMART.", { duration: 5000, icon: '🚀' });
    } else {
      toast.error("Veuillez compléter toutes les tâches obligatoires avant le lancement.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 text-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-sm border border-zinc-100">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-full border border-orange-100">
            <Rocket className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-orange-600">{t("Go-Live Readiness")}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight rtl:tracking-normal uppercase">
            {t("Checklist de")}<span className="text-orange-500">{t("Lancement")}</span>
          </h2>
          <p className="text-zinc-500 font-medium max-w-xl">
            {t("Avant d'inviter vos premiers clients et vendeurs sur OLMART, assurez-vous de valider les étapes techniques, légales et commerciales suivantes.")}</p>
        </div>
        
        <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-200 text-center min-w-[200px]">
           <div className="text-5xl font-black text-zinc-950 mb-2">{progress}%</div>
           <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
           </div>
           <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{t("Progression")}</span>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-zinc-100">
           {tasks.map(task => (
             <div 
               key={task.id} 
               className={`p-6 flex items-start gap-4 transition-colors cursor-pointer hover:bg-zinc-50 ${task.done ? 'bg-zinc-50/50' : ''}`}
               onClick={() => toggleTask(task.id)}
             >
                <div className="mt-1">
                  {task.done ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-zinc-300" />
                  )}
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                       <task.icon className="w-3 h-3 text-zinc-400" />
                       <span className="text-[10px] font-black uppercase tracking-widest rtl:tracking-normal text-zinc-500">{task.category}</span>
                   </div>
                   <h3 className={`font-bold transition-all ${task.done ? 'text-zinc-400 line-through' : 'text-zinc-900'}`}>
                     {task.title}
                   </h3>
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="flex justify-end">
         <button 
           onClick={handleLaunch}
           className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-3 transition-colors shadow-xl ${
             progress === 100 
               ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-500/20' 
               : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
           }`}
         >
           <Rocket className="w-4 h-4" /> {t("Autoriser le lancement")}</button>
      </div>
    </div>
  );
};
