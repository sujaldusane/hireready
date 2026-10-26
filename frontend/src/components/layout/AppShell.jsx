import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Briefcase, FileText, LayoutDashboard, LogOut } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import useData from "../../hooks/useData";
import useToast from "../../hooks/useToast";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/resumes", label: "Resumes", icon: FileText },
];

function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true" />
      HireReady
    </span>
  );
}

// Scroll to the top when moving to a different page, but not when switching tabs within one.
function useScrollToTopOnPageChange() {
  const { pathname } = useLocation();
  const page = pathname.split("/").slice(0, 3).join("/");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
}

export default function AppShell() {
  const { loadError } = useData();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  useScrollToTopOnPageChange();

  async function handleSignOut() {
    await signOut();
    showToast("Signed out");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main">
          <ul>
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className="nav-link">
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="account">
          <div className="account-info">
            <span className="account-name">{user?.name || "Your account"}</span>
            <span className="account-email">{user?.email}</span>
          </div>
          <button type="button" className="btn-ghost" onClick={handleSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <Brand />
        <button type="button" className="icon-btn" onClick={handleSignOut} aria-label="Sign out">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </header>

      <main className="main">
        {loadError && (
          <p className="load-error">
            Couldn't reach the HireReady server. Check that the backend is running, then refresh
            the page.
          </p>
        )}
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="tab-link">
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}