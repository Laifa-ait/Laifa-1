import React, { useState, useCallback } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface ConfirmPromise {
  resolve: (value: boolean) => void;
}

export const useConfirm = () => {
  const [modalState, setModalState] = useState<{ isOpen: boolean; message: string; title: string, resolve: ConfirmPromise['resolve'] | null }>({
    isOpen: false,
    message: '',
    title: '',
    resolve: null,
  });

  const confirm = useCallback((message: string, title: string = 'Confirmation') => {
    return new Promise<boolean>((resolve) => {
      setModalState({
        isOpen: true,
        message,
        title,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(true);
      setModalState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }
  }, [modalState]);

  const handleCancel = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(false);
      setModalState(prev => ({ ...prev, isOpen: false, resolve: null }));
    }
  }, [modalState]);

  const ConfirmationDialog = useCallback(() => (
    <ConfirmModal
      isOpen={modalState.isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={modalState.title}
      message={modalState.message}
    />
  ), [modalState.isOpen, modalState.message, modalState.title, handleConfirm, handleCancel]);

  return { confirm, ConfirmationDialog };
};
