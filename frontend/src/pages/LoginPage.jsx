import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordField from "../components/auth/PasswordField";
import useAuth from "../hooks/useAuth";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function LoginPage() {
  useDocumentTitle("Sign in");
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (status === "authenticated") return <Navigate to={destination} replace />;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Pick up where you left off in your search."
      footer={
        <>
          New to HireReady?{" "}
          <Link to="/register" state={location.state}>
            Create an account
          </Link>
        </>
      }
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}