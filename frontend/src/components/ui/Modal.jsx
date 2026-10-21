import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    dialog.querySelector("[data-autofocus]")?.focus();
    return () => dialog.close();
  }, []);

  function handleCancel(e) {
    e.preventDefault();
    onClose();
  }

  function handleBackdropClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}