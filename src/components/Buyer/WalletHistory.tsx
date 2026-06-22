import React, { useState, useEffect } from "react";
import { Wallet, ArrowDownRight, ArrowUpRight, Clock, PlusCircle } from "lucide-react";
import { formatPrice } from "../../utils/format";
import { useTranslation } from "react-i18next";

export const WalletHistory: React.FC<{ currentUser: any; userProfile: any }> = ({ currentUser, userProfile }) => {
  const { t } = useTranslation();
  // Simulated transactions (would normally be fetched from a 'wallet_transactions' collection)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching
    const timer = setTimeout(() => {
      setTransactions([
        {
          id: "1",
          type: "refund",
          amount: 5000,
          date: new Date(),
          description: t("Remboursement commande #12345"),
          status: "completed",
        },
        {
          id: "2",
          type: "bonus",
          amount: 500,
          isPoints: true,
          date: new Date(Date.now() - 86400000),
          description: t("Bonus de bienvenue"),
          status: "completed",
        },
        {
          id: "3",
          type: "purchase",
          amount: -2000,
          date: new Date(Date.now() - 172800000),
          description: t("Utilisation lors de l'achat #124"),
          status: "completed",
        },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-[#121315] mb-1">
          {t("dashboard.wallet.history.title", "Historique du Wallet")}
        </h2>
        <p className="text-zinc-500 font-medium text-sm">
          {t("dashboard.wallet.history.desc", "Consultez l'historique de vos fonds et points de fidélité.")}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-tr from-[#121315] to-[#402d21] rounded-3xl p-6 shadow-md text-white relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mt-10 -me-10 mix-blend-overlay pointer-events-none" />
          <p className="text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-[#EBE5DF]/60 mb-2">
            {t("dashboard.wallet.current_balance", "Solde Actuel")}
          </p>
          <h3 className="text-3xl font-black tracking-tight rtl:tracking-normal">
            {formatPrice(userProfile?.walletBalance || 0)}
          </h3>
        </div>
        <div className="bg-gradient-to-tr from-orange-50 to-amber-50 border border-orange-100 rounded-3xl p-6 shadow-sm text-[#121315] relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-orange-400/10 rounded-full blur-2xl -mt-10 -me-10 pointer-events-none" />
          <p className="text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal text-orange-600/60 mb-2">
            {t("dashboard.wallet.loyalty_points", "Points de Fidélité")}
          </p>
          <h3 className="text-3xl font-black tracking-tight rtl:tracking-normal text-[#F37021]">
            {userProfile?.cashbackBalance || 0} {t("pts", "pts")}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <h3 className="font-bold text-[#121315] flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            {t("dashboard.wallet.recent_transactions", "Transactions Récentes")}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-200 rounded-xl" />
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-zinc-200 rounded" />
                    <div className="w-24 h-3 bg-zinc-100 rounded" />
                  </div>
                </div>
                <div className="w-20 h-5 bg-zinc-200 rounded" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="font-black text-lg text-[#121315] mb-1">
              {t("dashboard.wallet.no_transactions", "Aucune transaction")}
            </p>
            <p className="text-zinc-500 text-sm">
              {t("dashboard.wallet.empty_history", "Votre historique de portefeuille est vide.")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {tx.amount > 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#121315]">{tx.description}</p>
                    <p className="text-xs rtl:text-sm font-medium text-zinc-400 mt-0.5">
                      {tx.date.toLocaleDateString()} •{" "}
                      {tx.type === "refund"
                        ? t("wallet.type.refund", "Remboursement")
                        : tx.type === "bonus"
                          ? t("wallet.type.bonus", "Cadeau")
                          : t("wallet.type.payment", "Paiement")}
                    </p>
                  </div>
                </div>
                <div
                  className={`font-black tracking-tight rtl:tracking-normal ${
                    tx.amount > 0 ? "text-emerald-600" : "text-[#121315]"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.isPoints ? `${tx.amount} ${t("pts", "pts")}` : formatPrice(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
