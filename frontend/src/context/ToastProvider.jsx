import { useCallback, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { ToastContext } from "./contexts";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, tone = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span>{t.message}</span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}