import { Link, NavLink, Outlet, useNavigate, useParams } from "react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import EmptyState from "../components/EmptyState";
import StageTrack from "../components/application/StageTrack";
import useData from "../hooks/useData";
import useToast from "../hooks/useToast";
import { formatDate } from "../utils/format";

const TABS = [
  { to: ".", label: "Overview", end: true },
  { to: "match", label: "Resume match" },
  { to: "prep", label: "Interview prep" },
];

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { applications, loading, updateApplication, deleteApplication } = useData();
  const application = applications.find((a) => a.id === Number(id));

  async function handleStageChange(status) {
    const updated = await updateApplication(application.id, { status });
    if (updated) {
      showToast(status === "Rejected" ? "Marked as rejected" : `Moved to ${status}`);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete your ${application.company} application? Its match scores, questions, and practice answers will be deleted too.`
    );
    if (confirmed && (await deleteApplication(application.id))) {
      navigate("/applications");
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading application...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="page">
        <EmptyState
          title="Application not found"
          action={<Link to="/applications">Go to applications</Link>}
        >
          It may have been deleted, or the link is incorrect.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/applications" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Applications
      </Link>

      <header className="detail-header">
        <div>
          <h1>{application.company}</h1>
          <p className="page-subtitle">
            {application.role}, applied {formatDate(application.applied_date)}
          </p>
        </div>
        <button type="button" className="btn-ghost danger" onClick={handleDelete}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </header>

      <StageTrack status={application.status} onChange={handleStageChange} />

      <nav className="tabs" aria-label="Application sections">
        {TABS.map((tab) => (
          <NavLink key={tab.label} to={tab.to} end={tab.end} className="tab">
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet key={application.id} context={{ application }} />
    </div>
  );
}