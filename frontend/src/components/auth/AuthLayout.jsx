export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          HireReady
        </span>
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children}
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </main>
  );
}