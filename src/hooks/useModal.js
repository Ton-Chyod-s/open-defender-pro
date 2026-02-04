import { useState, useCallback } from 'react';

export function useModal() {
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const showAlert = useCallback((title, message, type = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertModal({ isOpen: false, title: '', message: '', type: 'info' });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
  }, []);

  return {
    alertModal,
    confirmModal,
    showAlert,
    closeAlert,
    showConfirm,
    closeConfirm
  };
}

export default useModal;
