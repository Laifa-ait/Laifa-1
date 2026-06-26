import React from "react";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ReviewsProps {
  comments: any[];
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
  userCanReview,
  submittingReview,
  newReviewText,
  setNewReviewText,
  newReviewStars,
  setNewReviewStars,
  onSubmit,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-12 pt-8 border-t border-black/10">
      <h3 className="text-sm font-sans font-medium uppercase tracking-widest text-black mb-8">{t("product.reviews_title") || "Avis Clients"}</h3>
      {comments.length === 0 ? (
        <p className="text-black/60 font-light text-sm">{t("product.reviews_none") || "Aucun avis pour le moment."}</p>
      ) : (
        <div className="space-y-6">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-black/5 pb-4">
              <p className="font-sans font-medium text-black text-sm">{c.name}</p>
              <div className="flex text-black my-1">
                {[...Array(c.stars)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
              <p className="text-black/80 font-light text-sm mt-1">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
