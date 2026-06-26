import React, { useState, useEffect } from "react";
import { Tag, Plus, AlertCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import toast from "react-hot-toast";
import { Coupon, CouponCard } from "../../components/Admin/CouponCard";
import { CouponModal } from "../../components/Admin/CouponModal";

export const PromotionsAdmin: React.FC = () => {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Subscriptions to Coupons
  useEffect(() => {
    const q = query(collection(db, "coupons"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const couponsData: Coupon[] = [];
        snapshot.forEach((doc) => {
          couponsData.push({ id: doc.id, ...doc.data() } as Coupon);
        });
        setCoupons(couponsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching coupons:", err);
        setError(t("Erreur de chargement des coupons"));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [t]);

  // Subscription to Sellers list
  useEffect(() => {
    const sellersQuery = query(collection(db, "users"), where("role", "==", "seller"));
    const unsubscribe = onSnapshot(
      sellersQuery,
      (snapshot) => {
        const list: { id: string; name: string }[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.storeName || data.displayName || data.email || doc.id,
          });
        });
        setSellersList(list);
      },
      (err) => {
        console.error("Error fetching sellers for admin promotions page:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleStatus = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, "coupons", coupon.id), {
        isActive: !coupon.isActive,
      });
      toast.success(
        coupon.isActive
          ? t("Coupon désactivé avec succès !")
          : t("Coupon activé avec succès !")
      );
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(t("Erreur lors de la mise à jour du statut."));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("Êtes-vous sûr de vouloir supprimer ce coupon ?"))) {
      try {
        await deleteDoc(doc(db, "coupons", id));
        toast.success(t("Coupon supprimé avec succès !"));
      } catch (err) {
        console.error("Error deleting coupon:", err);
        toast.error(t("Erreur lors de la suppression."));
      }
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header section with clean premium typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-kinder tracking-tight rtl:tracking-normal text-zinc-950 uppercase">
            {t("Codes Promo & Campagnes")}
          </h2>
          <p className="text-zinc-500 font-medium text-sm mt-1">
            {t("Gérez les réductions globales d'OLMART, les coupons spécifiques vendeurs et les limites d'utilisation.")}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-zinc-950 text-white rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-95 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> {t("Créer un Coupon")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Clock className="w-8 h-8 text-zinc-400 animate-spin" />
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
            {t("Chargement des coupons d'OLMART...")}
          </p>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm overflow-hidden p-16 text-center text-zinc-500 max-w-xl mx-auto">
          <Tag className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-kinder text-zinc-900 mb-2">{t("Aucun code promo créé")}</h3>
          <p className="text-sm font-medium text-zinc-500">
            {t("Créez votre première campagne promotionnelle pour stimuler l'activité de la marketplace.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              toggleStatus={toggleStatus}
              handleDelete={handleDelete}
              sellersList={sellersList}
            />
          ))}
        </div>
      )}

      {/* Coupon Modal component */}
      <CouponModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        existingCoupons={coupons}
      />
    </div>
  );
};
