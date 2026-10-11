import { useEffect, useState } from "react";
import { generateQuestions, getQuestions } from "../api";

const CATEGORY_LABELS = {
  technical: "Technical",
  behavioral: "Behavioral",
  "role-specific": "Role-specific",
};

export default function InterviewPrep({ application, onSaveDescription }) {
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

  const descriptionChanged = description.trim() !== (application.job_description || "").trim();

  async function handleSaveDescription() {
    setError("");
    await onSaveDescription(application.id, description.trim() || null);
  }

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    try {
      setQuestions(await generateQuestions(application.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="prep">
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

      <div className="prep-actions">
        {descriptionChanged && (
          <button className="secondary" onClick={handleSaveDescription}>
            Save description
          </button>
        )}
        <button onClick={handleGenerate} disabled={generating || descriptionChanged}>
          {generating
            ? "Generating... (about 10 seconds)"
            : questions.length
              ? "Regenerate questions"
              : "Generate interview questions"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading questions...</p>
      ) : (
        questions.length > 0 && (
          <ol className="questions">
            {questions.map((q) => (
              <li key={q.id}>
                <span className={`tag tag-${q.category}`}>
                  {CATEGORY_LABELS[q.category] || q.category}
                </span>
                {q.question}
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
}