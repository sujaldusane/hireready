import { Link } from "react-router";
import { Check, RotateCcw, X } from "lucide-react";

const STAGES = ["Applied", "Interview", "Offer"];

const STAGE_NOTES = {
  Applied: {
    text: "Waiting to hear back. A good time to check how well your resume fits.",
    link: "match",
    linkLabel: "Check resume match",
  },
  Interview: {
    text: "Interview stage. Practice the questions written for this role.",
    link: "prep",
    linkLabel: "Practice questions",
  },
  Offer: {
    text: "You have an offer for this role.",
  },
  Rejected: {
    text: "This one is closed. It stays here for your records, and you can reopen it if things change.",
  },
};

function stageState(index, currentIndex, rejected) {
  if (rejected) return "inactive";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "upcoming";
}

export default function StageTrack({ status, onChange }) {
  const rejected = status === "Rejected";
  const currentIndex = STAGES.indexOf(status);
  const note = STAGE_NOTES[status];

  return (
    <section
      className={`stage-track${rejected ? " is-rejected" : ""}`}
      aria-label="Application stage"
    >
      <div className="stage-row">
        <ol className="stages">
          {STAGES.map((stage, index) => {
            const state = stageState(index, currentIndex, rejected);
            return (
              <li key={stage} className={`stage stage-${state}`}>
                <button
                  type="button"
                  onClick={() => onChange(stage)}
                  disabled={state === "current"}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="stage-dot" aria-hidden="true">
                    {state === "done" && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="stage-label">{stage}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="stage-aside">
          {rejected ? (
            <>
              <span className="badge badge-rejected">Rejected</span>
              <button type="button" className="btn-ghost" onClick={() => onChange("Applied")}>
                <RotateCcw size={14} aria-hidden="true" />
                Reopen
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => onChange("Rejected")}>
              <X size={14} aria-hidden="true" />
              Mark as rejected
            </button>
          )}
        </div>
      </div>

      {note && (
        <p className="stage-note">
          {note.text}
          {note.link && (
            <>
              {" "}
              <Link to={note.link}>{note.linkLabel}</Link>
            </>
          )}
        </p>
      )}
    </section>
  );
}