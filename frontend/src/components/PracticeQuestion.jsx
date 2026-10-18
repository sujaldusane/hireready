import { useEffect, useState } from "react";
import { getAnswers, submitAnswer, waitForJob } from "../api";

const CATEGORY_LABELS = {
  technical: "Technical",
  behavioral: "Behavioral",
  "role-specific": "Role-specific",
};

const MIN_LENGTH = 20;
const MAX_LENGTH = 4000;

function scoreLevel(score) {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

function PracticePanel({ question }) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnswers(question.id)
      .then(setAnswers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [question.id]);

  const trimmedLength = draft.trim().length;
  const canSubmit = trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && !submitting;

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const job = await submitAnswer(question.id, draft.trim());
      await waitForJob(job);
      setAnswers(await getAnswers(question.id));
      setDraft("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const latest = answers[0];
  const earlierScores = answers
    .slice(1)
    .reverse()
    .map((a) => a.score);

  return (
    <div className="practice">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        placeholder={
          question.category === "behavioral"
            ? "Answer using STAR: Situation, Task, Action, Result"
            : "Type your answer as you would say it in the interview"
        }
      />
      <div className="practice-actions">
        <span className="hint">
          {trimmedLength}/{MAX_LENGTH}
        </span>
        <button onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? "Getting feedback..." : "Get feedback"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {!loading && latest && (
        <div className="feedback">
          <div className={`score score-small score-${scoreLevel(latest.score)}`}>
            {latest.score}
            <span>/10</span>
          </div>
          <div className="match-details">
            {latest.summary && <p className="match-summary">{latest.summary}</p>}

            {latest.strengths.length > 0 && (
              <>
                <h4>What worked</h4>
                <ul>
                  {latest.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            {latest.improvements.length > 0 && (
              <>
                <h4>How to improve</h4>
                <ul>
                  {latest.improvements.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            <details className="your-answer">
              <summary>Your answer</summary>
              <p>{latest.answer}</p>
            </details>
          </div>
        </div>
      )}

      {earlierScores.length > 0 && (
        <p className="hint">
          Progress: {[...earlierScores, latest.score].join(" → ")}
        </p>
      )}
    </div>
  );
}

export default function PracticeQuestion({ question }) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <div className="question-row">
        <div>
          <span className={`tag tag-${question.category}`}>
            {CATEGORY_LABELS[question.category] || question.category}
          </span>
          {question.question}
        </div>
        <button className="link-button practice-toggle" onClick={() => setOpen(!open)}>
          {open ? "Close" : question.attempt_count ? `Practice (${question.attempt_count})` : "Practice"}
        </button>
      </div>
      {open && <PracticePanel question={question} />}
    </li>
  );
}