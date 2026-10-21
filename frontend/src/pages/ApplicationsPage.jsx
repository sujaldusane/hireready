import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, Search } from "lucide-react";
import AddApplicationDialog from "../components/AddApplicationDialog";
import StatusBadge from "../components/StatusBadge";
import { STATUSES } from "../constants";
import useData from "../hooks/useData";
import { formatDate } from "../utils/format";

const FILTERS = ["All", ...STATUSES];

function ListSkeleton() {
  return (
    <div className="app-table" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-bar wide" />
          <div className="skeleton-bar narrow" />
        </div>
      ))}
    </div>
  );
}

export default function ApplicationsPage() {
  const { applications, resumes, loading } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const result = { All: applications.length };
    STATUSES.forEach((s) => {
      result[s] = applications.filter((a) => a.status === s).length;
    });
    return result;
  }, [applications]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter(
      (a) =>
        (status === "All" || a.status === status) &&
        (!q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
    );
  }, [applications, query, status]);

  const resumeLabel = (id) => resumes.find((r) => r.id === id)?.label;

  function clearFilters() {
    setQuery("");
    setStatus("All");
  }

  function renderContent() {
    if (loading) return <ListSkeleton />;

    if (applications.length === 0) {
      return (
        <div className="empty-state">
          <h2>No applications yet</h2>
          <p>
            Add the first job you've applied to. Paste its description, and HireReady can score
            your resume against it and generate interview questions.
          </p>
          <button type="button" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Add application
          </button>
        </div>
      );
    }

    if (visible.length === 0) {
      return (
        <p className="empty-inline">
          No applications match these filters.
          <button type="button" className="btn-link" onClick={clearFilters}>
            Clear filters
          </button>
        </p>
      );
    }

    return (
      <ul className="app-table">
        {visible.map((a) => {
          const label = resumeLabel(a.resume_id);
          return (
            <li key={a.id}>
              <Link to={`/applications/${a.id}`} className="app-line">
                <span className="app-line-main">
                  <span className="app-company">{a.company}</span>
                  <span className="app-role">{a.role}</span>
                </span>
                <span className="app-line-meta">
                  {label && <span className="app-resume">{label}</span>}
                  <span className="app-date">{formatDate(a.applied_date)}</span>
                  <StatusBadge status={a.status} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Applications</h1>
          <p className="page-subtitle">
            {counts.All === 0
              ? "Track every job you apply to in one place."
              : `${counts.All} tracked`}
          </p>
        </div>
        {applications.length > 0 && (
          <button type="button" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Add application
          </button>
        )}
      </header>

      {applications.length > 0 && (
        <div className="toolbar">
          <label className="search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Search applications</span>
            <input
              type="search"
              placeholder="Search by company or role"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="segmented" aria-label="Filter by status">
            {FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                className={status === s ? "is-active" : ""}
                onClick={() => setStatus(s)}
              >
                {s}
                <span className="count">{counts[s]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {renderContent()}

      {adding && <AddApplicationDialog onClose={() => setAdding(false)} />}
    </div>
  );
}