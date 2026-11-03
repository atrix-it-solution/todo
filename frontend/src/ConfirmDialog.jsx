import { useEffect, useRef } from "react";
import { TrashIcon } from "./icons.jsx";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-icon">
          <TrashIcon size={22} />
        </div>
        <h2 id="dialog-title">{title}</h2>
        <p id="dialog-msg">{message}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
