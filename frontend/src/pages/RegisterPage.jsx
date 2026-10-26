import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { getAuthSettings } from "../api";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordField from "../components/auth/PasswordField";
import useAuth from "../hooks/useAuth";
import useDocumentTitle from "../hooks/useDocumentTitle";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  useDocumentTitle("Create an account");
  const { status, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", invite_code: "" });
  const [inviteRequired, setInviteRequired] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAuthSettings()
      .then((settings) => setInviteRequired(settings.invite_required))
      .catch(() => {});
  }, []);

  const destination = location.state?.from?.pathname || "/";
  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        name: form.name.trim(),
        email: form.email,
        password: form.password,
        ...(inviteRequired ? { invite_code: form.invite_code.trim() } : {}),
      });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (status === "authenticated") return <Navigate to={destination} replace />;

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Track your applications and prepare for every interview."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state}>
            Sign in
          </Link>
        </>
      }
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>
            Name <em className="optional">optional</em>
          </span>
          <input autoComplete="name" autoFocus value={form.name} onChange={update("name")} />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={update("email")}
          />
        </label>
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          value={form.password}
          onChange={update("password")}
        />
        {inviteRequired && (
          <label className="field">
            <span>Invite code</span>
            <input required value={form.invite_code} onChange={update("invite_code")} />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}