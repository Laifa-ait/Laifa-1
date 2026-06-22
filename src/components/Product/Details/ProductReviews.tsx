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
    <div className="bg-white rounded-[2.5rem] p-8 mt-12 border border-zinc-100 shadow-sm">
      <h3 className="text-xl font-black text-[#121315] mb-8">{t("product.reviews_title") || "Avis Clients"}</h3>
      {comments.length === 0 ? (
        <p className="text-zinc-400">{t("product.reviews_none") || "Aucun avis pour le moment."}</p>
      ) : (
        <div className="space-y-6">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-zinc-100 pb-4">
              <p className="font-black text-sm">{c.name}</p>
              <div className="flex text-orange-400">
                {[...Array(c.stars)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
              <p className="text-zinc-600 mt-1">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
