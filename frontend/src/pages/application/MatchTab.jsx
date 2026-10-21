import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { analyzeMatch, getMatches, waitForJob } from "../../api";
import EmptyState from "../../components/EmptyState";
import ScoreRing from "../../components/ScoreRing";
import useData from "../../hooks/useData";
import { formatDate } from "../../utils/format";

const MIN_DESCRIPTION_LENGTH = 50;

function verdict(score) {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good match with some gaps";
  if (score >= 40) return "Partial match";
  return "Weak match";
}

function InsightList({ title, items, empty }) {
  return (
    <div className="insight">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="insight-empty">{empty}</p>
      )}
    </div>
  );
}

function MatchResult({ match, isLinked, onLink }) {
  return (
    <div className="tab-panel">
      <div className="match-summary-row">
        <ScoreRing score={match.score} />
        <div className="match-verdict">
          <h3>{verdict(match.score)}</h3>
          {match.summary && <p>{match.summary}</p>}
          <p className="hint">Analyzed {formatDate(match.analyzed_at)}</p>
        </div>
        {isLinked ? (
          <span className="hint">This is the resume you sent.</span>
        ) : (
          <button type="button" className="btn-secondary" onClick={onLink}>
            Mark as the resume I sent
          </button>
        )}
      </div>

      <div className="insight-grid">
        <InsightList
          title="Strengths"
          items={match.strengths}
          empty="No clear strengths for this role were found."
        />
        <div className="insight">
          <h3>Missing keywords</h3>
          {match.missing_keywords.length > 0 ? (
            <div className="chips">
              {match.missing_keywords.map((keyword) => (
                <span key={keyword} className="chip">
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="insight-empty">Your resume covers the key terms in this posting.</p>
          )}
        </div>
        <InsightList
          title="How to tailor it"
          items={match.suggestions}
          empty="No changes suggested."
        />
      </div>
    </div>
  );
}

export default function MatchTab() {
  const { application } = useOutletContext();
  const { resumes, updateApplication } = useData();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(application.resume_id ?? resumes[0]?.id ?? null);

  useEffect(() => {
    getMatches(application.id)
      .then(setMatches)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [application.id]);

  const hasDescription =
    (application.job_description || "").trim().length >= MIN_DESCRIPTION_LENGTH;

  if (!hasDescription) {
    return (
      <EmptyState title="Add the job description first" action={<Link to="..">Go to overview</Link>}>
        The match score compares your resume to the posting, so HireReady needs the full
        description.
      </EmptyState>
    );
  }

  if (resumes.length === 0) {
    return (
      <EmptyState title="Upload a resume first" action={<Link to="/resumes">Upload a resume</Link>}>
        Upload the resume versions you send out, then compare how each one fits this role.
      </EmptyState>
    );
  }

  const current = matches.find((m) => m.resume_id === selectedId);

  async function handleAnalyze() {
    setError("");
    setAnalyzing(true);
    try {
      const job = await analyzeMatch(application.id, selectedId);
      await waitForJob(job);
      setMatches(await getMatches(application.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  let analyzeLabel = "Analyze match";
  if (analyzing) analyzeLabel = "Analyzing...";
  else if (current) analyzeLabel = "Re-analyze";

  return (
    <div className="tab-panel">
      <section className="surface tab-panel">
        <div className="section-head">
          <div>
            <h2>Resume match</h2>
            <p>
              See how well a resume fits this posting, what it's missing, and how to tailor it
              honestly.
            </p>
          </div>
        </div>

        <div className="match-controls">
          <label className="field">
            <span>Resume to analyze</span>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                  {r.id === application.resume_id ? " (sent)" : ""}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleAnalyze} disabled={!selectedId || analyzing}>
            {analyzeLabel}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {!loading && current && (
          <MatchResult
            match={current}
            isLinked={current.resume_id === application.resume_id}
            onLink={() => updateApplication(application.id, { resume_id: current.resume_id })}
          />
        )}

        {!loading && !current && !analyzing && (
          <p className="hint">This resume hasn't been analyzed for this job yet.</p>
        )}
      </section>

      {matches.length > 1 && (
        <section className="surface tab-panel">
          <div className="section-head">
            <div>
              <h2>Compare resumes</h2>
              <p>Every resume you've analyzed for this job, best fit first.</p>
            </div>
          </div>
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">Resume</th>
                <th scope="col">Score</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className={m.resume_id === selectedId ? "is-current" : ""}>
                  <td>
                    {m.resume_label}
                    {m.resume_id === application.resume_id && (
                      <span className="hint"> (sent)</span>
                    )}
                  </td>
                  <td>
                    <div className="compare-bar">
                      <div className="bar">
                        <span style={{ width: `${m.score}%` }} />
                      </div>
                      <strong>{m.score}</strong>
                    </div>
                  </td>
                  <td className="compare-action">
                    {m.resume_id !== selectedId && (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setSelectedId(m.resume_id)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}