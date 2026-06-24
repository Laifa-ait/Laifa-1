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

const sanitizeErrorInfo = (info: Omit<ErrorInfo, 'timestamp' | 'url' | 'userAgent'>) => {
  const scrubText = (text: string | undefined): string => {
    if (!text) return "";
    // Scrub workspace root structures, node_modules, complex paths, and sensitive files
    return text
      .replace(/(?:\/[^\/\s]+)*\/src\/[^\s\)]+/g, '[internal_code]')
      .replace(/(?:http|https):\/\/[^\s\)]+/gi, '[origin_source]')
      .replace(/at\s+([a-zA-Z0-9_$]+)\s+\([^\)]+\)/g, 'at $1([internal])')
      .trim();
  };

  return {
    ...info,
    message: info.message ? info.message.replace(/(?:\/[^\/\s]+)*\/src\/[^\s]+/g, '[path]') : '',
    stack: scrubText(info.stack),
    componentStack: scrubText(info.componentStack),
  };
};

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
    //   (process.env.NODE_ENV === 'debug' ? console.log : function(){})('[ErrorAgent Detached in Dev/Preview]:', errorInfo);
    //   return;
    // }

    const sanitized = sanitizeErrorInfo(errorInfo);

    await addDoc(collection(db, 'site_errors'), {
      ...sanitized,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: serverTimestamp(),
      resolved: false,
    });
    (process.env.NODE_ENV === 'debug' ? console.log : function(){})('[ErrorAgent] Erreur reportée avec succès.');
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
