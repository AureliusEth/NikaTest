'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getToastStyles = () => {
    const baseStyles = {
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      minWidth: '300px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out',
    };

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'error':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'warning':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
      case 'info':
      default:
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        };
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div style={getToastStyles()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{getIcon()}</span>
        <span style={{ fontSize: '14px', lineHeight: '1.5' }}>{toast.message}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '18px',
          lineHeight: '1',
          fontWeight: 'bold',
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
      >
        ×
      </button>
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

