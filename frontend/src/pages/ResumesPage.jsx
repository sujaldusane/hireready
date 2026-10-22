import { FileText } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ResumeUpload from "../components/ResumeUpload";
import useData from "../hooks/useData";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useInsights from "../hooks/useInsights";
import { formatDate } from "../utils/format";

function plural(count, word) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

export default function ResumesPage() {
  useDocumentTitle("Resumes");
  const { resumes, applications, loading, uploadResume, deleteResume } = useData();
  const { insights, refresh } = useInsights();

  const statsById = Object.fromEntries(insights.resumes.map((r) => [r.id, r]));
  const usage = (resumeId) => applications.filter((a) => a.resume_id === resumeId).length;

  const analyzed = insights.resumes.filter((r) => r.analyzed_count > 0);
  const bestId =
    analyzed.length >= 2
      ? [...analyzed].sort((a, b) => b.average_match_score - a.average_match_score)[0].id
      : null;

  async function handleUpload(label, file) {
    const created = await uploadResume(label, file);
    if (created) refresh();
    return created;
  }

  async function handleDelete(resume) {
    const used = usage(resume.id);
    const linkedNote = used
      ? ` It's linked to ${plural(used, "application")}, which will be unlinked.`
      : "";
    const confirmed = window.confirm(
      `Remove "${resume.label}"?${linkedNote} Its match scores will be deleted.`
    );
    if (confirmed && (await deleteResume(resume.id))) refresh();
  }

  function renderList() {
    if (loading) return null;

    if (resumes.length === 0) {
      return (
        <EmptyState title="No resumes yet">
          Upload the resume versions you send out. HireReady scores each one against your job
          descriptions, so you can send the best fit.
        </EmptyState>
      );
    }

    return (
      <ul className="resume-table">
        {resumes.map((r) => {
          const stats = statsById[r.id];
          const used = usage(r.id);
          return (
            <li key={r.id} className="resume-line">
              <span className="resume-icon" aria-hidden="true">
                <FileText size={18} />
              </span>
              <div>
                <p className="resume-title">
                  {r.label}
                  {r.id === bestId && <span className="badge badge-offer">Best average match</span>}
                </p>
                <p className="resume-meta">
                  {r.filename}, {r.word_count} words, uploaded {formatDate(r.created_at)}
                </p>
              </div>
              <dl className="resume-stats">
                <div>
                  <dt>Used for</dt>
                  <dd>{plural(used, "application")}</dd>
                </div>
                <div>
                  <dt>Average match</dt>
                  <dd>{stats?.analyzed_count ? stats.average_match_score : "Not analyzed"}</dd>
                </div>
              </dl>
              <button type="button" className="btn-ghost danger" onClick={() => handleDelete(r)}>
                Remove
              </button>
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
          <h1>Resumes</h1>
          <p className="page-subtitle">
            Upload each version you send out. HireReady compares them against every job.
          </p>
        </div>
      </header>

      <ResumeUpload onUpload={handleUpload} />

      {renderList()}
    </div>
  );
}