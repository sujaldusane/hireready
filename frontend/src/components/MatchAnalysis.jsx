import { useEffect, useState } from "react";
import { analyzeMatch, getMatches } from "../api";

function scoreLevel(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export default function MatchAnalysis({ application, disabled }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMatches(application.id)
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [application.id]);

  const current = matches.find((m) => m.resume_id === application.resume_id);
  const others = matches.filter((m) => m.resume_id !== application.resume_id);
  const canAnalyze = Boolean(application.resume_id) && !disabled;

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const result = await analyzeMatch(application.id);
      setMatches((prev) =>
        [result, ...prev.filter((m) => m.resume_id !== result.resume_id)].sort(
          (a, b) => b.score - a.score
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  let buttonLabel = "Analyze match";
  if (analyzing) buttonLabel = "Analyzing...";
  else if (current) buttonLabel = "Re-analyze";

  return (
    <div className="match">
      <div className="match-header">
        <span className="prep-label">Resume match</span>
        <button className="secondary" onClick={handleAnalyze} disabled={!canAnalyze || analyzing}>
          {buttonLabel}
        </button>
      </div>

      {!application.resume_id && (
        <p className="hint">Link a resume above to see how well it matches this job.</p>
      )}

      {error && <p className="error">{error}</p>}

      {!loading && current && (
        <div className="match-result">
          <div className={`score score-${scoreLevel(current.score)}`}>
            {current.score}
            <span>/100</span>
          </div>

          <div className="match-details">
            {current.summary && <p className="match-summary">{current.summary}</p>}

            {current.strengths.length > 0 && (
              <>
                <h4>Strengths</h4>
                <ul>
                  {current.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}

            {current.missing_keywords.length > 0 && (
              <>
                <h4>Missing keywords</h4>
                <div className="chips">
                  {current.missing_keywords.map((k) => (
                    <span key={k} className="chip">
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}

            {current.suggestions.length > 0 && (
              <>
                <h4>Suggestions</h4>
                <ul>
                  {current.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <p className="hint">
          Other resumes for this job:{" "}
          {others.map((m) => `${m.resume_label} (${m.score})`).join(" · ")}
        </p>
      )}
    </div>
  );
}