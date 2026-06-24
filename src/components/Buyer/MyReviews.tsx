import React, { useState, useEffect } from "react";
import { Star, MessageSquareDashed, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const MyReviews: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Simulated fetch
    const timer = setTimeout(() => {
      setPendingReviews([
        {
          id: "1",
          productName: "T-Shirt Oversize Vintage",
          image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200",
          orderId: "ORD-123",
          date: new Date(),
        },
      ]);
      setReviews([]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-kinder text-[#3C2B22] mb-1">{t("dashboard.reviews.title", "Mes Évaluations")}</h2>
        <p className="text-zinc-500 font-medium text-sm">
          {t("dashboard.reviews.subtitle", "Gérez vos avis et aidez la communauté à mieux choisir.")}
        </p>
      </header>

      {/* Pending Reviews Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="font-kinder text-indigo-950">
              {t("dashboard.reviews.pending", "Avis en attente (")}
              {pendingReviews.length})
            </h3>
            <p className="text-xs rtl:text-sm text-indigo-700/70 font-medium">
              {t("dashboard.reviews.earn_points", "Évaluez ces produits et gagnez des points de fidélité !")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-20 animate-pulse bg-white/50 rounded-xl" />
        ) : pendingReviews.length === 0 ? (
          <p className="text-sm text-indigo-800/60 font-medium p-4 bg-white/40 rounded-xl text-center">
            {t("dashboard.reviews.no_pending", "Aucun produit en attente d'évaluation.")}
          </p>
        ) : (
          <div className="space-y-3">
            {pendingReviews.map((item) => {
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-indigo-50 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <img
                      loading="lazy"
                      src={item.image}
                      alt={item.productName}
                      className="w-14 h-14 object-cover rounded-xl border border-zinc-100"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-[#3C2B22] line-clamp-1">{item.productName}</h4>
                      <p className="text-[10px] rtl:text-[12px] uppercase font-bold text-zinc-400 tracking-wider rtl:tracking-normal mt-1">
                        {t("dashboard.reviews.purchased_on", "Acheté le")}
                        {item.date.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/product/${item.id}?review=true`)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rtl:text-[12px] uppercase tracking-widest rtl:tracking-normal rounded-xl transition-colors shrink-0"
                  >
                    {t("dashboard.reviews.leave_review", "Laisser un avis")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Published Reviews */}
      <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 bg-zinc-50/50">
          <h3 className="font-bold text-[#3C2B22] flex items-center gap-2">
            <MessageSquareDashed className="w-5 h-5 text-zinc-400" />
            {t("dashboard.reviews.history", "Historique de mes avis")}
          </h3>
        </div>

        {loading ? (
          <div className="p-8">
            <div className="h-10 animate-pulse bg-zinc-100 rounded" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <Star className="w-12 h-12 text-zinc-200 mb-4" />
            <p className="font-bold text-[#3C2B22] mb-1">{t("dashboard.reviews.no_published", "Aucun avis publié")}</p>
            <p className="text-zinc-500 text-sm max-w-sm">
              {t(
                "dashboard.reviews.share_experience",
                "Partagez votre expérience d'achat et aidez la communauté à faire les bons choix."
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">{/* Map published reviews */}</div>
        )}
      </div>
    </div>
  );
};
