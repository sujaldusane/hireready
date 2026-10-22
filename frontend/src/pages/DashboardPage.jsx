import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import AddApplicationDialog from "../components/AddApplicationDialog";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { STATUSES } from "../constants";
import useData from "../hooks/useData";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useInsights from "../hooks/useInsights";
import { buildNextSteps, weeklyCounts } from "../utils/insights";

const KIND_LABELS = {
  interview: "Interview prep",
  followup: "Follow up",
  match: "Resume match",
  setup: "Set up",
};

function summarySentence(total, counts) {
  const parts = [`${total} ${total === 1 ? "application" : "applications"} tracked`];
  if (counts.Interview) parts.push(`${counts.Interview} at the interview stage`);
  if (counts.Offer) parts.push(`${counts.Offer} ${counts.Offer === 1 ? "offer" : "offers"}`);
  return `${parts.join(", ")}.`;
}

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const { applications, loading } = useData();
  const { insights, loading: insightsLoading } = useInsights();
  const [adding, setAdding] = useState(false);

  const counts = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, applications.filter((a) => a.status === s).length])),
    [applications]
  );
  const nextSteps = useMemo(
    () => buildNextSteps(applications, insights.applications),
    [applications, insights]
  );
  const weeks = useMemo(() => weeklyCounts(applications), [applications]);

  const total = applications.length;
  const addDialog = adding && <AddApplicationDialog onClose={() => setAdding(false)} />;

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading your dashboard...</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
          </div>
        </header>
        <EmptyState
          title="Start tracking your search"
          action={
            <button type="button" onClick={() => setAdding(true)}>
              <Plus size={18} aria-hidden="true" />
              Add your first application
            </button>
          }
        >
          Add a job you've applied to. HireReady keeps track of where it stands and helps you
          prepare when an interview comes up.
        </EmptyState>
        {addDialog}
      </div>
    );
  }

  const reachedInterview = counts.Interview + counts.Offer;
  const interviewRate = Math.round((reachedInterview / total) * 100);
  const maxWeek = Math.max(...weeks.map((w) => w.count), 1);
  const pipelineLabel = STATUSES.map((s) => `${s} ${counts[s]}`).join(", ");
  const weekLabel = weeks.map((w) => `Week of ${w.label}: ${w.count}`).join(", ");
  const recent = applications.slice(0, 5);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">{summarySentence(total, counts)}</p>
        </div>
        <button type="button" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden="true" />
          Add application
        </button>
      </header>

      <section className="surface tab-panel">
        <div className="section-head">
          <div>
            <h2>Next up</h2>
            <p>The most useful things to do in your search right now.</p>
          </div>
        </div>

        {insightsLoading && <p className="hint">Looking at your applications...</p>}

        {!insightsLoading && nextSteps.length === 0 && (
          <p className="hint">
            You're all caught up. New suggestions appear as your applications move forward.
          </p>
        )}

        {!insightsLoading && nextSteps.length > 0 && (
          <ul className="next-steps">
            {nextSteps.map((step) => (
              <li key={step.key} className="next-step">
                <span className={`next-kind next-kind-${step.kind}`}>{KIND_LABELS[step.kind]}</span>
                <p className="next-text">{step.text}</p>
                <Link to={step.to} className="next-action">
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="dashboard-grid">
        <section className="surface tab-panel">
          <h2 className="side-title">Pipeline</h2>
          <div className="pipeline-bar" role="img" aria-label={pipelineLabel}>
            {STATUSES.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                className={`pipeline-segment segment-${s.toLowerCase()}`}
                style={{ flexGrow: counts[s] }}
              />
            ))}
          </div>
          <ul className="pipeline-legend">
            {STATUSES.map((s) => (
              <li key={s}>
                <span className={`legend-dot segment-${s.toLowerCase()}`} aria-hidden="true" />
                {s}
                <strong>{counts[s]}</strong>
              </li>
            ))}
          </ul>
          <p className="hint">
            {reachedInterview} of {total} applications reached an interview ({interviewRate}%).
          </p>
        </section>

        <section className="surface tab-panel">
          <h2 className="side-title">Applications per week</h2>
          <div className="week-chart" role="img" aria-label={weekLabel}>
            {weeks.map((w) => (
              <div key={w.key} className="week">
                <span className="week-count">{w.count > 0 ? w.count : ""}</span>
                <span className="week-track">
                  <span className="week-bar" style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                </span>
                <span className="week-label">{w.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface tab-panel">
        <div className="section-head">
          <h2 className="side-title">Most recent</h2>
          <Link to="/applications">See all applications</Link>
        </div>
        <ul className="recent-list">
          {recent.map((a) => (
            <li key={a.id}>
              <Link to={`/applications/${a.id}`} className="recent-line">
                <span className="recent-main">
                  <span className="recent-company">{a.company}</span>
                  <span className="recent-role">{a.role}</span>
                </span>
                <StatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {addDialog}
    </div>
  );
}