import React from 'react';
import { useTranslation } from 'react-i18next';
import { CART_RESERVATION_MINUTES } from '../../constants/ui';

export const CartItemTimer: React.FC<{ addedAt?: number }> = ({ addedAt }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

  React.useEffect(() => {
    if (!addedAt) return;
    const calculateTimeLeft = () => {
      const diff = (addedAt + CART_RESERVATION_MINUTES * 60 * 1000) - Date.now();
      return Math.max(0, diff);
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const rem = calculateTimeLeft();
      setTimeLeft(rem);
      if (rem <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [addedAt]);

  if (!addedAt) return null;

  const totalSeconds = Math.floor(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (totalSeconds <= 0) {
    return (
      <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-kinder px-2.5 py-1 rounded-lg">
        ⏱️ {t("reservation_expired") || "Réservation expirée"}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-lg ${
      totalSeconds < 180 
        ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
        : "bg-orange-50 text-orange-600 border border-orange-200"
    }`}>
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-ping" />
      {t("exclusivity_reserved") || "Exclusivité réservée :"} {formattedTime}
    </span>
  );
};
