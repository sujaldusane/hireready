import { Navigate, useLocation } from "react-router";
import useAuth from "../hooks/useAuth";

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="auth-loading" aria-live="polite">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          HireReady
        </span>
        <span className="visually-hidden">Loading your account</span>
      </div>
    );
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}