import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { Check, Pencil } from "lucide-react";
import { getMatches, getQuestions } from "../../api";
import StatusBadge from "../../components/StatusBadge";
import useData from "../../hooks/useData";
import { formatDate } from "../../utils/format";

const MIN_DESCRIPTION_LENGTH = 50;
const LONG_DESCRIPTION_LENGTH = 1200;

export default function OverviewTab() {
  const { application } = useOutletContext();
  const { resumes, updateApplication } = useData();

  const savedDescription = application.job_description || "";
  const [editing, setEditing] = useState(!savedDescription);
  const [draft, setDraft] = useState(savedDescription);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState({ matched: false, questions: 0, practiced: false });

  useEffect(() => {
    Promise.all([getMatches(application.id), getQuestions(application.id)])
      .then(([matches, questions]) =>
        setProgress({
          matched: matches.length > 0,
          questions: questions.length,
          practiced: questions.some((q) => q.attempt_count > 0),
        })
      )
      .catch(() => {});
  }, [application.id]);

  const hasDescription = savedDescription.trim().length >= MIN_DESCRIPTION_LENGTH;
  const isLong = savedDescription.length > LONG_DESCRIPTION_LENGTH;
  const draftLength = draft.trim().length;

  async function handleSave() {
    setSaving(true);
    const updated = await updateApplication(application.id, {
      job_description: draft.trim() || null,
    });
    setSaving(false);
    if (updated) setEditing(false);
  }

  function handleCancel() {
    setDraft(savedDescription);
    setEditing(false);
  }

  function handleResumeChange(e) {
    const value = e.target.value;
    updateApplication(application.id, { resume_id: value ? Number(value) : null });
  }

  const steps = [
    {
      label: "Add the job description",
      done: hasDescription,
      action: (
        <button type="button" className="btn-link" onClick={() => setEditing(true)}>
          Add
        </button>
      ),
    },
    { label: "Link the resume you sent", done: Boolean(application.resume_id) },
    { label: "Check your resume match", done: progress.matched, to: "match" },
    { label: "Generate interview questions", done: progress.questions > 0, to: "prep" },
    { label: "Practice your answers", done: progress.practiced, to: "prep" },
  ];

  return (
    <div className="overview-grid">
      <section className="surface tab-panel">
        <div className="section-head">
          <div>
            <h2>Job description</h2>
            {!editing && <p>Used for your match score and interview questions.</p>}
          </div>
          {!editing && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="jd-editor">
            <label className="visually-hidden" htmlFor="jd-input">
              Job description
            </label>
            <textarea
              id="jd-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Paste the full posting, including the responsibilities and requirements."
            />
            {draftLength > 0 && draftLength < MIN_DESCRIPTION_LENGTH && (
              <p className="hint">Add a bit more. HireReady needs a few sentences to work with.</p>
            )}
            <div className="editor-actions">
              {savedDescription && (
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              )}
              <button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save description"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`jd-text${isLong && !expanded ? " is-collapsed" : ""}`}>
              {savedDescription}
            </div>
            {isLong && (
              <button
                type="button"
                className="btn-link"
                onClick={() => setExpanded(!expanded)}
                aria-expanded={expanded}
              >
                {expanded ? "Show less" : "Show full description"}
              </button>
            )}
          </>
        )}
      </section>

      <div className="side-stack">
        <section className="surface tab-panel">
          <h2 className="side-title">Details</h2>
          <dl className="details">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={application.status} />
              </dd>
            </div>
            <div>
              <dt>Applied</dt>
              <dd>{formatDate(application.applied_date)}</dd>
            </div>
            <div>
              <dt>
                <label htmlFor="overview-resume">Resume sent</label>
              </dt>
              <dd>
                {resumes.length > 0 ? (
                  <select
                    id="overview-resume"
                    value={application.resume_id ?? ""}
                    onChange={handleResumeChange}
                  >
                    <option value="">Not linked</option>
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="hint">
                    No resumes yet. <Link to="/resumes">Upload one</Link>
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="surface tab-panel">
          <h2 className="side-title">Get interview-ready</h2>
          <ol className="steps">
            {steps.map((step, index) => (
              <li key={step.label} className={`step${step.done ? " step-done" : ""}`}>
                <span className="step-mark" aria-hidden="true">
                  {step.done ? <Check size={13} strokeWidth={3} /> : index + 1}
                </span>
                <span className="step-text">
                  {step.label}
                  {step.done && <span className="visually-hidden"> (done)</span>}
                </span>
                {!step.done && step.to && <Link to={step.to}>Start</Link>}
                {!step.done && step.action}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}