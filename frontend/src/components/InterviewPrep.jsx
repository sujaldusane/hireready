import { useEffect, useState } from "react";
import { generateQuestions, getQuestions, waitForJob } from "../api";
import MatchAnalysis from "./MatchAnalysis";
import PracticeQuestion from "./PracticeQuestion";

export default function InterviewPrep({ application, resumes, onUpdate }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState(application.job_description || "");

  useEffect(() => {
    getQuestions(application.id)
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [application.id]);

  const descriptionChanged =
    description.trim() !== (application.job_description || "").trim();
  const hasDescription = Boolean((application.job_description || "").trim());
  const hasPractice = questions.some((q) => q.attempt_count > 0);

  function handleResumeChange(e) {
    const value = e.target.value;
    onUpdate(application.id, { resume_id: value ? Number(value) : null });
  }

  async function handleSaveDescription() {
    setError("");
    await onUpdate(application.id, { job_description: description.trim() || null });
  }

  async function handleGenerate() {
    if (
      hasPractice &&
      !window.confirm("Regenerating replaces these questions and deletes their practice answers. Continue?")
    ) {
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const job = await generateQuestions(application.id);
      await waitForJob(job);
      setQuestions(await getQuestions(application.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  let generateLabel = "Generate interview questions";
  if (generating) generateLabel = "Generating... (about 10 seconds)";
  else if (questions.length) generateLabel = "Regenerate questions";

  return (
    <div className="prep">
      <label className="prep-label" htmlFor={`resume-${application.id}`}>
        Resume used for this application
      </label>
      <select
        id={`resume-${application.id}`}
        className="status"
        value={application.resume_id ?? ""}
        onChange={handleResumeChange}
      >
        <option value="">No resume linked</option>
        {resumes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </select>

      <label className="prep-label" htmlFor={`jd-${application.id}`}>
        Job description
      </label>
      <textarea
        id={`jd-${application.id}`}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={5}
        placeholder="Paste the job description here"
      />

      {descriptionChanged && (
        <div className="prep-actions">
          <button className="secondary" onClick={handleSaveDescription}>
            Save description
          </button>
        </div>
      )}

      <MatchAnalysis
        application={application}
        disabled={descriptionChanged || !hasDescription}
      />

      <div className="prep-actions">
        <span className="prep-label">Interview questions</span>
        <button onClick={handleGenerate} disabled={generating || descriptionChanged}>
          {generateLabel}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading questions...</p>
      ) : (
        questions.length > 0 && (
          <ol className="questions">
            {questions.map((q) => (
              <PracticeQuestion key={q.id} question={q} />
            ))}
          </ol>
        )
      )}
    </div>
  );
}