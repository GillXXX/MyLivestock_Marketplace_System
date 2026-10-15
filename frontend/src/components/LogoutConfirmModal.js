import { useEffect } from "react";
import { LogOut } from "lucide-react";
import "./LogoutConfirmModal.css";

// "Are you sure?" before signing out, so a stray tap on Logout (easy on a
// phone's slide-out menu) doesn't throw the person out mid-task.
function LogoutConfirmModal({ open, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKey = (e) => {
      if (e.key === "Escape") onCancel();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="logout-confirm-overlay" onClick={onCancel}>
      <div
        className="logout-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="logout-confirm-icon">
          <LogOut size={22} />
        </div>
        <h3 id="logout-confirm-title">Log out?</h3>
        <p>Are you sure you want to log out of your account?</p>

        <div className="logout-confirm-actions">
          <button type="button" className="logout-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="logout-confirm-ok" onClick={onConfirm} autoFocus>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirmModal;
