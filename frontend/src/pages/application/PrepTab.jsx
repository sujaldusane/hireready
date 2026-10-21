import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { generateQuestions, getQuestions, waitForJob } from "../../api";
import EmptyState from "../../components/EmptyState";
import QuestionItem from "../../components/application/QuestionItem";

const MIN_DESCRIPTION_LENGTH = 50;
const CATEGORY_ORDER = ["technical", "role-specific", "behavioral"];
const CATEGORY_LABELS = {
  technical: "Technical",
  "role-specific": "Role-specific",
  behavioral: "Behavioral",
};

function QuestionSkeleton() {
  return (
    <ul className="question-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="skeleton-row">
          <div className="skeleton-bar wide" />
          <div className="skeleton-bar narrow" />
        </li>
      ))}
    </ul>
  );
}

export default function PrepTab() {
  const { application } = useOutletContext();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getQuestions(application.id)
      .then(setQuestions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [application.id]);

  const hasDescription =
    (application.job_description || "").trim().length >= MIN_DESCRIPTION_LENGTH;

  if (!hasDescription) {
    return (
      <EmptyState title="Add the job description first" action={<Link to="..">Go to overview</Link>}>
        Questions are written from the posting, so HireReady needs the full description.
      </EmptyState>
    );
  }

  const hasPractice = questions.some((q) => q.attempt_count > 0);

  async function handleGenerate() {
    if (
      hasPractice &&
      !window.confirm(
        "Regenerating replaces these questions and deletes their practice answers. Continue?"
      )
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

  function handleAttempt(questionId) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, attempt_count: q.attempt_count + 1 } : q))
    );
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: questions.filter((q) => q.category === category),
  })).filter((group) => group.items.length > 0);

  let generateLabel = "Generate questions";
  if (generating) generateLabel = "Writing questions...";
  else if (questions.length > 0) generateLabel = "Regenerate";

  function renderBody() {
    if (loading || (generating && questions.length === 0)) return <QuestionSkeleton />;

    if (questions.length === 0) {
      return (
        <p className="hint">
          No questions yet. Generate a set, then practice your answers one at a time.
        </p>
      );
    }

    return groups.map((group) => (
      <section key={group.category} className="question-group">
        <h3>
          {CATEGORY_LABELS[group.category]}
          <span className="count">{group.items.length}</span>
        </h3>
        <ul className="question-list">
          {group.items.map((q) => (
            <QuestionItem key={q.id} question={q} onAttempt={handleAttempt} />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <div className="tab-panel">
      <div className="section-head">
        <div>
          <h2>Interview questions</h2>
          <p>
            {questions.length > 0
              ? `Written for the ${application.role} role at ${application.company}. Open a question to practice your answer.`
              : `Questions an interviewer at ${application.company} is likely to ask for this role.`}
          </p>
        </div>
        <button
          type="button"
          className={questions.length > 0 ? "btn-secondary" : undefined}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generateLabel}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {renderBody()}
    </div>
  );
}