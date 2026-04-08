import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  showToast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), 3500);
      timerRefs.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs animate-fade-in ${
                toast.type === "error"
                  ? "bg-red-900 text-red-100 border border-red-700"
                  : toast.type === "success"
                  ? "bg-green-900 text-green-100 border border-green-700"
                  : "bg-neutral-800 text-white border border-neutral-700"
              }`}
            >
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => dismiss(toast.id)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
