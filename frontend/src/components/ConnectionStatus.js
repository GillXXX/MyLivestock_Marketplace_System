import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import "./ConnectionStatus.css";

const RESTORED_VISIBLE_MS = 4000;

// Facebook-style connection notice: stays up while the device is offline,
// then briefly says the connection is back. Mounted once in App, so it
// shows on every page.
function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const restoredTimer = useRef(null);

  useEffect(() => {
    const handleOffline = () => {
      clearTimeout(restoredTimer.current);
      setShowRestored(false);
      setOnline(false);
    };

    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      clearTimeout(restoredTimer.current);
      restoredTimer.current = setTimeout(() => setShowRestored(false), RESTORED_VISIBLE_MS);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(restoredTimer.current);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      className={`connection-status ${online ? "restored" : "offline"}`}
      role="status"
      aria-live="polite"
    >
      <span className="connection-status-icon">
        {online ? <Wifi size={18} /> : <WifiOff size={18} />}
      </span>

      <span className="connection-status-text">
        {online
          ? "Your internet connection was restored."
          : "You are currently offline. Some features won't work until you reconnect."}
      </span>

      {online && (
        <>
          <button type="button" className="connection-status-action" onClick={() => window.location.reload()}>
            Refresh
          </button>
          <button
            type="button"
            className="connection-status-close"
            aria-label="Dismiss"
            onClick={() => setShowRestored(false)}
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;
