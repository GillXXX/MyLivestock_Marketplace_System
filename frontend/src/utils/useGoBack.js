import { useNavigate } from "react-router-dom";

// Returns a handler for page "back" buttons: goes to the previous page in
// this tab's history (e.g. Profile → Settings → back lands on Profile),
// or to `fallbackPath` when there's nothing in-app to go back to.
// React Router stores its history position in `idx`; 0 means this was the
// first page opened in the tab (typed URL, refresh, opened from a link).
function useGoBack(fallbackPath) {
  const navigate = useNavigate();

  return () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}

export default useGoBack;
