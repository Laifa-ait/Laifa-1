import React, { useState } from "react";
import { Bot, Mail, LineChart, Sparkles, ShieldCheck, HeadphonesIcon, Settings, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export const AgentsAdmin: React.FC = () => {
  const { t } = useTranslation();

  const [configs, setConfigs] = useState({
    growth: true,
    cart: true,
    moderator: false,
    support: false,
  });
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);

  const toggleAgent = async (agentKey: keyof typeof configs) => {
    setLoadingAgent(agentKey);
    // Simulate a network request to activate/deactivate the agent
    await new Promise((resolve) => setTimeout(resolve, 800));

    setConfigs((prev) => ({
      ...prev,
      [agentKey]: !prev[agentKey],
    }));
    setLoadingAgent(null);

    toast.success(`Agent ${configs[agentKey] ? "désactivé" : "activé"} avec succès.`, {
      icon: "🤖",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "bold",
      },
    });
  };

  const handleConfigureClick = (agentName: string) => {
    toast(`Configuration de ${agentName} ouverte.`, {
      icon: "⚙️",
    });
  };

  const renderAgentStatus = (isActive: boolean) => {
    return (
      <span
        className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rtl:tracking-normal rounded-full border flex items-center gap-1 shadow-xs transition-colors ${
          isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"
        }`}
      >
        {isActive ? (
          <>
            <CheckCircle2 className="w-3 h-3" /> {t("Actif")}
          </>
        ) : (
          "Désactivé"
        )}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 pt-8">
      <div className="flex flex-col gap-2">
        <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-orange-200">
          <Bot className="w-6 h-6 text-orange-600" />
        </div>
        <h1 className="text-3xl font-black text-zinc-950 uppercase tracking-tight rtl:tracking-normal">
          {t("Agents IA")}
        </h1>
        <p className="text-zinc-500 font-medium text-sm max-w-2xl">
          {t(
            "Gérez vos agents d'intelligence artificielle spécialisés pour automatiser des processus complexes et augmenter les performances de votre marketplace."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Analyst Agent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors"
        >
          <div className="absolute top-0 end-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <LineChart className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex items-center justify-center border border-blue-100 shadow-xs">
                <LineChart className="w-6 h-6" />
              </div>
              {renderAgentStatus(configs.growth)}
            </div>

            <h2 className="text-xl font-black text-zinc-900 mb-2">{t("Growth Analyst")}</h2>
            <h3 className="text-sm font-bold text-blue-600 mb-4 tracking-wider rtl:tracking-normal uppercase">
              {t("Analyste Stratégique")}
            </h3>

            <p className="text-zinc-500 text-sm leading-relaxed mb-8 min-h-[4rem]">
              {t(
                "Il analyse en continu les tendances du marché, les mots-clés les plus recherchés, et les comportements des clients pour optimiser les prix et cibler les campagnes avec précision."
              )}
            </p>

            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider rtl:tracking-normal mb-1">
                  {t("Impact")}
                </span>
                <span className="text-sm font-black text-zinc-800">{t("+14% Conversion")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfigureClick("Growth Analyst")}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleAgent("growth")}
                  disabled={loadingAgent === "growth"}
                  className={`w-28 py-2.5 text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-xl transition-colors shadow-sm flex items-center justify-center ${configs.growth ? "bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800"}`}
                >
                  {loadingAgent === "growth" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  ) : configs.growth ? (
                    "Désactiver"
                  ) : (
                    "Activer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Abandoned Cart Recovery Agent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-colors"
        >
          <div className="absolute top-0 end-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Mail className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-orange-50 text-orange-600 w-12 h-12 rounded-xl flex items-center justify-center border border-orange-100 shadow-xs">
                <Mail className="w-6 h-6" />
              </div>
              {renderAgentStatus(configs.cart)}
            </div>

            <h2 className="text-xl font-black text-zinc-900 mb-2">{t("Récupérateur de Paniers")}</h2>
            <h3 className="text-sm font-bold text-orange-600 mb-4 tracking-wider rtl:tracking-normal uppercase">
              {t("Emailing / Notifications Mails")}
            </h3>

            <p className="text-zinc-500 text-sm leading-relaxed mb-8 min-h-[4rem]">
              {t(
                "Il traque les paniers abandonnés et envoie automatiquement des relances ciblées par email avec des offres personnalisées pour convertir les hésitations en achats."
              )}
            </p>

            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider rtl:tracking-normal mb-1">
                  {t("Impact")}
                </span>
                <span className="text-sm font-black text-zinc-800">{t("+22% Récupération")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfigureClick("Récupération Paniers")}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleAgent("cart")}
                  disabled={loadingAgent === "cart"}
                  className={`w-28 py-2.5 text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-xl transition-colors shadow-sm flex items-center justify-center ${configs.cart ? "bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200" : "bg-zinc-950 text-white hover:bg-zinc-800"}`}
                >
                  {loadingAgent === "cart" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  ) : configs.cart ? (
                    "Désactiver"
                  ) : (
                    "Activer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Moderator Agent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors"
        >
          <div className="absolute top-0 end-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center border border-emerald-100 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              {renderAgentStatus(configs.moderator)}
            </div>

            <h2 className="text-xl font-black text-zinc-900 mb-2">{t("Modérateur de Contenu")}</h2>
            <h3 className="text-sm font-bold text-emerald-600 mb-4 tracking-wider rtl:tracking-normal uppercase">
              {t("Vérification Automatique")}
            </h3>

            <p className="text-zinc-500 text-sm leading-relaxed mb-8 min-h-[4rem]">
              {t(
                "Examine les fiches produits créées par les vendeurs et les avis des clients pour détecter les anomalies, les fraudes ou les contenus inappropriés avant publication."
              )}
            </p>

            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider rtl:tracking-normal mb-1">
                  {t("Objectif")}
                </span>
                <span className="text-sm font-black text-zinc-800">{t("Conformité")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfigureClick("Modérateur")}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleAgent("moderator")}
                  disabled={loadingAgent === "moderator"}
                  className={`w-28 py-2.5 text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-xl transition-colors shadow-sm flex items-center justify-center ${configs.moderator ? "bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                >
                  {loadingAgent === "moderator" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  ) : configs.moderator ? (
                    "Désactiver"
                  ) : (
                    "Activer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Customer Support Agent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[2rem] border border-zinc-200 p-8 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-colors"
        >
          <div className="absolute top-0 end-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <HeadphonesIcon className="w-48 h-48" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="bg-purple-50 text-purple-600 w-12 h-12 rounded-xl flex items-center justify-center border border-purple-100 shadow-xs">
                <HeadphonesIcon className="w-6 h-6" />
              </div>
              {renderAgentStatus(configs.support)}
            </div>

            <h2 className="text-xl font-black text-zinc-900 mb-2">{t("Assistant Support Client")}</h2>
            <h3 className="text-sm font-bold text-purple-600 mb-4 tracking-wider rtl:tracking-normal uppercase">
              {t("Chatbot / Support Niveau 1")}
            </h3>

            <p className="text-zinc-500 text-sm leading-relaxed mb-8 min-h-[4rem]">
              {t(
                "Prend en charge les demandes fréquentes des clients (suivi de commande, politiques de retour) via le chatbot et ne redirige vers un humain qu'en cas de litige complexe."
              )}
            </p>

            <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider rtl:tracking-normal mb-1">
                  {t("Objectif")}
                </span>
                <span className="text-sm font-black text-zinc-800">{t("Assistance H24")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfigureClick("Support Patient")}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleAgent("support")}
                  disabled={loadingAgent === "support"}
                  className={`w-28 py-2.5 text-xs font-bold uppercase tracking-wider rtl:tracking-normal rounded-xl transition-colors shadow-sm flex items-center justify-center ${configs.support ? "bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200" : "bg-purple-600 text-white hover:bg-purple-700"}`}
                >
                  {loadingAgent === "support" ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                  ) : configs.support ? (
                    "Désactiver"
                  ) : (
                    "Activer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
