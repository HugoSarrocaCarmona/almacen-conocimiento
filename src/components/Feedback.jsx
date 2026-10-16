import { useEffect, useRef } from 'react';

// Aviso breve en la parte inferior («Guardado», «Eliminado · Deshacer»).
export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const ms = toast.action ? 6000 : toast.tone === 'error' ? 6000 : 3000;
    const timer = setTimeout(onClose, ms);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toast && (
        <div key={toast.id} className={`toast toast--${toast.tone ?? 'ok'}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.action.onClick();
                onClose();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Diálogo de confirmación propio (más claro que window.confirm en el móvil).
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Cancelar', danger = false, onConfirm, onCancel }) {
  const confirmRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="overlay overlay--center" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog__title">{title}</h2>
        {message && <p id="dialog-message" className="dialog__message">{message}</p>}
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
