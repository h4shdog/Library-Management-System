// ============================================================
// COMPONENT: Shared — Toast notification
// Usage: const { toast, ToastContainer } = useToast()
//        toast.success('Book added successfully')
//        toast.error('Something went wrong')
// ============================================================
'use client';

import { useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
  error:   <XCircle     size={16} className="text-red-500    shrink-0" />,
  info:    <AlertCircle size={16} className="text-blue-500   shrink-0" />,
};

const STYLES = {
  success: 'border-emerald-100 bg-white',
  error:   'border-red-100    bg-white',
  info:    'border-blue-100   bg-white',
};

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
  }, []);

  const show = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    info:    (msg) => show(msg, 'info'),
  };

  const ToastContainer = () => (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg shadow-slate-200/60 min-w-[260px] max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-200 ${STYLES[t.type]}`}
        >
          {ICONS[t.type]}
          <span className="text-sm font-semibold text-slate-800 flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );

  return { toast, ToastContainer };
}
