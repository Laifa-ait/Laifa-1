import { useState, useEffect, useCallback } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { FlashSaleDocument } from '../types';

interface Countdown {
  hours: string;
  minutes: string;
  seconds: string;
}

interface UseFlashSaleResult {
  flashSale: FlashSaleDocument | null;
  countdown: Countdown;
  isActive: boolean;
  isUpcoming: boolean;
  isExpired: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to manage Flash Sale business logic and SECURE countdown.
 * Secure: Time remaining is calculated from server 'endTime', not just local state.
 */
export function useFlashSale(): UseFlashSaleResult {
  const [flashSale, setFlashSale] = useState<FlashSaleDocument | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [countdown, setCountdown] = useState<Countdown>({ hours: '00', minutes: '00', seconds: '00' });
  const [status, setStatus] = useState({ isActive: false, isUpcoming: false, isExpired: false });

  // 1. Fetch Real-time Flash Sale Data
  useEffect(() => {
    const docRef = doc(db, 'ui_elements', 'active_flash_sale');
    
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as FlashSaleDocument;
        setFlashSale(data);
      } else {
        setFlashSale(null);
      }
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'ui_elements/active_flash_sale');
      setError(err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Countdown Logic (Runs every second)
  const calculateRemainingTime = useCallback(() => {
    if (!flashSale || !flashSale.endTime) return;

    const now = new Date();
    // Use Firestore timestamp or JS Date
    const end = flashSale.endTime.toDate ? flashSale.endTime.toDate() : new Date(flashSale.endTime);
    const start = flashSale.startTime.toDate ? flashSale.startTime.toDate() : new Date(flashSale.startTime);

    const timeDiffEnd = end.getTime() - now.getTime();
    const timeDiffStart = start.getTime() - now.getTime();

    // Update Statuses
    const isUpcoming = timeDiffStart > 0;
    const isExpired = timeDiffEnd <= 0;
    const isActive = !isUpcoming && !isExpired && flashSale.isActive;

    setStatus({ isActive, isUpcoming, isExpired });

    // Format Countdown
    if (isActive) {
      const h = Math.floor(timeDiffEnd / (1000 * 60 * 60));
      const m = Math.floor((timeDiffEnd % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((timeDiffEnd % (1000 * 60)) / 1000);

      setCountdown({
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0')
      });
    } else {
      setCountdown({ hours: '00', minutes: '00', seconds: '00' });
    }
  }, [flashSale]);

  useEffect(() => {
    const timer = setInterval(calculateRemainingTime, 1000);
    calculateRemainingTime(); // Initial run
    return () => clearInterval(timer);
  }, [calculateRemainingTime]);

  return { 
    flashSale, 
    countdown, 
    ...status,
    isLoading, 
    error 
  };
}
