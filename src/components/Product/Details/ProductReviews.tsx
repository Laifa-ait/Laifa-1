import React, { useMemo } from "react";
import { Star, ThumbsUp, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ReviewsProps {
  comments: any[];
  stats?: {
    reviewCount: number;
    averageRating: number;
    totalRatingSum: number;
  };
  userCanReview: boolean;
  submittingReview: boolean;
  newReviewText: string;
  setNewReviewText: (text: string) => void;
  newReviewStars: number;
  setNewReviewStars: (stars: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProductReviews: React.FC<ReviewsProps> = ({
  comments,
  stats,
  userCanReview,
  submittingReview,
  newReviewText,
  setNewReviewText,
  newReviewStars,
  setNewReviewStars,
  onSubmit,
}) => {
  const { t } = useTranslation();

  const [filterStar, setFilterStar] = React.useState<number | null>(null);

  // Aggregate stats or calculate from comments if missing
  const aggregatedStats = useMemo(() => {
    if (stats && stats.reviewCount > 0) {
      return {
        average: stats.averageRating,
        count: stats.reviewCount,
      };
    }
    if (comments.length > 0) {
      const sum = comments.reduce((acc, c) => acc + c.stars, 0);
      return {
        average: sum / comments.length,
        count: comments.length,
      };
    }
    return { average: 0, count: 0 };
  }, [stats, comments]);

  const starDistribution = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    comments.forEach(c => {
       const s = Math.round(c.stars);
       if (s >= 1 && s <= 5) {
          dist[s as keyof typeof dist]++;
       }
    });
    return dist;
  }, [comments]);

  const filteredComments = useMemo(() => {
    if (!filterStar) return comments;
    return comments.filter(c => Math.round(c.stars) === filterStar);
  }, [comments, filterStar]);

  const renderStars = (rating: number, size = "w-4 h-4") => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating ? "fill-[#FFB800] text-[#FFB800]" : "fill-gray-200 text-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  const getMaskedName = (name: string) => {
    if (!name) return "A***m";
    if (name.length <= 2) return name + "***";
    return name.charAt(0) + "***" + name.charAt(name.length - 1);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return format(date, "dd MMM yyyy", { locale: fr });
    } catch {
      return "";
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-sans font-bold text-gray-900 mb-6">
        {t("product.reviews_title") || "Avis Clients"} {aggregatedStats.count > 0 && `(${aggregatedStats.count})`}
      </h2>

      {aggregatedStats.count > 0 ? (
        <>
          <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl mb-8">
            <div className="flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">{aggregatedStats.average.toFixed(1)}</span>
              <div className="mt-2 mb-1">{renderStars(Math.round(aggregatedStats.average), "w-5 h-5")}</div>
            </div>
            
            <div className="w-px h-16 bg-gray-200 mx-4 hidden sm:block"></div>
            
            <div className="flex-1 hidden sm:flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = starDistribution[star as keyof typeof starDistribution];
                const percent = aggregatedStats.count > 0 ? Math.round((count / aggregatedStats.count) * 100) : 0;
                const isSelected = filterStar === star;
                
                return (
                  <div 
                    key={star} 
                    onClick={() => setFilterStar(isSelected ? null : star)}
                    className={`flex items-center gap-2 text-sm cursor-pointer transition-colors ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    <div className="w-12 flex items-center justify-end gap-1">
                      <span>{star}</span>
                      <Star className={`w-3 h-3 ${isSelected ? 'fill-[#FFB800] text-[#FFB800]' : 'fill-gray-400 text-gray-400'}`} />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${isSelected ? 'bg-[#FFB800]' : 'bg-gray-400'}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="w-8 text-right">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
             {filterStar && (
                <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-full font-medium">
                   Filtré par: {filterStar} Étoiles
                   <button onClick={() => setFilterStar(null)} className="hover:text-red-500 font-bold ml-1">×</button>
                </div>
             )}
          </div>

          <div className="space-y-6">
            {filteredComments.length === 0 && filterStar ? (
               <div className="text-center py-8 text-gray-500">Aucun avis de {filterStar} étoiles trouvé.</div>
            ) : filteredComments.map((c) => (
              <div key={c.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                      {c.name ? c.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {getMaskedName(c.name)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>DZ</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span>{formatDate(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-3">
                  {renderStars(c.stars)}
                </div>
                
                <p className="text-gray-800 text-sm leading-relaxed mb-4">{c.text}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                  <button className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Utile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">{t("product.reviews_none") || "Aucun avis pour le moment."}</p>
          <p className="text-sm text-gray-400 mt-1">Soyez le premier à donner votre avis après l'achat !</p>
        </div>
      )}

      {userCanReview && (
        <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">{t("product.write_review") || "Donnez votre avis"}</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("product.your_rating") || "Votre note"}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReviewStars(star)}
                    className="focus:outline-none hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= newReviewStars ? "fill-[#FFB800] text-[#FFB800]" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t("product.your_comment") || "Votre commentaire"}</label>
              <textarea
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFB800]/50 focus:border-[#FFB800] resize-none"
                placeholder={t("product.review_placeholder") || "Qu'avez-vous pensé de cet article ?"}
              />
            </div>
            <button
              type="submit"
              disabled={submittingReview}
              className="w-full sm:w-auto px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submittingReview ? t("common.submitting") || "Envoi en cours..." : t("product.submit_review") || "Publier l'avis"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

