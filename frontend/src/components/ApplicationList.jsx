import { useState } from "react";
import { STATUSES } from "../constants";
import InterviewPrep from "./InterviewPrep";

export default function ApplicationList({ applications, resumes, onUpdate, onDelete }) {
  const [openId, setOpenId] = useState(null);

  if (applications.length === 0) {
    return <p className="empty">No applications here yet.</p>;
  }

  return (
    <ul className="app-list">
      {applications.map((app) => {
        const resumeLabel = app.resume_id
          ? resumes.find((r) => r.id === app.resume_id)?.label || "Resume"
          : null;

        return (
          <li key={app.id} className="app-card">
            <div className="app-row">
              <div>
                <h3>{app.company}</h3>
                <p>
                  {app.role} · Applied {app.applied_date}
                  {resumeLabel && <> · {resumeLabel}</>}
                </p>
              </div>
              <div className="actions">
                <select
                  value={app.status}
                  onChange={(e) => onUpdate(app.id, { status: e.target.value })}
                  className={`status status-${app.status.toLowerCase()}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="secondary"
                  onClick={() => setOpenId(openId === app.id ? null : app.id)}
                >
                  {openId === app.id ? "Close" : "Prep"}
                </button>
                <button className="delete" onClick={() => onDelete(app.id)}>
                  Delete
                </button>
              </div>
            </div>

            {openId === app.id && (
              <InterviewPrep application={app} resumes={resumes} onUpdate={onUpdate} />
            )}
          </li>
        );
      })}
    </ul>
  );
}