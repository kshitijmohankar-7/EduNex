import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const toast = useCallback((message, type = 'info', duration = 3200) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);
  const value = useMemo(() => ({ toast, success: (m) => toast(m, 'success'), error: (m) => toast(m, 'error'), info: (m) => toast(m, 'info'), remove }), [toast, remove]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((item) => <div className={`toast toast-${item.type}`} key={item.id}><span>{item.type === 'success' ? '✓' : item.type === 'error' ? '!' : 'i'}</span><strong>{item.message}</strong><button type="button" onClick={() => remove(item.id)} aria-label="Dismiss notification">×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
