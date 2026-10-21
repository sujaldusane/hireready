import { useState } from "react";
import PracticePanel from "./PracticePanel";

export default function QuestionItem({ question, onAttempt }) {
  const [open, setOpen] = useState(false);
  const attempts = question.attempt_count;

  return (
    <li className="question-item">
      <div className="question-head">
        <p className="question-text">{question.question}</p>
        <div className="question-meta">
          {attempts > 0 && (
            <span className="attempts">
              {attempts === 1 ? "1 attempt" : `${attempts} attempts`}
            </span>
          )}
          <button
            type="button"
            className={open ? "btn-ghost" : "btn-secondary"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Practice"}
          </button>
        </div>
      </div>
      {open && <PracticePanel question={question} onAttempt={onAttempt} />}
    </li>
  );
}