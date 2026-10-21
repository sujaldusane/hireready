import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import InterviewPrep from "../components/InterviewPrep";
import { STATUSES } from "../constants";
import useData from "../hooks/useData";
import { formatDate } from "../utils/format";

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { applications, resumes, loading, updateApplication, deleteApplication } = useData();
  const application = applications.find((a) => a.id === Number(id));

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
        <div className="empty-state">
          <h2>Application not found</h2>
          <p>It may have been deleted, or the link is incorrect.</p>
          <Link to="/applications">Go to applications</Link>
        </div>
      </div>
    );
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete your ${application.company} application? Its match scores, questions, and practice answers will be deleted too.`
    );
    if (confirmed && (await deleteApplication(application.id))) {
      navigate("/applications");
    }
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
        <div className="detail-actions">
          <label className="visually-hidden" htmlFor="detail-status">
            Status
          </label>
          <select
            id="detail-status"
            value={application.status}
            onChange={(e) => updateApplication(application.id, { status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn-ghost danger" onClick={handleDelete}>
            <Trash2 size={16} aria-hidden="true" />
            Delete
          </button>
        </div>
      </header>

      <section className="surface">
        <InterviewPrep
          key={application.id}
          application={application}
          resumes={resumes}
          onUpdate={updateApplication}
        />
      </section>
    </div>
  );
}