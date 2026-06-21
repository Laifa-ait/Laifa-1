import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  type: 'react_boundary' | 'unhandled_promise' | 'window_error';
  url: string;
  userAgent: string;
  timestamp: any;
}

const sendErrorToAgent = async (errorInfo: Omit<ErrorInfo, 'timestamp' | 'url' | 'userAgent'>) => {
  try {
    const isDevOrPreview = 
      window.location.hostname.includes('localhost') || 
      window.location.hostname.includes('127.0.0.1') || 
      window.location.hostname.includes('-dev-') || 
      window.location.hostname.includes('-pre-') || 
      window.location.hostname.includes('.run.app') ||
      (import.meta as any).env?.DEV;

    // Optional: Avoid spamming database with dev errors
    // if (isDevOrPreview) {
    //   console.log('[ErrorAgent Detached in Dev/Preview]:', errorInfo);
    //   return;
    // }

    await addDoc(collection(db, 'site_errors'), {
      ...errorInfo,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      resolved: false,
    });
    console.log('[ErrorAgent] Erreur reportée avec succès.');
  } catch (err) {
    console.error('[ErrorAgent] Impossible de reporter l\'erreur :', err);
  }
};

export const setupErrorAgent = () => {
  window.addEventListener('error', (event) => {
    sendErrorToAgent({
      message: event.message,
      stack: event.error?.stack,
      type: 'window_error'
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendErrorToAgent({
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      type: 'unhandled_promise'
    });
  });
};

export const logReactErrorBoundary = (error: Error, info: { componentStack?: string | null }) => {
  sendErrorToAgent({
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack || undefined,
    type: 'react_boundary'
  });
};
