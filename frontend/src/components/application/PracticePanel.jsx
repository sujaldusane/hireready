import { useEffect, useState } from "react";
import { getAnswers, submitAnswer, waitForJob } from "../../api";
import ScoreRing from "../ScoreRing";

const MIN_LENGTH = 20;
const MAX_LENGTH = 4000;

export default function PracticePanel({ question, onAttempt }) {
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

  const length = draft.trim().length;
  const canSubmit = length >= MIN_LENGTH && length <= MAX_LENGTH && !submitting;

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const job = await submitAnswer(question.id, draft.trim());
      await waitForJob(job);
      setAnswers(await getAnswers(question.id));
      setDraft("");
      onAttempt(question.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const latest = answers[0];
  const scoreTrail = [...answers].reverse().map((a) => a.score);
  const placeholder =
    question.category === "behavioral"
      ? "Answer the way you'd say it out loud. Try STAR: the situation, your task, the actions you took, and the result."
      : "Answer the way you'd say it out loud. Explain your reasoning and any trade-offs.";

  return (
    <div className="practice-panel">
      <div className="practice-input">
        <label className="visually-hidden" htmlFor={`answer-${question.id}`}>
          Your answer
        </label>
        <textarea
          id={`answer-${question.id}`}
          rows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
        />
        <div className="practice-input-foot">
          <span className="hint">
            {length > 0 && length < MIN_LENGTH
              ? `Keep going. At least ${MIN_LENGTH} characters.`
              : `${length}/${MAX_LENGTH}`}
          </span>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "Getting feedback..." : "Get feedback"}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {!loading && latest && (
        <div className="feedback-block">
          <div className="feedback-head">
            <ScoreRing score={latest.score} max={10} size={76} small />
            <div className="match-verdict">
              <h3>{answers.length > 1 ? "Latest attempt" : "Feedback"}</h3>
              {latest.summary && <p>{latest.summary}</p>}
            </div>
          </div>

          <div className="feedback-lists">
            {latest.strengths.length > 0 && (
              <div>
                <h4>What worked</h4>
                <ul>
                  {latest.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {latest.improvements.length > 0 && (
              <div>
                <h4>How to improve</h4>
                <ul>
                  {latest.improvements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <details className="your-answer">
            <summary>Your answer</summary>
            <p>{latest.answer}</p>
          </details>

          {scoreTrail.length > 1 && (
            <p className="attempt-trail">Scores across attempts: {scoreTrail.join(" → ")}</p>
          )}
        </div>
      )}
    </div>
  );
}