
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
    id: string;
    message: string;
    icon?: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, icon?: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, icon?: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now().toString();
        const newToast: Toast = { id, message, icon, type, duration: 2500 };

        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, newToast.duration);
    }, []);

    const getIconColor = (type?: string) => {
        switch (type) {
            case 'success': return 'text-green-400';
            case 'error': return 'text-red-400';
            default: return 'text-primary';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-32 left-0 right-0 z-[500] flex flex-col items-center gap-2 pointer-events-none px-4">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className="bg-white/95 text-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up pointer-events-auto max-w-[90%]"
                        style={{
                            animationDelay: `${index * 50}ms`,
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        {toast.icon && (
                            <span className={`material-symbols-outlined text-xl ${getIconColor(toast.type)} fill-1`}>
                                {toast.icon}
                            </span>
                        )}
                        <span className="text-sm font-semibold truncate">{toast.message}</span>
                    </div>
                ))}
            </div>

            <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
